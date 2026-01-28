# config/auth_views.py
import logging
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from agenda.throttles import LoginRateThrottle
from agenda.models import Membership

logger = logging.getLogger(__name__)

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


def log_error_and_return_response(logger, message, status_code, include_details=False):
    """
    Função segura de logging de erros que não expõe informações sensíveis.

    Args:
        logger: Logger instance
        message: Mensagem do erro
        status_code: Código de status HTTP
        include_details: Se True, inclui detalhes (apenas para debug)
    """
    if settings.DEBUG and include_details:
        logger.error(message, exc_info=True)
        return Response({"detail": message}, status=status_code)
    else:
        logger.error(f"{message} (ver logs para detalhes)", exc_info=True)
        return Response(
            {"detail": "Erro ao processar solicitação."},
            status=status_code,
        )


def _cookie_settings():
    # ✅ respeita uma flag do settings (pra não depender de HTTPS)
    secure = getattr(settings, "COOKIE_SECURE", (not settings.DEBUG))
    return {"secure": secure, "httponly": True, "samesite": "Lax", "path": "/"}


def _max_age(delta: timedelta) -> int:
    return int(delta.total_seconds())


class CookieTokenMixin:
    def set_auth_cookies(self, response, tokens: dict):
        access = tokens.get("access")
        refresh = tokens.get("refresh")
        cookie_opts = _cookie_settings()

        # Sem max_age = session cookies (expiram ao fechar o navegador)
        if access:
            response.set_cookie(
                ACCESS_COOKIE,
                access,
                **cookie_opts,
            )

        if refresh:
            response.set_cookie(
                REFRESH_COOKIE,
                refresh,
                **cookie_opts,
            )

    @staticmethod
    def clear_auth_cookies(response):
        response.delete_cookie(ACCESS_COOKIE, path="/")
        response.delete_cookie(REFRESH_COOKIE, path="/")


class CookieTokenObtainPairView(CookieTokenMixin, TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        tokens = dict(response.data)  # << garante access/refresh
        self.set_auth_cookies(response, tokens)

        # ✅ IMPORTANTE: não apaga os tokens
        response.data = {
            "detail": "Autenticado com sucesso.",
            "access": tokens.get("access"),
            "refresh": tokens.get("refresh"),
        }
        return response


class CookieTokenRefreshView(CookieTokenMixin, TokenRefreshView):
    def post(self, request, *args, **kwargs):
        data = request.data.copy()

        if "refresh" not in data:
            refresh_cookie = request.COOKIES.get(REFRESH_COOKIE)
            if not refresh_cookie:
                return Response(
                    {"detail": "Refresh token ausente."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            data["refresh"] = refresh_cookie

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        # ✅ devolve access/refresh também (muitos frontends esperam)
        payload = dict(serializer.validated_data)
        response = Response(
            {"detail": "Tokens renovados com sucesso.", **payload},
            status=status.HTTP_200_OK,
        )
        self.set_auth_cookies(response, payload)
        return response


class CookieTokenLogoutView(CookieTokenMixin, APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        response = Response(
            {"detail": "Logout realizado com sucesso."}, status=status.HTTP_200_OK
        )
        self.clear_auth_cookies(response)
        return response


class GoogleAuthView(CookieTokenMixin, APIView):
    """
    POST /api/auth/google/
    Autentica usuário via Google OAuth.
    Funciona tanto para músicos quanto para empresas.
    """

    authentication_classes = []
    permission_classes = []
    throttle_scope = "google_auth"

    def post(self, request, *args, **kwargs):
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        import os

        credential = request.data.get("credential")
        user_type = request.data.get("user_type", "musician")  # 'musician' ou 'company'

        if not credential:
            return Response(
                {"detail": "Credencial do Google não fornecida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verifica o token do Google
        try:
            google_client_id = getattr(
                settings, "GOOGLE_CLIENT_ID", os.environ.get("GOOGLE_CLIENT_ID")
            )
            if not google_client_id:
                return Response(
                    {"detail": "Autenticação com Google não configurada."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            idinfo = id_token.verify_oauth2_token(
                credential, google_requests.Request(), google_client_id
            )

            # Verifica se o token é válido
            if idinfo["iss"] not in [
                "accounts.google.com",
                "https://accounts.google.com",
            ]:
                raise ValueError("Token inválido")

            # Verifica audience para garantir que o token foi emitido para este app
            if idinfo.get("aud") != google_client_id:
                raise ValueError("Token não emitido para este aplicativo")

            email = idinfo.get("email", "").lower()
            email_verified = idinfo.get("email_verified", False)
            given_name = idinfo.get("given_name", "")
            family_name = idinfo.get("family_name", "")
            picture = idinfo.get("picture", "")

            if not email or not email_verified:
                return Response(
                    {"detail": "Email não verificado no Google."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except ValueError as e:
            logger.error(f"Token do Google inválido: {str(e)}", exc_info=True)
            return Response(
                {"detail": "Token do Google inválido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except Exception as e:
            return log_error_and_return_response(
                logger,
                f"Erro ao verificar token do Google: {str(e)}",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                include_details=settings.DEBUG,
            )

        from django.contrib.auth.models import User
        from agenda.models import Musician, Organization, Membership

        # Verifica se usuário já existe
        try:
            user = User.objects.get(email=email)
            is_new_user = False
        except User.DoesNotExist:
            user = None
            is_new_user = True

        # Se é um usuário novo, retorna indicação para completar cadastro
        if is_new_user:
            return Response(
                {
                    "new_user": True,
                    "email": email,
                    "first_name": given_name,
                    "last_name": family_name,
                    "picture": picture,
                    "user_type": user_type,
                },
                status=status.HTTP_200_OK,
            )

        # Usuário existe - faz login
        # Verifica tipo de conta
        has_musician_profile = hasattr(user, "musician_profile")
        company_membership = (
            Membership.objects.filter(
                user=user,
                status="active",
                organization__org_type__in=["company", "venue"],
            )
            .select_related("organization")
            .first()
        )

        # Gera tokens
        refresh = RefreshToken.for_user(user)
        tokens = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }

        response_data = {
            "detail": "Autenticado com sucesso.",
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "new_user": False,
        }

        if company_membership:
            response_data["user_type"] = "company"
            response_data["organization"] = {
                "id": company_membership.organization.id,
                "name": company_membership.organization.name,
                "org_type": company_membership.organization.org_type,
            }
        elif has_musician_profile:
            response_data["user_type"] = "musician"
        else:
            response_data["user_type"] = "unknown"

        response = Response(response_data)
        self.set_auth_cookies(response, tokens)
        return response


class GoogleRegisterMusicianView(CookieTokenMixin, APIView):
    """
    POST /api/auth/google/register-musician/
    Completa o cadastro de músico após autenticação Google.
    Requer token de convite (aprovação do admin).
    """

    authentication_classes = []
    permission_classes = []
    throttle_scope = "google_register"

    def post(self, request, *args, **kwargs):
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        from django.db import transaction
        from agenda.models import Musician, Organization, Membership, MusicianRequest
        import os

        credential = request.data.get("credential")
        invite_token = request.data.get("invite_token")

        if not credential:
            return Response(
                {"detail": "Credencial do Google não fornecida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not invite_token:
            return Response(
                {"detail": "Token de convite não fornecido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verifica convite
        try:
            musician_request = MusicianRequest.objects.get(invite_token=invite_token)
        except MusicianRequest.DoesNotExist:
            return Response(
                {"detail": "Token de convite inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not musician_request.is_invite_valid():
            return Response(
                {"detail": "Convite expirado ou já utilizado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verifica token Google
        try:
            google_client_id = getattr(
                settings, "GOOGLE_CLIENT_ID", os.environ.get("GOOGLE_CLIENT_ID")
            )
            idinfo = id_token.verify_oauth2_token(
                credential, google_requests.Request(), google_client_id
            )

            # Verifica audience
            if idinfo.get("aud") != google_client_id:
                raise ValueError("Token não emitido para este aplicativo")

            email = idinfo.get("email", "").lower()
            given_name = idinfo.get("given_name", "")
            family_name = idinfo.get("family_name", "")

            if email != musician_request.email:
                return Response(
                    {
                        "detail": "O email da conta Google deve ser o mesmo da solicitação."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            return log_error_and_return_response(
                logger,
                f"Erro ao verificar token do Google: {str(e)}",
                status.HTTP_401_UNAUTHORIZED,
                include_details=settings.DEBUG,
            )

        from django.contrib.auth.models import User

        # Verifica se usuário já existe
        if User.objects.filter(email=email).exists():
            return Response(
                {"detail": "Este email já está cadastrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # Gera username único
                username = email.split("@")[0]
                if User.objects.filter(username=username).exists():
                    base_username = username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{base_username}{counter}"
                        counter += 1

                # Cria usuário
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=given_name or musician_request.full_name.split()[0],
                    last_name=family_name
                    or " ".join(musician_request.full_name.split()[1:]),
                )
                user.set_unusable_password()  # Login apenas via Google
                user.save()

                # Cria músico
                instruments = musician_request.instruments or []
                if (
                    musician_request.instrument
                    and musician_request.instrument not in instruments
                ):
                    instruments.insert(0, musician_request.instrument)

                musician = Musician.objects.create(
                    user=user,
                    phone=musician_request.phone,
                    instagram=musician_request.instagram or "",
                    instrument=musician_request.instrument,
                    instruments=instruments,
                    bio=musician_request.bio or "",
                    city=musician_request.city,
                    state=musician_request.state,
                    role="member",
                    is_active=True,
                    subscription_status="active",
                )

                # Cria organização pessoal
                org, _ = Organization.objects.get_or_create(
                    owner=user,
                    defaults={
                        "name": f"Org de {username}",
                        "subscription_status": "active",
                    },
                )

                Membership.objects.get_or_create(
                    user=user,
                    organization=org,
                    defaults={"role": "owner", "status": "active"},
                )

                # Marca convite como usado
                musician_request.mark_invite_used()

        except Exception as e:
            return log_error_and_return_response(
                logger,
                f"Erro ao criar conta: {str(e)}",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                include_details=settings.DEBUG,
            )

        # Gera tokens e faz login
        refresh = RefreshToken.for_user(user)
        tokens = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }

        response = Response(
            {
                "detail": "Conta criada com sucesso!",
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user_type": "musician",
            },
            status=status.HTTP_201_CREATED,
        )
        self.set_auth_cookies(response, tokens)
        return response


class GoogleRegisterCompanyView(CookieTokenMixin, APIView):
    """
    POST /api/auth/google/register-company/
    Completa o cadastro de empresa após autenticação Google.
    """

    authentication_classes = []
    permission_classes = []
    throttle_scope = "google_register"

    def post(self, request, *args, **kwargs):
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        from django.db import transaction
        from agenda.models import Organization, Membership
        import os

        credential = request.data.get("credential")
        company_name = request.data.get("company_name", "").strip()
        phone = request.data.get("phone", "").strip()
        city = request.data.get("city", "").strip()
        state = request.data.get("state", "").strip().upper()
        org_type = request.data.get("org_type", "company")

        if not credential:
            return Response(
                {"detail": "Credencial do Google não fornecida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not company_name or not city or not state:
            return Response(
                {"detail": "Nome da empresa, cidade e estado são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verifica token Google
        try:
            google_client_id = getattr(
                settings, "GOOGLE_CLIENT_ID", os.environ.get("GOOGLE_CLIENT_ID")
            )
            idinfo = id_token.verify_oauth2_token(
                credential, google_requests.Request(), google_client_id
            )

            # Verifica audience
            if idinfo.get("aud") != google_client_id:
                raise ValueError("Token não emitido para este aplicativo")

            email = idinfo.get("email", "").lower()
            email_verified = idinfo.get("email_verified", False)
            given_name = idinfo.get("given_name", "")
            family_name = idinfo.get("family_name", "")

            if not email or not email_verified:
                return Response(
                    {"detail": "Email não verificado no Google."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Exception as e:
            return log_error_and_return_response(
                logger,
                f"Erro ao verificar token do Google: {str(e)}",
                status.HTTP_401_UNAUTHORIZED,
                include_details=settings.DEBUG,
            )

        from django.contrib.auth.models import User

        # Verifica se usuário já existe
        if User.objects.filter(email=email).exists():
            return Response(
                {"detail": "Este email já está cadastrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verifica se empresa já existe
        if Organization.objects.filter(name=company_name).exists():
            return Response(
                {"detail": "Uma empresa com este nome já está cadastrada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # Gera username único
                username = email.split("@")[0]
                if User.objects.filter(username=username).exists():
                    base_username = username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{base_username}{counter}"
                        counter += 1

                # Cria usuário
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=given_name,
                    last_name=family_name,
                )
                user.set_unusable_password()
                user.save()

                # Cria organização
                organization = Organization.objects.create(
                    name=company_name,
                    owner=user,
                    org_type=org_type,
                    contact_name=f"{given_name} {family_name}".strip(),
                    contact_email=email,
                    phone=phone,
                    city=city,
                    state=state,
                    subscription_status="active",
                )

                # Cria membership
                Membership.objects.create(
                    user=user,
                    organization=organization,
                    role="owner",
                    status="active",
                )

        except Exception as e:
            return log_error_and_return_response(
                logger,
                f"Erro ao criar conta: {str(e)}",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                include_details=settings.DEBUG,
            )

        # Gera tokens e faz login
        refresh = RefreshToken.for_user(user)
        tokens = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }

        response = Response(
            {
                "detail": "Empresa cadastrada com sucesso!",
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user_type": "company",
                "organization": {
                    "id": organization.id,
                    "name": organization.name,
                    "org_type": organization.org_type,
                },
            },
            status=status.HTTP_201_CREATED,
        )
        self.set_auth_cookies(response, tokens)
        return response


class CompanyTokenObtainPairView(CookieTokenMixin, APIView):
    """
    Login específico para empresas.
    Valida que o usuário pertence a uma Organization com org_type='company' ou 'venue'.
    """

    throttle_classes = [LoginRateThrottle]
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").lower().strip()
        password = request.data.get("password", "")

        if not email or not password:
            return Response(
                {"detail": "Email e senha são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Tenta autenticar usando email como username
        from django.contrib.auth.models import User

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "Credenciais inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Verifica senha
        if not user.check_password(password):
            return Response(
                {"detail": "Credenciais inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Verifica se pertence a uma empresa
        membership = (
            Membership.objects.filter(
                user=user,
                status="active",
                organization__org_type__in=["company", "venue"],
            )
            .select_related("organization")
            .first()
        )

        if not membership:
            return Response(
                {"detail": "Esta conta não está associada a uma empresa."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Gera tokens
        refresh = RefreshToken.for_user(user)
        tokens = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }

        response = Response(
            {
                "detail": "Autenticado com sucesso.",
                "access": tokens["access"],
                "refresh": tokens["refresh"],
                "user_type": "company",
                "organization": {
                    "id": membership.organization.id,
                    "name": membership.organization.name,
                    "org_type": membership.organization.org_type,
                },
            }
        )
        self.set_auth_cookies(response, tokens)
        return response

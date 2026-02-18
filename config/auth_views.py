# config/auth_views.py
import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

try:
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token
except Exception:  # pragma: no cover - fallback when deps are missing
    id_token = None
    google_requests = None

from agenda.image_download import RemoteImageError, download_image_from_url
from agenda.image_processing import (
    MAX_AVATAR_BYTES,
    MAX_AVATAR_SIZE,
    _process_profile_image,
)
from agenda.models import Membership
from agenda.throttles import LoginRateThrottle

logger = logging.getLogger(__name__)

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


def log_error_and_return_response(logger, message, status_code, include_details=False):
    """
    Função segura de logging de erros.

    Args:
        logger: Logger instance
        message: Mensagem do erro
        status_code: Código de status HTTP
        include_details: Se True, inclui detalhes (apenas para debug)
    """
    # Em produção, nunca incluir detalhes no log
    if not settings.DEBUG:
        logger.error(f"{message} (sem detalhes por segurança)", exc_info=False)
        return Response(
            {"detail": "Erro ao processar solicitação."},
            status=status_code,
        )

    # Em DEBUG, pode incluir mais contexto
    if settings.DEBUG and include_details:
        logger.error(message, exc_info=True)
        return Response({"detail": message}, status=status_code)
    else:
        logger.error(f"{message} (ver logs para detalhes)", exc_info=False)
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


def _process_google_picture(picture_url: str, *, label: str, prefix: str):
    if not picture_url:
        return None
    try:
        content = download_image_from_url(
            picture_url,
            max_bytes=MAX_AVATAR_BYTES,
            label=label,
            user_agent="GigFlowGoogle/1.0",
        )
        return _process_profile_image(
            content,
            max_bytes=MAX_AVATAR_BYTES,
            max_size=MAX_AVATAR_SIZE,
            crop_square=True,
            quality=88,
            prefix=prefix,
        )
    except (RemoteImageError, ValueError) as exc:
        logger.warning("Falha ao processar %s do Google: %s", label, exc)
        return None


class CookieTokenMixin:
    def set_auth_cookies(self, response, tokens: dict):
        access = tokens.get("access")
        refresh = tokens.get("refresh")
        cookie_opts = _cookie_settings()

        # Access token: 60 minutos
        if access:
            response.set_cookie(
                ACCESS_COOKIE,
                access,
                **cookie_opts,
                max_age=_max_age(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]),
            )

        # Refresh token: 7 dias
        if refresh:
            response.set_cookie(
                REFRESH_COOKIE,
                refresh,
                **cookie_opts,
                max_age=_max_age(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]),
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

        # Não expõe tokens no body (reduz risco em caso de XSS).
        response.data = {
            "detail": "Autenticado com sucesso.",
        }
        return response


class CookieTokenRefreshView(CookieTokenMixin, TokenRefreshView):
    def post(self, request, *args, **kwargs):
        data = request.data.copy()

        # Validar que não tem cookie se token foi enviado no body
        if "refresh" in data and request.COOKIES.get(REFRESH_COOKIE):
            return Response(
                {"detail": "Use apenas um método: body ou cookie, não ambos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if "refresh" not in data:
            refresh_cookie = request.COOKIES.get(REFRESH_COOKIE)
            if not refresh_cookie:
                return Response(
                    {"detail": "Refresh token ausente."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Validar formato do token antes de usar
            try:
                # Verificar se é um JWT válido
                from jwt import decode as jwt_decode
                from rest_framework_simplejwt.settings import api_settings

                # Decodificar sem verificar assinatura para validar formato
                jwt_decode(
                    refresh_cookie,
                    options={"verify_signature": False},
                    algorithms=[api_settings.ALGORITHM],
                )
            except Exception:
                return Response(
                    {"detail": "Token inválido."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            data["refresh"] = refresh_cookie

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        # Não expõe tokens no body; ficam apenas em cookies HttpOnly.
        payload = dict(serializer.validated_data)
        response = Response(
            {"detail": "Tokens renovados com sucesso."},
            status=status.HTTP_200_OK,
        )
        self.set_auth_cookies(response, payload)
        return response


class CookieTokenLogoutView(CookieTokenMixin, APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        response = Response({"detail": "Logout realizado com sucesso."}, status=status.HTTP_200_OK)
        self.clear_auth_cookies(response)
        return response


from config.serializers import EmailOrUsernameTokenObtainPairSerializer


class AdminTokenObtainPairView(CookieTokenMixin, TokenObtainPairView):
    """
    POST /api/admin/token/
    Endpoint específico para login de administradores.
    Aceita email ou username para autenticação.
    Valida que o usuário tem is_staff=True.
    """

    serializer_class = EmailOrUsernameTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        from django.contrib.auth import get_user_model

        User = get_user_model()

        response = super().post(request, *args, **kwargs)

        # Se o login falhou, retorna a resposta original
        if response.status_code != status.HTTP_200_OK:
            return response

        # Extrai username/email do request para validar is_staff
        # Pega diretamente do request, não do serializer.validated_data
        login_field = request.data.get("username")

        # Busca usuário por username ou email
        user = User.objects.filter(username=login_field).first()
        if not user:
            user = User.objects.filter(email=login_field).first()

        # Valida se usuário tem is_staff
        if not user or not user.is_staff:
            return Response(
                {"detail": "Acesso negado. Este endpoint é restrito a administradores."},
                status=status.HTTP_403_FORBIDDEN,
            )

        tokens = dict(response.data)
        self.set_auth_cookies(response, tokens)

        response.data = {
            "detail": "Autenticado com sucesso como administrador.",
            "user_type": "admin",
        }
        return response


class AdminMeView(APIView):
    """
    GET /api/admin/me/
    Retorna dados básicos do usuário admin autenticado.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        user = request.user
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
            }
        )


class GoogleAuthView(CookieTokenMixin, APIView):
    """
    POST /api/auth/google/
    Autentica usuário via Google OAuth.
    Funciona para músicos (e futuros contratantes).
    """

    authentication_classes = []
    permission_classes = []
    throttle_scope = "google_auth"

    def post(self, request, *args, **kwargs):
        import os

        credential = request.data.get("credential")
        user_type = request.data.get("user_type", "musician")  # 'musician' ou 'contractor'

        if not credential:
            return Response(
                {"detail": "Credencial do Google não fornecida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not id_token or not google_requests:
            return Response(
                {"detail": "Autenticação com Google não configurada."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
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

        from agenda.models import ContractorProfile, Musician

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
        contractor_profile = ContractorProfile.objects.filter(user=user, is_active=True).first()

        if not contractor_profile and not has_musician_profile:
            return Response(
                {"detail": "Conta sem perfil ativo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Gera tokens
        refresh = RefreshToken.for_user(user)
        tokens = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }

        response_data = {
            "detail": "Autenticado com sucesso.",
            "new_user": False,
        }

        if contractor_profile:
            response_data["user_type"] = "contractor"
            response_data["contractor"] = {
                "id": contractor_profile.id,
                "name": contractor_profile.name,
            }
        else:
            response_data["user_type"] = "musician"

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
        import os

        from django.db import transaction

        from agenda.models import Membership, Musician, MusicianRequest, Organization

        credential = request.data.get("credential")
        invite_token = request.data.get("invite_token")

        if not credential:
            return Response(
                {"detail": "Credencial do Google não fornecida."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not id_token or not google_requests:
            return Response(
                {"detail": "Autenticação com Google não configurada."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
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

            # Verifica issuer (segurança adicional)
            if idinfo.get("iss") not in [
                "accounts.google.com",
                "https://accounts.google.com",
            ]:
                raise ValueError("Token não emitido pelo Google")

            email = idinfo.get("email", "").lower()
            email_verified = idinfo.get("email_verified", False)
            given_name = idinfo.get("given_name", "")
            family_name = idinfo.get("family_name", "")
            picture = idinfo.get("picture", "")  # Avatar do Google

            # Verifica email verificado
            if not email_verified:
                return Response(
                    {"detail": "Email não verificado no Google."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if email != musician_request.email:
                return Response(
                    {"detail": "O email da conta Google deve ser o mesmo da solicitação."},
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
                    last_name=family_name or " ".join(musician_request.full_name.split()[1:]),
                )
                user.set_unusable_password()  # Login apenas via Google
                user.save()

                # Cria músico
                instruments = musician_request.instruments or []
                if musician_request.instrument and musician_request.instrument not in instruments:
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
                )

                avatar_file = _process_google_picture(
                    picture,
                    label="avatar",
                    prefix="avatar",
                )
                if avatar_file:
                    if musician.avatar:
                        musician.avatar.delete(save=False)
                    musician.avatar = avatar_file
                    musician.save(update_fields=["avatar"])

                # Cria organização pessoal com nome único
                base_org_name = f"Org de {username}"
                org_name = base_org_name
                counter = 2
                while Organization.objects.filter(name=org_name).exists():
                    org_name = f"{base_org_name} {counter}"
                    counter += 1

                org = Organization.objects.create(
                    owner=user,
                    name=org_name,
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
                "user_type": "musician",
            },
            status=status.HTTP_201_CREATED,
        )
        self.set_auth_cookies(response, tokens)
        return response


class ContractorTokenObtainPairView(CookieTokenMixin, APIView):
    """
    Login específico para contratantes.
    Valida que o usuário possui ContractorProfile ativo.
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

        from django.contrib.auth.models import User

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "Credenciais inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {"detail": "Credenciais inválidas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not hasattr(user, "contractor_profile"):
            return Response(
                {"detail": "Esta conta não está associada a um contratante."},
                status=status.HTTP_403_FORBIDDEN,
            )

        contractor = user.contractor_profile
        if not contractor.is_active:
            return Response(
                {"detail": "Conta de contratante inativa."},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        tokens = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }

        response = Response(
            {
                "detail": "Autenticado com sucesso.",
                "user_type": "contractor",
                "contractor": {
                    "id": contractor.id,
                    "name": contractor.name,
                },
            }
        )
        self.set_auth_cookies(response, tokens)
        return response

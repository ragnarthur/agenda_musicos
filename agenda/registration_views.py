# agenda/registration_views.py
"""
Views para fluxo de registro de novos músicos e empresas.

Fluxo de registro de músicos (via aprovação admin):
1. POST /musician-request/ - Músico solicita acesso
2. Admin aprova no dashboard
3. POST /register-with-invite/ - Músico completa registro com token de convite

Fluxo de registro de empresas:
1. POST /register-company/ - Empresa se registra diretamente (sem aprovação)
"""

import ipaddress
import logging
import socket
from io import BytesIO
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
import requests

from .image_processing import MAX_AVATAR_BYTES, MAX_AVATAR_SIZE, _process_profile_image

from notifications.services.email_service import send_welcome_email

from .models import (
    Membership,
    Musician,
    MusicianRequest,
    Organization,
)
from .throttles import BurstRateThrottle

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    """
    POST /api/register/
    Registro direto de músico (descontinuado).
    """

    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        return Response(
            {
                "detail": "Registro direto desativado. Use /register-with-invite/ ou /register-company/."
            },
            status=status.HTTP_410_GONE,
        )


class CheckEmailView(APIView):
    """
    GET /api/check-email/?email=foo@bar.com
    Verifica disponibilidade de email para cadastro.
    """

    permission_classes = [AllowAny]
    throttle_scope = "check_email"

    def get(self, request):
        email = (request.query_params.get("email") or "").strip().lower()
        if not email:
            return Response(
                {"available": False, "reason": "invalid_email"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_email(email)
        except DjangoValidationError:
            return Response(
                {"available": False, "reason": "invalid_email"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_exists = User.objects.filter(email__iexact=email).exists()
        request_entry = MusicianRequest.objects.filter(email__iexact=email).first()

        # Em produção, evita enumeração de emails: resposta neutra
        if not settings.DEBUG and (user_exists or request_entry):
            return Response({"available": True})

        if user_exists:
            return Response({"available": False, "reason": "already_registered"})
        if request_entry:
            if request_entry.status in ["pending", "approved"] and not request_entry.invite_used:
                return Response({"available": False, "reason": "pending_verification"})
            return Response({"available": False, "reason": request_entry.status})

        return Response({"available": True})


class RegisterWithInviteView(APIView):
    """
    POST /api/register-with-invite/
    Registro de músico usando token de convite (após aprovação do admin).
    """

    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        data = request.data
        errors = {}

        # Validar token de convite
        invite_token = data.get("invite_token")
        if not invite_token:
            return Response(
                {"error": "Token de convite não fornecido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            musician_request = MusicianRequest.objects.get(invite_token=invite_token)
        except MusicianRequest.DoesNotExist:
            return Response(
                {"error": "Token de convite inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not musician_request.is_invite_valid():
            if musician_request.invite_used:
                return Response(
                    {"error": "Este convite já foi utilizado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response({"error": "Convite expirado."}, status=status.HTTP_400_BAD_REQUEST)

        # Validações de campos
        required_fields = ["password"]
        for field in required_fields:
            if not data.get(field):
                errors[field] = "Este campo é obrigatório."

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        password = data["password"]

        # Validação de força de senha
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response({"password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        # Usa dados do MusicianRequest ou permite override
        email = musician_request.email
        first_name = data.get("first_name") or musician_request.full_name.split()[0]
        last_name = data.get("last_name") or " ".join(musician_request.full_name.split()[1:])
        username = data.get("username") or email.split("@")[0]

        # Validação de username único
        if User.objects.filter(username=username).exists():
            # Gera username único
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

        # Validação de email (já deveria estar ok pelo MusicianRequest)
        if User.objects.filter(email=email).exists():
            return Response(
                {"email": "Este email já está cadastrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # Cria usuário
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )
                user.set_password(password)
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

                # Cria organização pessoal
                org, _ = Organization.objects.get_or_create(
                    owner=user,
                    defaults={
                        "name": f"Org de {username}",
                    },
                )

                # Adiciona como membro owner
                Membership.objects.get_or_create(
                    user=user,
                    organization=org,
                    defaults={
                        "role": "owner",
                        "status": "active",
                    },
                )

                # Marca convite como usado
                musician_request.mark_invite_used()

                logger.info(f"Musician registered via invite: {user.username}")

        except Exception as e:
            logger.error(f"Error registering musician with invite: {e}")
            return Response(
                {"error": "Erro ao criar conta. Tente novamente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Envia email de boas-vindas
        try:
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
            login_url = f"{frontend_url}/login"
            send_welcome_email(
                to_email=user.email,
                first_name=first_name,
                username=username,
                login_url=login_url,
            )
        except Exception as e:
            logger.error(f"Error sending welcome email: {e}")

        return Response(
            {
                "message": "Conta criada com sucesso!",
                "username": username,
                "email": email,
            },
            status=status.HTTP_201_CREATED,
        )


class RegisterCompanyView(APIView):
    """
    POST /api/register-company/
    Registro de empresa (gratuito, sem aprovação).
    """

    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        from .serializers import CompanyRegisterSerializer

        serializer = CompanyRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        email = data["email"]
        password = data["password"]
        company_name = data["company_name"]
        contact_name = data["contact_name"]
        phone = data.get("phone", "")
        city = data["city"]
        state = data["state"]
        org_type = data.get("org_type", "company")

        # Validação de força de senha
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response({"password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        # Validação de username único
        username = email.split("@")[0]
        if User.objects.filter(username=username).exists():
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

        # Validação de nome de empresa único
        if Organization.objects.filter(name=company_name).exists():
            return Response(
                {"company_name": "Uma empresa com este nome já está cadastrada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                # Extrai primeiro e último nome
                name_parts = contact_name.split()
                first_name = name_parts[0] if name_parts else contact_name
                last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

                # Cria usuário
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )
                user.set_password(password)
                user.save()

                # Cria organização (empresa)
                organization = Organization.objects.create(
                    name=company_name,
                    owner=user,
                    org_type=org_type,
                    contact_name=contact_name,
                    contact_email=email,
                    phone=phone,
                    city=city,
                    state=state,
                )

                # Cria membership
                Membership.objects.create(
                    user=user,
                    organization=organization,
                    role="owner",
                    status="active",
                )

                logger.info(f"Company registered: {company_name} by {user.username}")

        except Exception as e:
            logger.error(f"Error registering company: {e}")
            return Response(
                {"error": "Erro ao criar conta. Tente novamente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Retornar formato padronizado
        return Response(
            {
                "detail": "Empresa cadastrada com sucesso!",
                "user_type": "company",
                "organization": {
                    "id": organization.id,
                    "name": organization.name,
                    "org_type": organization.org_type,
                },
                "username": username,
                "email": email,
                # Nota: access/refresh tokens não são gerados aqui (usuário precisa fazer login)
                "access": None,
                "refresh": None,
            },
            status=status.HTTP_201_CREATED,
        )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_avatar(request):
    """
    PATCH /api/musicians/avatar/
    Atualiza avatar_url do usuário.
    """
    avatar_url = request.data.get("avatar_url", "").strip()

    if not avatar_url:
        return Response(
            {"detail": "avatar_url é obrigatório."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validar URL com whitelist de esquemas permitidos
    from urllib.parse import urlparse

    parsed = urlparse(avatar_url)

    # Whitelist de esquemas permitidos
    ALLOWED_SCHEMES = {"http", "https"}

    if not parsed.scheme or not parsed.netloc:
        return Response(
            {"detail": "URL inválida."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if parsed.scheme not in ALLOWED_SCHEMES:
        return Response(
            {"detail": "Apenas URLs http/https são permitidas."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validações adicionais contra XSS
    avatar_url_lower = avatar_url.lower()
    if "javascript:" in avatar_url_lower:
        return Response(
            {"detail": "URL não permitida."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if "data:" in avatar_url_lower:
        return Response(
            {"detail": "URLs data: não são permitidas. Use upload de arquivo."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if "vbscript:" in avatar_url_lower:
        return Response(
            {"detail": "URL não permitida."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        musician = request.user.musician_profile
    except Musician.DoesNotExist:
        return Response({"detail": "Perfil não encontrado."}, status=status.HTTP_404_NOT_FOUND)

    parsed_host = parsed.hostname or ""
    try:
        if parsed.port and parsed.port not in (80, 443):
            return Response(
                {"detail": "URL não permitida."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except ValueError:
        return Response({"detail": "URL inválida."}, status=status.HTTP_400_BAD_REQUEST)

    if not parsed_host or parsed_host in {"localhost"} or parsed_host.endswith(".local"):
        return Response({"detail": "URL não permitida."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        addresses = socket.getaddrinfo(parsed_host, parsed.port or 443)
    except socket.gaierror:
        return Response({"detail": "URL inválida."}, status=status.HTTP_400_BAD_REQUEST)

    for addr in addresses:
        ip = addr[4][0]
        try:
            ip_obj = ipaddress.ip_address(ip)
        except ValueError:
            return Response({"detail": "URL inválida."}, status=status.HTTP_400_BAD_REQUEST)
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_reserved
            or ip_obj.is_multicast
            or ip_obj.is_unspecified
        ):
            return Response({"detail": "URL não permitida."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        response = requests.get(
            avatar_url,
            stream=True,
            timeout=(3.05, 5),
            allow_redirects=False,
            headers={"User-Agent": "GigFlowAvatar/1.0"},
        )
    except requests.RequestException:
        return Response(
            {"detail": "Não foi possível baixar a imagem do avatar."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if response.status_code != 200:
        return Response(
            {"detail": "Não foi possível baixar a imagem do avatar."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_type = (response.headers.get("Content-Type") or "").split(";")[0].lower()
    if not content_type.startswith("image/"):
        return Response(
            {"detail": "URL não aponta para uma imagem válida."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_length = response.headers.get("Content-Length")
    if content_length:
        try:
            if int(content_length) > MAX_AVATAR_BYTES:
                return Response(
                    {"detail": "Imagem muito grande. Use uma imagem menor."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (TypeError, ValueError):
            pass

    buffer = BytesIO()
    total_read = 0
    for chunk in response.iter_content(chunk_size=8192):
        if not chunk:
            continue
        total_read += len(chunk)
        if total_read > MAX_AVATAR_BYTES:
            return Response(
                {"detail": "Imagem muito grande. Use uma imagem menor."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        buffer.write(chunk)

    if total_read == 0:
        return Response(
            {"detail": "Não foi possível baixar a imagem do avatar."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    buffer.seek(0)
    content = ContentFile(buffer.read(), name="avatar-remote")
    content.content_type = content_type

    try:
        processed_file = _process_profile_image(
            content,
            max_bytes=MAX_AVATAR_BYTES,
            max_size=MAX_AVATAR_SIZE,
            crop_square=True,
            quality=88,
            prefix="avatar",
        )
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if musician.avatar:
        musician.avatar.delete(save=False)

    musician.avatar = processed_file
    musician.save(update_fields=["avatar"])

    return Response(
        {
            "detail": "Avatar atualizado com sucesso.",
            "avatar_url": request.build_absolute_uri(musician.avatar.url),
        },
        status=status.HTTP_200_OK,
    )

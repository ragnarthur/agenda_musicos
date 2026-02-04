# agenda/registration_views.py
"""
Views para fluxo de registro de novos músicos e contratantes.

Fluxo de registro de músicos (via aprovação admin):
1. POST /musician-request/ - Músico solicita acesso
2. Admin aprova no dashboard
3. POST /register-with-invite/ - Músico completa registro com token de convite

Fluxo de registro de contratantes:
1. POST /register-contractor/ - Contratante se registra diretamente (cadastro breve)
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .image_download import RemoteImageError, download_image_from_url
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
                "detail": "Registro direto desativado. Use /register-with-invite/ ou /register-contractor/."
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
            if (
                request_entry.status in ["pending", "approved"]
                and not request_entry.invite_used
            ):
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
            return Response(
                {"error": "Convite expirado."}, status=status.HTTP_400_BAD_REQUEST
            )

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
            return Response(
                {"password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST
            )

        # Usa dados do MusicianRequest ou permite override
        email = musician_request.email
        first_name = data.get("first_name") or musician_request.full_name.split()[0]
        last_name = data.get("last_name") or " ".join(
            musician_request.full_name.split()[1:]
        )
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
                musician_request = (
                    MusicianRequest.objects.select_for_update()
                    .get(invite_token=invite_token)
                )

                if not musician_request.is_invite_valid():
                    if musician_request.invite_used:
                        return Response(
                            {"error": "Este convite já foi utilizado."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    return Response(
                        {"error": "Convite expirado."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

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
                # Remove duplicados da lista de instrumentos antes de criar
                instruments = list(dict.fromkeys(musician_request.instruments or []))

                if musician_request.instrument:
                    if musician_request.instrument not in instruments:
                        instruments.insert(0, musician_request.instrument)
                    # Se já existe na lista, não duplicar - instrument já será incluído via instruments
                    else:
                        # Instrumento principal já está na lista, removemos duplicados
                        instruments = [musician_request.instrument] + [
                            inst
                            for inst in instruments
                            if inst != musician_request.instrument
                        ]

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

        except IntegrityError:
            logger.warning(
                "Integrity error registering musician with invite",
                exc_info=True,
            )
            return Response(
                {
                    "error": "Não foi possível concluir o cadastro. "
                    "Esse email já pode estar registrado. Tente fazer login."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.exception("Error registering musician with invite")
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


class RegisterContractorView(APIView):
    """
    POST /api/register-contractor/
    Registro de contratante (cadastro breve).
    """

    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        from .serializers import ContractorRegisterSerializer
        from .models import ContractorProfile

        serializer = ContractorRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        name = data["name"]
        email = data["email"]
        password = data["password"]
        phone = data.get("phone", "")
        city = data["city"]
        state = data["state"]

        # Validação de força de senha
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response(
                {"password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST
            )

        # Username único baseado no email
        username = email.split("@")[0]
        if User.objects.filter(username=username).exists():
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

        try:
            with transaction.atomic():
                # Extrai nome e sobrenome
                name_parts = name.split()
                first_name = name_parts[0] if name_parts else name
                last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )
                user.set_password(password)
                user.save()

                contractor = ContractorProfile.objects.create(
                    user=user,
                    name=name,
                    phone=phone,
                    city=city,
                    state=state,
                    accepted_terms_at=timezone.now(),
                )

                logger.info(f"Contractor registered: {contractor.name} by {user.username}")

        except Exception as e:
            logger.error(f"Error registering contractor: {e}")
            return Response(
                {"error": "Erro ao criar conta. Tente novamente."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Envia email de boas-vindas
        try:
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
            login_url = f"{frontend_url}/contratante/login"
            send_welcome_email(
                to_email=user.email,
                first_name=first_name,
                username=username,
                login_url=login_url,
            )
        except Exception as e:
            logger.error(f"Error sending welcome email to contractor: {e}")

        return Response(
            {
                "detail": "Contratante cadastrado com sucesso!",
                "user_type": "contractor",
                "contractor": {
                    "id": contractor.id,
                    "name": contractor.name,
                },
                "username": username,
                "email": email,
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

    try:
        musician = request.user.musician_profile
    except Musician.DoesNotExist:
        return Response(
            {"detail": "Perfil não encontrado."}, status=status.HTTP_404_NOT_FOUND
        )

    try:
        content = download_image_from_url(
            avatar_url,
            max_bytes=MAX_AVATAR_BYTES,
            label="avatar",
            user_agent="GigFlowAvatar/1.0",
        )
        processed_file = _process_profile_image(
            content,
            max_bytes=MAX_AVATAR_BYTES,
            max_size=MAX_AVATAR_SIZE,
            crop_square=True,
            quality=88,
            prefix="avatar",
        )
    except RemoteImageError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
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

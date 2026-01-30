# agenda/password_views.py
import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.services.email_service import send_password_reset_email

from .throttles import BurstRateThrottle

logger = logging.getLogger(__name__)
token_generator = PasswordResetTokenGenerator()


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()

        if not email or "@" not in email:
            return Response(
                {"email": "Informe um email válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()
        if user:
            try:
                self._send_reset_email(user)
            except Exception as exc:
                logger.error("Erro ao enviar email de redefinição: %s", exc)

        return Response(
            {"message": "Se este email estiver cadastrado, enviaremos um link para redefinição."},
            status=status.HTTP_200_OK,
        )

    def _send_reset_email(self, user: User) -> None:
        """Envia email de redefinição de senha usando o EmailService"""
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = token_generator.make_token(user)
        reset_url = f"{frontend_url}/redefinir-senha?uid={uid}&token={token}"

        send_password_reset_email(
            to_email=user.email,
            first_name=user.first_name or user.username,
            reset_url=reset_url,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        if not uid or not token:
            return Response(
                {"error": "Link inválido. Solicite uma nova redefinição."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not new_password:
            return Response(
                {"new_password": "A nova senha é obrigatória."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {"error": "Link inválido. Solicite uma nova redefinição."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_generator.check_token(user, token):
            return Response(
                {"error": "Link expirado ou inválido. Solicite uma nova redefinição."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validação de força de senha usando validators do Django
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            return Response(
                {"new_password": list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(str(new_password))
        user.save(update_fields=["password"])

        return Response(
            {"message": "Senha atualizada com sucesso."},
            status=status.HTTP_200_OK,
        )

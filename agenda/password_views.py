# agenda/password_views.py
import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .throttles import BurstRateThrottle

logger = logging.getLogger(__name__)
token_generator = PasswordResetTokenGenerator()


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()

        if not email or '@' not in email:
            return Response(
                {'email': 'Informe um email válido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()
        if user:
            try:
                self._send_reset_email(user)
            except Exception as exc:
                logger.error('Erro ao enviar email de redefinição: %s', exc)

        return Response(
            {'message': 'Se este email estiver cadastrado, enviaremos um link para redefinição.'},
            status=status.HTTP_200_OK,
        )

    def _send_reset_email(self, user: User) -> None:
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = token_generator.make_token(user)
        reset_url = f"{frontend_url}/redefinir-senha?uid={uid}&token={token}"

        subject = 'Redefinição de senha - GigFlow'
        message = f"""
Olá {user.first_name or user.username}!

Recebemos seu pedido para redefinir a senha da sua conta.

Para criar uma nova senha, acesse o link abaixo:
{reset_url}

Se você não solicitou a redefinição, ignore este email.

Equipe GigFlow
        """

        html_message = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
    .header {{ background: linear-gradient(135deg, #0f172a, #1f2937); color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }}
    .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
    .button {{ display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0; }}
    .button:hover {{ background: #4338ca; }}
    .footer {{ text-align: center; margin-top: 18px; color: #666; font-size: 12px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>GigFlow</h1>
    </div>
    <div class="content">
      <h2>Olá {user.first_name or user.username}!</h2>
      <p>Recebemos seu pedido para redefinir a senha da sua conta.</p>
      <p>Para criar uma nova senha, clique no botão abaixo:</p>
      <p style="text-align: center;">
        <a href="{reset_url}" class="button">Redefinir Senha</a>
      </p>
      <p><small>Ou copie e cole este link no navegador:<br>{reset_url}</small></p>
      <p><small>Se você não solicitou a redefinição, ignore este email.</small></p>
    </div>
    <div class="footer">
      <p>Equipe GigFlow</p>
    </div>
  </div>
</body>
</html>
        """

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not uid or not token:
            return Response(
                {'error': 'Link inválido. Solicite uma nova redefinição.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not new_password:
            return Response(
                {'new_password': 'A nova senha é obrigatória.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {'error': 'Link inválido. Solicite uma nova redefinição.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_generator.check_token(user, token):
            return Response(
                {'error': 'Link expirado ou inválido. Solicite uma nova redefinição.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validação de força de senha usando validators do Django
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            return Response(
                {'new_password': list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(str(new_password))
        user.save(update_fields=['password'])

        return Response(
            {'message': 'Senha atualizada com sucesso.'},
            status=status.HTTP_200_OK,
        )

import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

from notifications.services.base import BaseProvider, NotificationPayload, NotificationResult

logger = logging.getLogger(__name__)


class EmailProvider(BaseProvider):
    """Provider para envio via Email (Django SMTP)"""

    @property
    def channel_name(self) -> str:
        return 'email'

    def is_configured(self) -> bool:
        return bool(getattr(settings, 'EMAIL_HOST_USER', None))

    def can_send_to(self, user) -> bool:
        return bool(user.email)

    def send(self, payload: NotificationPayload, user) -> NotificationResult:
        if not self.can_send_to(user):
            return NotificationResult(
                success=False,
                error_message="Usuario sem email configurado"
            )

        try:
            # Monta HTML do email
            html_message = self._build_html_message(payload)

            send_mail(
                subject=payload.title,
                message=payload.body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )

            logger.info(f"Email enviado para {user.email}")
            return NotificationResult(success=True)

        except Exception as e:
            logger.exception(f"Erro ao enviar email: {e}")
            return NotificationResult(success=False, error_message=str(e))

    def _build_html_message(self, payload: NotificationPayload) -> str:
        """Constroi mensagem HTML para o email"""
        url = payload.data.get('url', '')
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">GigFlow</h1>
                </div>

                <!-- Content -->
                <div style="padding: 30px 20px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">
                        {payload.title}
                    </h2>

                    <div style="color: #4b5563; font-size: 16px; line-height: 1.6; white-space: pre-line;">
                        {payload.body}
                    </div>

                    {f'''
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="{url}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Ver Detalhes
                        </a>
                    </div>
                    ''' if url else ''}
                </div>

                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                        Este email foi enviado automaticamente pelo GigFlow - Agenda.
                    </p>
                    <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
                        <a href="{frontend_url}/settings/notifications" style="color: #6366f1; text-decoration: none;">
                            Gerenciar preferencias de notificacao
                        </a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        return html

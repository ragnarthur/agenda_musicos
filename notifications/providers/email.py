import logging
from django.conf import settings

from notifications.services.base import BaseProvider, NotificationPayload, NotificationResult
from notifications.services.email_service import EmailService

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
            # Extrai dados do payload para o contexto do template
            context = {
                'title': payload.title,
                'body': payload.body,
                'first_name': user.first_name or user.username,
                'action_url': payload.data.get('url', ''),
                'action_text': payload.data.get('action_text', 'Ver detalhes'),
                'event_title': payload.data.get('event_title', ''),
                'event_lines': payload.data.get('event_lines', []),
                'preview_text': payload.data.get('preview_text', payload.title),
            }

            # Determina o template baseado no tipo de notificação (se disponível)
            template_name = payload.data.get('template', 'notification')

            success = EmailService.send(
                template_name=template_name,
                to_email=user.email,
                subject=payload.title,
                context=context,
                show_unsubscribe=True,
                fail_silently=False,
            )

            if success:
                logger.info(f"Email enviado para {user.email}")
                return NotificationResult(success=True)
            else:
                return NotificationResult(
                    success=False,
                    error_message="Falha ao enviar email"
                )

        except Exception as e:
            logger.exception(f"Erro ao enviar email: {e}")
            return NotificationResult(success=False, error_message=str(e))

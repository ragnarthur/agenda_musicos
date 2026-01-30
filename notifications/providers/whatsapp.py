import logging

import requests
from django.conf import settings

from notifications.services.base import BaseProvider, NotificationPayload, NotificationResult

logger = logging.getLogger(__name__)


class WhatsAppProvider(BaseProvider):
    """
    Provider para WhatsApp (stub para integracao futura).

    Opcoes de integracao:
    1. Baileys (Node.js) - Microservico separado (gratuito, mas requer manutencao)
    2. Twilio WhatsApp API - Pago, mas estavel
    3. Meta Cloud API - Requer aprovacao do Meta

    Este provider esta preparado para qualquer implementacao.
    Configure WHATSAPP_SERVICE_URL quando tiver o servico pronto.
    """

    @property
    def channel_name(self) -> str:
        return "whatsapp"

    def is_configured(self) -> bool:
        service_url = getattr(settings, "WHATSAPP_SERVICE_URL", "")
        return bool(service_url)

    def can_send_to(self, user) -> bool:
        try:
            prefs = user.notification_preferences
            return bool(prefs.whatsapp_number and prefs.whatsapp_verified)
        except Exception:
            return False

    def send(self, payload: NotificationPayload, user) -> NotificationResult:
        """
        Envia via microservico WhatsApp (Baileys ou similar).

        Espera um endpoint POST em WHATSAPP_SERVICE_URL/send com:
        {
            "phone": "5511999999999",
            "message": "Texto da mensagem"
        }
        """
        if not self.is_configured():
            return NotificationResult(
                success=False,
                error_message="WhatsApp nao configurado. Configure WHATSAPP_SERVICE_URL.",
            )

        try:
            prefs = user.notification_preferences
            phone = prefs.whatsapp_number
        except Exception:
            return NotificationResult(
                success=False, error_message="Usuario sem WhatsApp configurado"
            )

        service_url = getattr(settings, "WHATSAPP_SERVICE_URL", "")
        service_secret = getattr(settings, "WHATSAPP_SERVICE_SECRET", "")

        message = self._format_whatsapp_message(payload)

        try:
            response = requests.post(
                f"{service_url}/send",
                json={
                    "phone": phone,
                    "message": message,
                },
                headers={
                    "X-Service-Secret": service_secret,
                    "Content-Type": "application/json",
                },
                timeout=30,
            )

            if response.status_code == 200:
                data = response.json()
                logger.info(f"WhatsApp enviado para {phone}")
                return NotificationResult(success=True, external_id=data.get("message_id"))
            else:
                error = f"HTTP {response.status_code}: {response.text}"
                logger.error(f"Erro WhatsApp: {error}")
                return NotificationResult(success=False, error_message=error)

        except requests.exceptions.Timeout:
            return NotificationResult(success=False, error_message="Timeout no servico WhatsApp")
        except Exception as e:
            logger.exception("Erro ao enviar WhatsApp")
            return NotificationResult(success=False, error_message=str(e))

    def _format_whatsapp_message(self, payload: NotificationPayload) -> str:
        """Formata mensagem para WhatsApp"""
        lines = [
            f"*{payload.title}*",
            "",
            payload.body,
        ]

        url = payload.data.get("url")
        if url:
            lines.append("")
            lines.append(url)

        return "\n".join(lines)

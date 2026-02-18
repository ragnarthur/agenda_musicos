import logging
import time

import requests
from django.conf import settings

from notifications.services.base import BaseProvider, NotificationPayload, NotificationResult

logger = logging.getLogger(__name__)

# Configuração de retry
MAX_RETRIES = 3
RETRY_DELAY = 1  # segundos (exponencial: 1, 2, 4)

# Branding
SEPARATOR = "━━━━━━━━━━━━━━━━━"
SIGNATURE = "🎶 GigFlow Agenda"

# Emoji por notification_type
NOTIFICATION_EMOJI = {
    "event_invite": "🎵",
    "availability_response": "📨",
    "event_confirmed": "✅",
    "event_cancelled": "❌",
    "marketplace_activity": "💼",
    "quote_request_new": "📋",
    "quote_proposal_received": "💰",
    "quote_reservation_created": "🤝",
    "quote_booking_confirmed": "🎉",
}


class TelegramProvider(BaseProvider):
    """
    Provider para envio via Telegram Bot API.

    Configuracao necessaria no .env:
    - TELEGRAM_BOT_TOKEN: Token do bot (obtido via @BotFather)
    - TELEGRAM_BOT_USERNAME: Username do bot (ex: @GigFlowAgendaBot)
    """

    BASE_URL = "https://api.telegram.org/bot{token}"

    @property
    def channel_name(self) -> str:
        return "telegram"

    @property
    def bot_token(self) -> str:
        return getattr(settings, "TELEGRAM_BOT_TOKEN", "")

    def is_configured(self) -> bool:
        return bool(self.bot_token)

    def can_send_to(self, user) -> bool:
        try:
            prefs = user.notification_preferences
            return bool(prefs.telegram_chat_id and prefs.telegram_verified)
        except Exception:
            return False

    def _get_api_url(self, method: str) -> str:
        return f"{self.BASE_URL.format(token=self.bot_token)}/{method}"

    def send(self, payload: NotificationPayload, user) -> NotificationResult:
        if not self.is_configured():
            return NotificationResult(success=False, error_message="Telegram nao configurado")

        try:
            prefs = user.notification_preferences
            chat_id = prefs.telegram_chat_id
        except Exception:
            return NotificationResult(
                success=False, error_message="Usuario sem chat_id configurado"
            )

        message = self._format_telegram_message(payload)

        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                response = requests.post(
                    self._get_api_url("sendMessage"),
                    json={
                        "chat_id": chat_id,
                        "text": message,
                        "parse_mode": "HTML",
                        "disable_web_page_preview": False,
                    },
                    timeout=10,
                )

                data = response.json()

                if data.get("ok"):
                    message_id = data.get("result", {}).get("message_id")
                    logger.info(f"Telegram enviado para chat_id {chat_id}")
                    return NotificationResult(success=True, external_id=str(message_id))
                else:
                    # Erro de API (chat_id invalido, bot bloqueado, etc) - nao fazer retry
                    error = data.get("description", "Erro desconhecido")
                    logger.error(f"Telegram API error: {error}")
                    return NotificationResult(success=False, error_message=error)

            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                last_error = str(e)
                if attempt < MAX_RETRIES - 1:
                    delay = RETRY_DELAY * (2**attempt)
                    logger.warning(
                        f"Telegram retry {attempt + 1}/{MAX_RETRIES} para chat_id {chat_id} em {delay}s: {e}"
                    )
                    time.sleep(delay)
                continue
            except Exception as e:
                logger.exception("Erro ao enviar mensagem Telegram")
                return NotificationResult(success=False, error_message=str(e))

        logger.error(f"Telegram falhou apos {MAX_RETRIES} tentativas para chat_id {chat_id}")
        return NotificationResult(
            success=False,
            error_message=f"Falha apos {MAX_RETRIES} tentativas: {last_error}",
        )

    def _format_telegram_message(self, payload: NotificationPayload) -> str:
        """Formata mensagem com HTML para Telegram, com emoji e assinatura."""
        emoji = NOTIFICATION_EMOJI.get(payload.notification_type, "🔔")
        title = f"{emoji} <b>{self._escape_html(payload.title)}</b>"
        body = self._escape_html(payload.body)

        parts = [title, "", body]

        url = payload.data.get("url")
        if url:
            parts.append("")
            parts.append(f'🔗 <a href="{url}">Abrir no GigFlow Agenda</a>')

        parts.append(self._build_footer())
        return "\n".join(parts)

    @staticmethod
    def _escape_html(text: str) -> str:
        """Escapa caracteres especiais para HTML do Telegram."""
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    @staticmethod
    def _build_footer() -> str:
        """Retorna separador + assinatura da marca."""
        return f"\n{SEPARATOR}\n{SIGNATURE}"

    def format_system_message(self, text: str) -> str:
        """Formata mensagem de sistema (welcome, status, etc.) com footer."""
        return f"{text}\n{self._build_footer()}"

    def send_message(self, chat_id: str, text: str, parse_mode: str = "HTML") -> NotificationResult:
        """
        Envia mensagem generica para um chat_id.
        Util para mensagens de sistema como verificacao.
        """
        if not self.is_configured():
            return NotificationResult(success=False, error_message="Telegram nao configurado")

        try:
            response = requests.post(
                self._get_api_url("sendMessage"),
                json={
                    "chat_id": chat_id,
                    "text": text,
                    "parse_mode": parse_mode,
                },
                timeout=10,
            )

            data = response.json()
            if data.get("ok"):
                return NotificationResult(
                    success=True, external_id=str(data.get("result", {}).get("message_id"))
                )
            else:
                return NotificationResult(
                    success=False, error_message=data.get("description", "Erro")
                )

        except Exception as e:
            logger.exception("Erro ao enviar mensagem Telegram")
            return NotificationResult(success=False, error_message=str(e))

    def get_bot_info(self) -> dict:
        """Retorna informacoes do bot"""
        if not self.is_configured():
            return {}

        try:
            response = requests.get(self._get_api_url("getMe"), timeout=10)
            data = response.json()
            if data.get("ok"):
                return data.get("result", {})
        except Exception:
            pass

        return {}

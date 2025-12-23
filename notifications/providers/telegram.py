import logging
import requests
from django.conf import settings

from notifications.services.base import BaseProvider, NotificationPayload, NotificationResult

logger = logging.getLogger(__name__)


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
        return 'telegram'

    @property
    def bot_token(self) -> str:
        return getattr(settings, 'TELEGRAM_BOT_TOKEN', '')

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
            return NotificationResult(
                success=False,
                error_message="Telegram nao configurado"
            )

        try:
            prefs = user.notification_preferences
            chat_id = prefs.telegram_chat_id
        except Exception:
            return NotificationResult(
                success=False,
                error_message="Usuario sem chat_id configurado"
            )

        # Formata mensagem para Telegram (suporta Markdown)
        message = self._format_telegram_message(payload)

        try:
            response = requests.post(
                self._get_api_url('sendMessage'),
                json={
                    'chat_id': chat_id,
                    'text': message,
                    'parse_mode': 'Markdown',
                    'disable_web_page_preview': False,
                },
                timeout=10
            )

            data = response.json()

            if data.get('ok'):
                message_id = data.get('result', {}).get('message_id')
                logger.info(f"Telegram enviado para chat_id {chat_id}")
                return NotificationResult(
                    success=True,
                    external_id=str(message_id)
                )
            else:
                error = data.get('description', 'Erro desconhecido')
                logger.error(f"Telegram API error: {error}")
                return NotificationResult(success=False, error_message=error)

        except requests.exceptions.Timeout:
            logger.error("Timeout na API do Telegram")
            return NotificationResult(success=False, error_message="Timeout na API do Telegram")
        except Exception as e:
            logger.exception("Erro ao enviar mensagem Telegram")
            return NotificationResult(success=False, error_message=str(e))

    def _format_telegram_message(self, payload: NotificationPayload) -> str:
        """Formata mensagem com Markdown para Telegram"""
        lines = [
            f"*{self._escape_markdown(payload.title)}*",
            "",
            self._escape_markdown(payload.body),
        ]

        # Adiciona link se disponivel
        url = payload.data.get('url')
        if url:
            lines.append("")
            lines.append(f"[Ver detalhes]({url})")

        return "\n".join(lines)

    def _escape_markdown(self, text: str) -> str:
        """Escapa caracteres especiais do Markdown"""
        # Caracteres que precisam ser escapados no Markdown v1
        special_chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
        for char in special_chars:
            text = text.replace(char, f'\\{char}')
        return text

    def send_message(self, chat_id: str, text: str, parse_mode: str = 'Markdown') -> NotificationResult:
        """
        Envia mensagem generica para um chat_id.
        Util para mensagens de sistema como verificacao.
        """
        if not self.is_configured():
            return NotificationResult(success=False, error_message="Telegram nao configurado")

        try:
            response = requests.post(
                self._get_api_url('sendMessage'),
                json={
                    'chat_id': chat_id,
                    'text': text,
                    'parse_mode': parse_mode,
                },
                timeout=10
            )

            data = response.json()
            if data.get('ok'):
                return NotificationResult(success=True, external_id=str(data.get('result', {}).get('message_id')))
            else:
                return NotificationResult(success=False, error_message=data.get('description', 'Erro'))

        except Exception as e:
            logger.exception("Erro ao enviar mensagem Telegram")
            return NotificationResult(success=False, error_message=str(e))

    def get_bot_info(self) -> dict:
        """Retorna informacoes do bot"""
        if not self.is_configured():
            return {}

        try:
            response = requests.get(self._get_api_url('getMe'), timeout=10)
            data = response.json()
            if data.get('ok'):
                return data.get('result', {})
        except Exception:
            pass

        return {}

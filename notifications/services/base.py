from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class NotificationPayload:
    """Payload padronizado para todas as notificacoes"""
    recipient_id: int
    notification_type: str
    title: str
    body: str
    data: Dict[str, Any]
    priority: str = 'normal'


@dataclass
class NotificationResult:
    """Resultado do envio"""
    success: bool
    external_id: Optional[str] = None
    error_message: Optional[str] = None


class BaseProvider(ABC):
    """
    Classe base abstrata para todos os providers de notificacao.
    Cada provider implementa a logica especifica do canal.
    """

    @property
    @abstractmethod
    def channel_name(self) -> str:
        """Nome do canal (ex: 'email', 'telegram')"""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Verifica se o provider esta configurado corretamente"""
        pass

    @abstractmethod
    def can_send_to(self, user) -> bool:
        """Verifica se pode enviar para este usuario"""
        pass

    @abstractmethod
    def send(self, payload: NotificationPayload, user) -> NotificationResult:
        """Envia a notificacao"""
        pass

    def format_message(self, payload: NotificationPayload) -> str:
        """Formata a mensagem para o canal especifico"""
        return f"{payload.title}\n\n{payload.body}"


class NotificationService:
    """
    Servico principal de notificacoes.
    Orquestra o envio atraves dos providers disponiveis.
    """

    def __init__(self):
        self._providers: Dict[str, BaseProvider] = {}

    def register_provider(self, provider: BaseProvider):
        """Registra um provider de notificacao"""
        self._providers[provider.channel_name] = provider
        logger.info(f"Provider registrado: {provider.channel_name}")

    def get_provider(self, channel: str) -> Optional[BaseProvider]:
        """Retorna provider pelo nome do canal"""
        return self._providers.get(channel)

    def send_notification(
        self,
        user,
        notification_type: str,
        title: str,
        body: str,
        data: Dict[str, Any] = None,
        force_channel: str = None
    ) -> NotificationResult:
        """
        Envia notificacao para o usuario usando canal preferido.

        Args:
            user: User object
            notification_type: Tipo de notificacao
            title: Titulo da mensagem
            body: Corpo da mensagem
            data: Dados extras
            force_channel: Forca um canal especifico (ignora preferencia)

        Returns:
            NotificationResult
        """
        from notifications.models import NotificationPreference, NotificationLog, NotificationChannel

        # Busca ou cria preferencias
        prefs, _ = NotificationPreference.objects.get_or_create(user=user)

        # Verifica se usuario quer receber este tipo de notificacao
        if not self._should_notify(prefs, notification_type):
            logger.info(f"Usuario {user.username} desabilitou notificacoes do tipo {notification_type}")
            return NotificationResult(success=True, error_message="Notificacao desabilitada pelo usuario")

        # Determina canal
        if force_channel:
            channel = force_channel
        else:
            channel = prefs.get_active_channel()

        # Cria payload
        payload = NotificationPayload(
            recipient_id=user.id,
            notification_type=notification_type,
            title=title,
            body=body,
            data=data or {}
        )

        # Tenta enviar
        provider = self.get_provider(channel)
        if not provider or not provider.is_configured():
            # Fallback para email
            if channel != 'email' and prefs.fallback_to_email:
                logger.info(f"Fallback para email (provider {channel} nao disponivel)")
                provider = self.get_provider('email')
                channel = 'email'

        if not provider:
            logger.error("Nenhum provider disponivel")
            return NotificationResult(success=False, error_message="Nenhum provider disponivel")

        # Cria log
        log = NotificationLog.objects.create(
            user=user,
            notification_type=notification_type,
            channel=channel,
            subject=title,
            message=body,
            content_type=data.get('content_type', '') if data else '',
            object_id=data.get('object_id') if data else None,
        )

        # Envia
        try:
            result = provider.send(payload, user)

            if result.success:
                log.mark_sent(result.external_id)
                logger.info(f"Notificacao enviada para {user.username} via {channel}")
            else:
                log.mark_failed(result.error_message)
                logger.warning(f"Falha ao enviar para {user.username} via {channel}: {result.error_message}")

                # Tenta fallback se configurado
                if not result.success and channel != 'email' and prefs.fallback_to_email:
                    email_provider = self.get_provider('email')
                    if email_provider and email_provider.can_send_to(user):
                        logger.info(f"Tentando fallback para email...")
                        result = email_provider.send(payload, user)
                        if result.success:
                            log.channel = 'email'
                            log.mark_sent(result.external_id)
                            logger.info(f"Fallback para email bem sucedido")

            return result

        except Exception as e:
            logger.exception(f"Erro ao enviar notificacao: {e}")
            log.mark_failed(str(e))
            return NotificationResult(success=False, error_message=str(e))

    def _should_notify(self, prefs, notification_type: str) -> bool:
        """Verifica se usuario quer receber este tipo de notificacao"""
        from notifications.models import NotificationType

        mapping = {
            NotificationType.EVENT_INVITE: prefs.notify_event_invites,
            NotificationType.EVENT_REMINDER: prefs.notify_event_reminders,
            NotificationType.EVENT_CONFIRMED: prefs.notify_event_confirmations,
            NotificationType.EVENT_CANCELLED: prefs.notify_event_confirmations,
            NotificationType.AVAILABILITY_RESPONSE: prefs.notify_availability_responses,
        }

        return mapping.get(notification_type, True)


# Singleton
notification_service = NotificationService()

from django.conf import settings
from django.db import models
from django.utils import timezone


class NotificationChannel(models.TextChoices):
    EMAIL = "email", "Email"
    TELEGRAM = "telegram", "Telegram"
    WHATSAPP = "whatsapp", "WhatsApp"
    SMS = "sms", "SMS"


class NotificationType(models.TextChoices):
    EVENT_INVITE = "event_invite", "Convite para Evento"
    EVENT_REMINDER = "event_reminder", "Lembrete de Evento"
    EVENT_CONFIRMED = "event_confirmed", "Evento Confirmado"
    EVENT_CANCELLED = "event_cancelled", "Evento Cancelado"
    AVAILABILITY_RESPONSE = "availability_response", "Resposta de Disponibilidade"
    # Quote Request types
    QUOTE_REQUEST_NEW = "quote_request_new", "Novo Pedido de Orçamento"
    QUOTE_PROPOSAL_RECEIVED = "quote_proposal_received", "Proposta Recebida"
    QUOTE_RESERVATION_CREATED = "quote_reservation_created", "Reserva Criada"
    QUOTE_BOOKING_CONFIRMED = "quote_booking_confirmed", "Reserva Confirmada"


class NotificationPreference(models.Model):
    """
    Preferencias de notificacao por usuario.
    Define canal preferido e configuracoes de cada canal.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preferences"
    )

    # Canal principal preferido
    preferred_channel = models.CharField(
        max_length=20, choices=NotificationChannel.choices, default=NotificationChannel.EMAIL
    )

    # Fallback para email se canal preferido falhar
    fallback_to_email = models.BooleanField(default=True)

    # Configuracoes Telegram
    telegram_chat_id = models.CharField(max_length=100, blank=True, null=True)
    telegram_verified = models.BooleanField(default=False)

    # Configuracoes WhatsApp (futuro)
    whatsapp_number = models.CharField(max_length=20, blank=True, null=True)
    whatsapp_verified = models.BooleanField(default=False)

    # Configuracoes SMS (futuro)
    sms_number = models.CharField(max_length=20, blank=True, null=True)
    sms_verified = models.BooleanField(default=False)

    # Tipos de notificacao habilitados
    notify_event_invites = models.BooleanField(default=True)
    notify_event_reminders = models.BooleanField(default=True)
    notify_event_confirmations = models.BooleanField(default=True)
    notify_availability_responses = models.BooleanField(default=True)
    notify_quote_requests = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Preferencia de Notificacao"
        verbose_name_plural = "Preferencias de Notificacao"

    def __str__(self):
        return f"{self.user.username} - {self.preferred_channel}"

    def get_active_channel(self):
        """Retorna canal ativo e verificado, ou fallback para email"""
        if self.preferred_channel == NotificationChannel.TELEGRAM:
            if self.telegram_chat_id and self.telegram_verified:
                return NotificationChannel.TELEGRAM
        elif self.preferred_channel == NotificationChannel.WHATSAPP:
            if self.whatsapp_number and self.whatsapp_verified:
                return NotificationChannel.WHATSAPP
        elif self.preferred_channel == NotificationChannel.SMS:
            if self.sms_number and self.sms_verified:
                return NotificationChannel.SMS

        # Fallback para email
        return NotificationChannel.EMAIL


class NotificationLog(models.Model):
    """
    Log de todas as notificacoes enviadas.
    Permite auditoria e re-envio se necessario.
    """

    STATUS_CHOICES = [
        ("pending", "Pendente"),
        ("sent", "Enviado"),
        ("delivered", "Entregue"),
        ("failed", "Falhou"),
        ("read", "Lido"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_logs"
    )

    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)

    channel = models.CharField(max_length=20, choices=NotificationChannel.choices)

    # Referencia ao objeto relacionado (Event, Availability, etc)
    content_type = models.CharField(max_length=50, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)

    # Conteudo da mensagem
    subject = models.CharField(max_length=255, blank=True)
    message = models.TextField()

    # Status e rastreamento
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    external_id = models.CharField(max_length=100, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Log de Notificacao"
        verbose_name_plural = "Logs de Notificacao"
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["notification_type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.notification_type} - {self.status}"

    def mark_sent(self, external_id=None):
        self.status = "sent"
        self.sent_at = timezone.now()
        if external_id:
            self.external_id = external_id
        self.save()

    def mark_failed(self, error_message):
        self.status = "failed"
        self.error_message = error_message
        self.save()


class TelegramVerification(models.Model):
    """
    Tokens temporarios para verificacao do Telegram.
    Usuario recebe codigo, envia para o bot, e o sistema verifica.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="telegram_verifications"
    )
    verification_code = models.CharField(max_length=10, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Verificacao Telegram"
        verbose_name_plural = "Verificacoes Telegram"

    def __str__(self):
        return f"{self.user.username} - {self.verification_code}"

    def is_valid(self):
        return not self.used and timezone.now() < self.expires_at

from rest_framework import serializers

from agenda.validators import sanitize_string

from .models import NotificationChannel, NotificationLog, NotificationPreference


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer para preferencias de notificacao"""

    telegram_connected = serializers.SerializerMethodField()
    whatsapp_connected = serializers.SerializerMethodField()
    available_channels = serializers.SerializerMethodField()

    class Meta:
        model = NotificationPreference
        fields = [
            "preferred_channel",
            "fallback_to_email",
            "telegram_chat_id",
            "telegram_verified",
            "telegram_connected",
            "whatsapp_number",
            "whatsapp_verified",
            "whatsapp_connected",
            "notify_event_invites",
            "notify_event_reminders",
            "notify_event_confirmations",
            "notify_availability_responses",
            "available_channels",
            "updated_at",
        ]
        read_only_fields = [
            "telegram_chat_id",
            "telegram_verified",
            "telegram_connected",
            "whatsapp_verified",
            "whatsapp_connected",
            "available_channels",
            "updated_at",
        ]

    def get_telegram_connected(self, obj):
        return bool(obj.telegram_chat_id and obj.telegram_verified)

    def get_whatsapp_connected(self, obj):
        return bool(obj.whatsapp_number and obj.whatsapp_verified)

    def get_available_channels(self, obj):
        """Retorna lista de canais disponiveis com status"""
        from django.conf import settings

        channels = [
            {
                "id": "email",
                "name": "Email",
                "available": True,
                "connected": bool(obj.user.email),
                "configured": bool(getattr(settings, "EMAIL_HOST_USER", "")),
            },
            {
                "id": "telegram",
                "name": "Telegram",
                "available": True,
                "connected": bool(obj.telegram_chat_id and obj.telegram_verified),
                "configured": bool(getattr(settings, "TELEGRAM_BOT_TOKEN", "")),
            },
            {
                "id": "whatsapp",
                "name": "WhatsApp",
                "available": False,  # Futuro
                "connected": bool(obj.whatsapp_number and obj.whatsapp_verified),
                "configured": bool(getattr(settings, "WHATSAPP_SERVICE_URL", "")),
            },
        ]

        return channels

    def validate_whatsapp_number(self, value):
        return sanitize_string(value, max_length=20, allow_empty=True)

    def validate_preferred_channel(self, value):
        return sanitize_string(value, max_length=20, allow_empty=False, to_lower=True)


class NotificationLogSerializer(serializers.ModelSerializer):
    """Serializer para logs de notificacao"""

    class Meta:
        model = NotificationLog
        fields = [
            "id",
            "notification_type",
            "channel",
            "subject",
            "message",
            "status",
            "created_at",
            "sent_at",
        ]
        read_only_fields = fields


class TelegramConnectSerializer(serializers.Serializer):
    """Serializer para resposta de conexao Telegram"""

    code = serializers.CharField(read_only=True)
    bot_username = serializers.CharField(read_only=True)
    expires_in_minutes = serializers.IntegerField(read_only=True)
    instructions = serializers.CharField(read_only=True)


class TelegramDisconnectSerializer(serializers.Serializer):
    """Serializer para desconectar Telegram"""

    success = serializers.BooleanField(read_only=True)
    message = serializers.CharField(read_only=True)

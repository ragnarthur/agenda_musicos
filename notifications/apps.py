from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'
    verbose_name = 'Notificacoes'

    def ready(self):
        # Import signals to register them
        import notifications.signals  # noqa: F401

        # Initialize notification service with providers
        from notifications.services.base import notification_service
        from notifications.providers.email import EmailProvider
        from notifications.providers.telegram import TelegramProvider

        notification_service.register_provider(EmailProvider())
        notification_service.register_provider(TelegramProvider())

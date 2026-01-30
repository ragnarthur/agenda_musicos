from django.urls import path

from .views import (
    NotificationLogListView,
    NotificationPreferenceView,
    TelegramConnectView,
    TelegramDisconnectView,
    TelegramStatusView,
    TelegramWebhookView,
    TestNotificationView,
)

app_name = "notifications"

urlpatterns = [
    # Preferencias
    path("preferences/", NotificationPreferenceView.as_view(), name="preferences"),
    # Historico
    path("logs/", NotificationLogListView.as_view(), name="logs"),
    # Telegram
    path("telegram/connect/", TelegramConnectView.as_view(), name="telegram-connect"),
    path("telegram/disconnect/", TelegramDisconnectView.as_view(), name="telegram-disconnect"),
    path("telegram/status/", TelegramStatusView.as_view(), name="telegram-status"),
    path("telegram/webhook/", TelegramWebhookView.as_view(), name="telegram-webhook"),
    # Debug (apenas em desenvolvimento)
    path("test/", TestNotificationView.as_view(), name="test"),
]

from django.contrib import admin

from .models import NotificationLog, NotificationPreference, TelegramVerification


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "preferred_channel",
        "telegram_verified",
        "fallback_to_email",
        "updated_at",
    ]
    list_filter = ["preferred_channel", "telegram_verified", "fallback_to_email"]
    search_fields = ["user__username", "user__email", "telegram_chat_id"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ["user", "notification_type", "channel", "status", "created_at", "sent_at"]
    list_filter = ["notification_type", "channel", "status"]
    search_fields = ["user__username", "subject", "message"]
    readonly_fields = ["created_at", "sent_at", "delivered_at", "read_at"]
    date_hierarchy = "created_at"


@admin.register(TelegramVerification)
class TelegramVerificationAdmin(admin.ModelAdmin):
    list_display = ["user", "verification_code", "used", "expires_at", "created_at"]
    list_filter = ["used"]
    search_fields = ["user__username", "verification_code"]
    readonly_fields = ["created_at"]

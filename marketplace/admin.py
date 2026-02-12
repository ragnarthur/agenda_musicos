from django.contrib import admin

from .models import Gig, GigApplication, GigChatMessage


@admin.register(Gig)
class GigAdmin(admin.ModelAdmin):
    list_display = ("title", "city", "event_date", "status", "created_by", "created_at")
    list_filter = ("status", "city")
    search_fields = ("title", "description", "city", "contact_name")


@admin.register(GigApplication)
class GigApplicationAdmin(admin.ModelAdmin):
    list_display = ("gig", "musician", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("gig__title", "musician__user__first_name", "musician__user__last_name")


@admin.register(GigChatMessage)
class GigChatMessageAdmin(admin.ModelAdmin):
    list_display = ("gig", "application", "sender", "created_at")
    list_filter = ("created_at",)
    search_fields = ("gig__title", "sender__username", "message")

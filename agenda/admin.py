# agenda/admin.py
from django.contrib import admin
from .models import Musician, Event, Availability


@admin.register(Musician)
class MusicianAdmin(admin.ModelAdmin):
    list_display = ['user', 'instrument', 'role', 'phone', 'is_active', 'created_at']
    list_filter = ['instrument', 'role', 'is_active']
    search_fields = ['user__first_name', 'user__last_name', 'user__username']
    list_editable = ['is_active']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('user', 'instrument', 'role', 'is_active')
        }),
        ('Detalhes', {
            'fields': ('bio', 'phone')
        }),
    )


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'event_date', 'start_time', 'location', 
        'status', 'created_by', 'approved_by'
    ]
    list_filter = ['status', 'event_date', 'created_at']
    search_fields = ['title', 'location', 'description']
    date_hierarchy = 'event_date'
    readonly_fields = ['start_datetime', 'end_datetime', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Informações do Evento', {
            'fields': ('title', 'description', 'location', 'venue_contact')
        }),
        ('Data e Hora', {
            'fields': (
                'event_date', 'start_time', 'end_time',
                'start_datetime', 'end_datetime'
            )
        }),
        ('Financeiro', {
            'fields': ('payment_amount',),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': (
                'status', 'created_by', 'approved_by', 
                'approved_at', 'rejection_reason'
            )
        }),
        ('Metadados', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Auto-set created_by if not set"""
        if not obj.pk and not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = [
        'musician', 'event', 'response', 'responded_at', 'updated_at'
    ]
    list_filter = ['response', 'event__status', 'event__event_date']
    search_fields = [
        'musician__user__first_name', 
        'musician__user__last_name',
        'event__title'
    ]
    readonly_fields = ['responded_at', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Disponibilidade', {
            'fields': ('musician', 'event', 'response', 'notes')
        }),
        ('Metadados', {
            'fields': ('responded_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
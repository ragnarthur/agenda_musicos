# agenda/audit.py
"""
Auditoria para ações críticas no sistema.
"""

from django.db import models
from django.contrib.auth.models import User


class AuditLog(models.Model):
    """
    Log de auditoria para ações críticas.

    Rastrea ações sensíveis como:
    - Deleção de eventos
    - Atualização de dados sensíveis
    - Deleção de músicos
    """

    ACTION_CHOICES = [
        ("event_delete", "Evento Deletado"),
        ("event_update_sensitive", "Evento Atualizado (Dados Sensíveis)"),
        ("availability_delete", "Disponibilidade Deletada"),
        ("profile_update_sensitive", "Perfil Atualizado (Dados Sensíveis)"),
        ("musician_delete", "Músico Deletado"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    resource_type = models.CharField(
        max_length=50, help_text="Tipo do recurso afetado (event, musician, etc.)"
    )
    resource_id = models.PositiveIntegerField(help_text="ID do recurso afetado")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, max_length=500)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "timestamp"], name="auditlog_user_ts_idx"),
            models.Index(
                fields=["resource_type", "resource_id"],
                name="auditlog_resource_idx",
            ),
            models.Index(fields=["action"], name="auditlog_action_idx"),
        ]
        ordering = ["-timestamp"]
        verbose_name = "Log de Auditoria"
        verbose_name_plural = "Logs de Auditoria"

    def __str__(self):
        user_display = self.user.username if self.user else "Sistema"
        return f"{self.get_action_display()} - {self.resource_type}:{self.resource_id} - {user_display}"

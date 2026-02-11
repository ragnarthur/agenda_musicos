from django.contrib.auth.models import User
from django.db import models

from agenda.models import Musician, Organization


class Gig(models.Model):
    """
    Marketplace: oportunidade de show/vaga publicada por um cliente.
    Músicos freelancers podem se candidatar.
    """

    STATUS_CHOICES = [
        ("open", "Aberta"),
        ("in_review", "Em avaliação"),
        ("hired", "Contratada"),
        ("closed", "Encerrada"),
        ("cancelled", "Cancelada"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=200, blank=True)
    event_date = models.DateField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    contact_name = models.CharField(max_length=100, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    genres = models.CharField(
        max_length=120, blank=True, help_text="Estilos desejados (ex: pop, sertanejo)"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="gigs", null=True, blank=True
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="gigs_posted"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Oportunidade"
        verbose_name_plural = "Oportunidades"

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


class GigApplication(models.Model):
    """
    Candidatura de um músico freelancer a uma oportunidade (Gig).
    """

    STATUS_CHOICES = [
        ("pending", "Pendente"),
        ("hired", "Contratado"),
        ("rejected", "Recusado"),
    ]

    gig = models.ForeignKey(Gig, on_delete=models.CASCADE, related_name="applications")
    musician = models.ForeignKey(
        Musician, on_delete=models.CASCADE, related_name="gig_applications"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="gig_applications",
        null=True,
        blank=True,
    )
    cover_letter = models.TextField(blank=True)
    expected_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("gig", "musician")
        ordering = ["-created_at"]
        verbose_name = "Candidatura"
        verbose_name_plural = "Candidaturas"

    def __str__(self):
        return f"{self.musician} em {self.gig}"


class GigChatMessage(models.Model):
    """
    Chat curto entre criador da vaga e músico contratado.
    """

    gig = models.ForeignKey(Gig, on_delete=models.CASCADE, related_name="chat_messages")
    sender = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="gig_chat_messages_sent"
    )
    message = models.CharField(max_length=600)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Mensagem do chat da vaga"
        verbose_name_plural = "Mensagens do chat da vaga"

    def __str__(self):
        return f"Chat #{self.gig_id} - {self.sender.username}"


# Create your models here.

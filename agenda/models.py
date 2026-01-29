# agenda/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.conf import settings
from datetime import datetime
import re
import unicodedata


class Instrument(models.Model):
    """Instrumento musical disponível no sistema."""

    # Nome normalizado (lowercase, sem acentos) - chave única
    name = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Nome normalizado do instrumento (ex: 'violao')"
    )

    # Nome de exibição (com formatação original)
    display_name = models.CharField(
        max_length=50,
        help_text="Nome formatado para exibição (ex: 'Violão')"
    )

    # Tipo do instrumento
    INSTRUMENT_TYPE_CHOICES = [
        ('predefined', 'Pré-definido'),  # Instrumentos oficiais do sistema
        ('community', 'Comunidade'),     # Criados por usuários
    ]
    type = models.CharField(
        max_length=20,
        choices=INSTRUMENT_TYPE_CHOICES,
        default='community'
    )

    # Estatísticas de uso
    usage_count = models.PositiveIntegerField(
        default=0,
        help_text="Quantos músicos usam este instrumento"
    )

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='instruments_created',
        help_text="Usuário que adicionou este instrumento (se community)"
    )

    # Moderação
    is_approved = models.BooleanField(
        default=True,
        help_text="Se False, precisa aprovação de admin"
    )

    class Meta:
        ordering = ['-usage_count', 'display_name']
        verbose_name = 'Instrumento'
        verbose_name_plural = 'Instrumentos'

    def __str__(self):
        return self.display_name

    @staticmethod
    def normalize_name(name: str) -> str:
        """Normaliza nome do instrumento (lowercase, sem acentos)."""
        name = name.strip().lower()
        # Remove acentos
        name = unicodedata.normalize('NFKD', name)
        name = ''.join([c for c in name if not unicodedata.combining(c)])
        # Remove caracteres especiais (mantém apenas letras, números, espaços, hífens)
        name = re.sub(r'[^a-z0-9\s\-]', '', name)
        # Substitui múltiplos espaços por um único
        name = re.sub(r'\s+', ' ', name)
        return name

    def increment_usage(self):
        """Incrementa contador de uso."""
        self.usage_count = models.F('usage_count') + 1
        self.save(update_fields=['usage_count'])
        # Refresh para ter o valor atualizado
        self.refresh_from_db()


class Organization(models.Model):
    """
    Organização/grupo que utiliza o sistema.
    Controla escopo de dados e assinatura.
    Suporta bandas, empresas contratantes e casas de shows.
    """

    ORG_TYPE_CHOICES = [
        ("band", "Banda/Grupo"),
        ("company", "Empresa"),
        ("venue", "Casa de Shows"),
    ]

    SPONSOR_TIER_CHOICES = [
        ("bronze", "Bronze"),
        ("silver", "Prata"),
        ("gold", "Ouro"),
    ]

    name = models.CharField(max_length=150, unique=True)
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_organizations",
    )
    # Tipo de organização
    org_type = models.CharField(
        max_length=20,
        choices=ORG_TYPE_CHOICES,
        default="band",
        help_text="Tipo de organização",
    )

    # Dados da empresa
    description = models.TextField(
        blank=True, null=True, help_text="Descrição da empresa/organização"
    )
    logo = models.ImageField(
        upload_to="org_logos/", blank=True, null=True, help_text="Logo da organização"
    )
    website = models.URLField(blank=True, null=True, help_text="Site da empresa")
    phone = models.CharField(
        max_length=20, blank=True, null=True, help_text="Telefone de contato"
    )
    contact_email = models.EmailField(
        blank=True, null=True, help_text="Email de contato"
    )
    contact_name = models.CharField(
        max_length=150, blank=True, null=True, help_text="Nome do responsável"
    )

    # Localização
    city = models.CharField(max_length=100, blank=True, null=True, help_text="Cidade")
    state = models.CharField(max_length=2, blank=True, null=True, help_text="UF")

    # Patrocínio
    is_sponsor = models.BooleanField(
        default=False, help_text="É patrocinador da plataforma"
    )
    sponsor_tier = models.CharField(
        max_length=20,
        choices=SPONSOR_TIER_CHOICES,
        blank=True,
        null=True,
        help_text="Nível de patrocínio",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Organização"
        verbose_name_plural = "Organizações"

    def __str__(self):
        return self.name

    def is_company(self):
        """Verifica se é uma empresa contratante"""
        return self.org_type == "company"

    def is_venue(self):
        """Verifica se é uma casa de shows"""
        return self.org_type == "venue"


class Membership(models.Model):
    """
    Associação de usuários a uma organização.
    """

    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("admin", "Admin"),
        ("member", "Member"),
    ]

    STATUS_CHOICES = [
        ("active", "Ativo"),
        ("invited", "Convidado"),
        ("suspended", "Suspenso"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "organization")
        ordering = ["organization__name", "user__username"]
        verbose_name = "Membro da organização"
        verbose_name_plural = "Membros das organizações"

    def __str__(self):
        return f"{self.user.username} em {self.organization.name}"


class Musician(models.Model):
    """
    Modelo para representar músicos da plataforma.
    Separado do User para permitir extensões futuras sem mexer no auth.
    """

    # Lista de referência usada em seeds; instrumentos agora podem ser livres
    INSTRUMENT_CHOICES = [
        ("vocal", "Vocal"),
        ("guitar", "Guitarra"),
        ("bass", "Baixo"),
        ("drums", "Bateria"),
        ("keyboard", "Teclado"),
        ("percussion", "Percussão/Outros"),
    ]

    ROLE_CHOICES = [
        ("member", "Membro"),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="musician_profile"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="musicians",
        null=True,
        blank=True,
    )
    instrument = models.CharField(
        max_length=50, help_text="Instrumento principal do músico"
    )
    instruments = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de instrumentos (multi-instrumentista)",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")
    bio = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    instagram = models.CharField(max_length=100, blank=True, null=True)
    whatsapp = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="WhatsApp com máscara (11) 99999-9999",
    )
    avatar = models.ImageField(
        upload_to="avatars/",
        blank=True,
        null=True,
        help_text="Foto de perfil do músico",
    )
    cover_image = models.ImageField(
        upload_to="covers/", blank=True, null=True, help_text="Imagem de capa do perfil"
    )
    base_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(0, message="Valor do cachê não pode ser negativo.")
        ],
        help_text="Valor base de cachê do músico",
    )
    travel_fee_per_km = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[
            MinValueValidator(0, message="Valor por km não pode ser negativo.")
        ],
        help_text="Valor cobrado por km deslocado",
    )
    equipment_items = models.JSONField(
        default=list, blank=True, help_text="Lista de equipamentos/serviços com valores"
    )
    city = models.CharField(
        max_length=100, blank=True, null=True, help_text="Cidade onde o músico reside"
    )
    state = models.CharField(
        max_length=2, blank=True, null=True, help_text="UF (sigla do estado)"
    )
    is_active = models.BooleanField(default=True)

    # Campos de rating (agregados/cached)
    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        help_text="Média de avaliações recebidas (1-5)",
    )
    total_ratings = models.PositiveIntegerField(
        default=0, help_text="Total de avaliações recebidas"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["user__first_name"]
        verbose_name = "Músico"
        verbose_name_plural = "Músicos"

    def get_instrument_label(self):
        """Retorna label do instrumento, com fallback para valores customizados."""
        if not self.instrument:
            return "Sem instrumento"
        labels = dict(self.INSTRUMENT_CHOICES)
        return labels.get(self.instrument, self.instrument)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.get_instrument_label()}"

    def is_leader(self):
        """Compat: liderança foi descontinuada na plataforma."""
        return False


class Event(models.Model):
    """
    Representa uma proposta de evento/show na agenda.
    Músicos criam propostas e confirmam por aceite de convites.
    """

    STATUS_CHOICES = [
        ("proposed", "Proposta Enviada"),
        ("approved", "Confirmado"),
        ("rejected", "Rejeitado"),
        ("confirmed", "Confirmado"),
        ("cancelled", "Cancelado"),
    ]

    title = models.CharField(max_length=200, help_text="Nome do evento/show")
    description = models.TextField(
        blank=True, null=True, help_text="Detalhes do evento"
    )
    location = models.CharField(max_length=300, help_text="Local do show")
    venue_contact = models.CharField(
        max_length=200, blank=True, null=True, help_text="Contato do local"
    )
    payment_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Valor do cachê",
        validators=[MinValueValidator(0, message="Valor do cachê não pode ser negativo.")],
    )

    # Datas
    event_date = models.DateField(help_text="Data do evento")
    start_time = models.TimeField(help_text="Hora de início")
    end_time = models.TimeField(help_text="Hora de término")

    # Para facilitar queries (combinação de date + time)
    start_datetime = models.DateTimeField(help_text="Data/hora início completa")
    end_datetime = models.DateTimeField(help_text="Data/hora fim completa")

    # Show solo (confirmação automática)
    is_solo = models.BooleanField(
        default=False, help_text="Indica se é um show solo (confirmação automática)"
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="proposed")

    # Escopo da organização
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="events",
        null=True,
        blank=True,
    )

    # Quem criou a proposta
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        db_index=True,
        related_name="created_events",
    )

    # Quem confirmou (legado)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_events",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    # Motivo da rejeição
    rejection_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-event_date", "-start_time"]
        verbose_name = "Evento"
        verbose_name_plural = "Eventos"
        indexes = [
            models.Index(fields=["event_date", "status"]),
            models.Index(fields=["status"]),
        ]

    def clean(self):
        """Validações customizadas"""
        errors = {}

        # Valida horários
        # Nota: end_time <= start_time é permitido para eventos noturnos que cruzam meia-noite
        # Exemplo: 23:00 - 02:00 (evento termina no dia seguinte)
        if self.start_time and self.end_time:
            if self.end_time == self.start_time:
                # Evento com duração zero não é permitido
                errors["end_time"] = (
                    "Evento deve ter duração mínima. Horário de término não pode ser igual ao início."
                )

        # Valida data (não pode ser no passado para novas propostas)
        if self.event_date and not self.pk:  # Apenas na criação
            if self.event_date < timezone.now().date():
                errors["event_date"] = (
                    "Não é possível criar eventos com datas passadas."
                )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """Combina date + time em datetime antes de salvar"""
        from datetime import timedelta

        if self.event_date and self.start_time:
            self.start_datetime = timezone.make_aware(
                datetime.combine(self.event_date, self.start_time)
            )

        if self.event_date and self.end_time:
            # Detecta se evento cruza meia-noite (end_time <= start_time)
            if self.end_time <= self.start_time:
                # Evento cruza meia-noite - adiciona 1 dia ao end_datetime
                end_date = self.event_date + timedelta(days=1)
            else:
                end_date = self.event_date

            self.end_datetime = timezone.make_aware(
                datetime.combine(end_date, self.end_time)
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} - {self.event_date.strftime('%d/%m/%Y')} - {self.get_status_display()}"

    def can_be_approved(self):
        """Compat: aprovação foi substituída por confirmação via convites."""
        return self.status == "proposed"

    def approve(self, user):
        """Compat: confirma evento quando for necessário manter chamadas antigas."""
        if self.can_be_approved():
            self.status = "confirmed"
            self.approved_by = user
            self.approved_at = timezone.now()
            self.save()
            return True
        return False

    def reject(self, user, reason=""):
        """Rejeita o evento (legado)"""
        if self.can_be_approved():
            self.status = "rejected"
            self.approved_by = user
            self.approved_at = timezone.now()
            self.rejection_reason = reason
            self.save()
            return True
        return False


class EventLog(models.Model):
    """
    Registro de ações relevantes em um evento.
    Usado para histórico/auditoria no detalhe do evento.
    """

    ACTION_CHOICES = [
        ("created", "Criado"),
        ("approved", "Aprovado"),
        ("rejected", "Rejeitado"),
        ("cancelled", "Cancelado"),
        ("availability", "Disponibilidade"),
        ("notification", "Notificacao"),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="logs")
    performed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Log de Evento"
        verbose_name_plural = "Logs de Evento"
        indexes = [
            models.Index(fields=["event", "created_at"]),
        ]

    def __str__(self):
        user = self.performed_by.get_full_name() if self.performed_by else "Sistema"
        return f"{self.get_action_display()} - {user} ({self.created_at})"


class Availability(models.Model):
    """
    Disponibilidade de cada músico para eventos.
    Criada automaticamente quando um evento é proposto.
    """

    RESPONSE_CHOICES = [
        ("pending", "Pendente"),  # Ainda não respondeu
        ("available", "Disponível"),  # Pode tocar
        ("unavailable", "Indisponível"),  # Não pode
        ("maybe", "Talvez"),  # Depende
    ]

    musician = models.ForeignKey(
        Musician, on_delete=models.CASCADE, related_name="availabilities"
    )
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="availabilities"
    )
    response = models.CharField(
        max_length=20, choices=RESPONSE_CHOICES, default="pending", db_index=True
    )
    notes = models.TextField(
        blank=True, null=True, help_text="Observações sobre a disponibilidade"
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["musician", "event"]
        ordering = ["event__event_date", "musician__user__first_name"]
        verbose_name = "Disponibilidade"
        verbose_name_plural = "Disponibilidades"

    def __str__(self):
        return f"{self.musician} - {self.event.title} - {self.get_response_display()}"

    def save(self, *args, **kwargs):
        """Atualiza responded_at quando muda de pending"""
        if self.response != "pending" and not self.responded_at:
            self.responded_at = timezone.now()
        super().save(*args, **kwargs)


class LeaderAvailability(models.Model):
    """
    Datas e horários disponíveis cadastrados por cada músico.
    Outros músicos podem visualizar quando marcado como público.
    Regra: mínimo 40 minutos entre eventos.
    """

    leader = models.ForeignKey(
        Musician,
        on_delete=models.CASCADE,
        related_name="leader_availabilities",
        help_text="Músico que cadastrou a disponibilidade",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="leader_availabilities",
        null=True,
        blank=True,
    )
    date = models.DateField(help_text="Data disponível")
    start_time = models.TimeField(help_text="Hora de início da disponibilidade")
    end_time = models.TimeField(help_text="Hora de término da disponibilidade")
    notes = models.TextField(
        blank=True, null=True, help_text="Observações sobre a disponibilidade"
    )

    # Para facilitar queries
    start_datetime = models.DateTimeField(help_text="Data/hora início completa")
    end_datetime = models.DateTimeField(help_text="Data/hora fim completa")

    is_public = models.BooleanField(
        default=False,
        help_text="Indica se outros músicos podem ver esta disponibilidade",
    )
    is_active = models.BooleanField(
        default=True, help_text="Se False, a disponibilidade foi removida/cancelada"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "start_time"]
        verbose_name = "Disponibilidade"
        verbose_name_plural = "Disponibilidades"
        indexes = [
            models.Index(fields=["date", "is_active"]),
            models.Index(fields=["leader", "date"]),
        ]

    def clean(self):
        """Validações customizadas"""
        errors = {}

        # Valida horários
        if self.start_time and self.end_time:
            if self.end_time == self.start_time:
                errors["end_time"] = "Horário de término deve ser posterior ao início."

        # Valida data (não pode ser no passado)
        if self.date and self.date < timezone.now().date():
            errors["date"] = (
                "Não é possível cadastrar disponibilidades em datas passadas."
            )

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """Combina date + time em datetime antes de salvar"""
        errors = {}

        # Garantir que date é um objeto date, não string
        if isinstance(self.date, str):
            from datetime import date as date_cls

            try:
                self.date = date_cls.fromisoformat(self.date)
            except ValueError:
                errors["date"] = "Formato inválido. Use YYYY-MM-DD."

        # Garantir que times são objetos time, não strings
        if isinstance(self.start_time, str):
            from datetime import time as time_cls

            try:
                parts = self.start_time.split(":")
                self.start_time = time_cls(int(parts[0]), int(parts[1]))
            except Exception:
                errors["start_time"] = "Formato inválido. Use HH:MM."

        if isinstance(self.end_time, str):
            from datetime import time as time_cls

            try:
                parts = self.end_time.split(":")
                self.end_time = time_cls(int(parts[0]), int(parts[1]))
            except Exception:
                errors["end_time"] = "Formato inválido. Use HH:MM."

        if errors:
            raise ValidationError(errors)

        if self.date and self.start_time:
            self.start_datetime = timezone.make_aware(
                datetime.combine(self.date, self.start_time)
            )
        if self.date and self.end_time:
            from datetime import timedelta as td

            # Se end_time <= start_time, disponibilidade cruza meia-noite e vai para o dia seguinte
            end_date = (
                self.date + td(days=1)
                if self.start_time and self.end_time <= self.start_time
                else self.date
            )
            self.end_datetime = timezone.make_aware(
                datetime.combine(end_date, self.end_time)
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.leader.user.get_full_name()} - {self.date.strftime('%d/%m/%Y')} {self.start_time.strftime('%H:%M')}-{self.end_time.strftime('%H:%M')}"

    def get_conflicting_events(self):
        """
        Retorna eventos que conflitam com esta disponibilidade.
        Considera buffer de 40 minutos entre eventos.
        """
        from datetime import timedelta

        # Adiciona buffer de 40 minutos antes e depois
        buffer = timedelta(minutes=40)
        buffer_start = self.start_datetime - buffer
        buffer_end = self.end_datetime + buffer

        # Busca eventos que sobrepõem com o período (incluindo buffer), mesmo que cruzem datas
        conflicting_events = Event.objects.filter(
            status__in=["proposed", "approved", "confirmed"]
        ).filter(
            models.Q(start_datetime__lt=buffer_end)
            & models.Q(end_datetime__gt=buffer_start)
        )

        org = self.organization or getattr(self.leader, "organization", None)
        if org:
            conflicting_events = conflicting_events.filter(organization=org)
        elif self.leader_id:
            conflicting_events = conflicting_events.filter(created_by=self.leader.user)

        return conflicting_events

    def has_conflicts(self):
        """Verifica se há eventos conflitantes"""
        return self.get_conflicting_events().exists()


class EventInstrument(models.Model):
    """
    Instrumentos necessários para um evento.
    Permite especificar quantidade de cada instrumento.
    """

    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="required_instruments"
    )
    instrument = models.CharField(
        max_length=50, help_text="Tipo de instrumento necessário"
    )
    quantity = models.PositiveIntegerField(
        default=1, help_text="Quantidade de músicos deste instrumento"
    )

    class Meta:
        unique_together = ["event", "instrument"]
        ordering = ["instrument"]
        verbose_name = "Instrumento do Evento"
        verbose_name_plural = "Instrumentos do Evento"

    def __str__(self):
        return f"{self.event.title} - {self.quantity}x {self.get_instrument_label()}"

    def get_instrument_label(self):
        """Retorna label do instrumento, com fallback para valores customizados."""
        labels = dict(Musician.INSTRUMENT_CHOICES)
        return labels.get(self.instrument, self.instrument)


class MusicianRating(models.Model):
    """
    Avaliação de músico após um evento.
    Apenas o criador do evento pode avaliar.
    Escala de 1-5 estrelas.
    """

    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="ratings",
        help_text="Evento relacionado à avaliação",
    )
    musician = models.ForeignKey(
        Musician,
        on_delete=models.CASCADE,
        related_name="ratings_received",
        help_text="Músico avaliado",
    )
    rated_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="ratings_given",
        help_text="Usuário que fez a avaliação",
    )
    rating = models.PositiveIntegerField(
        choices=RATING_CHOICES, help_text="Nota de 1 a 5 estrelas"
    )
    comment = models.TextField(
        blank=True, null=True, help_text="Comentário opcional sobre o músico"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["event", "musician", "rated_by"]
        ordering = ["-created_at"]
        verbose_name = "Avaliação de Músico"
        verbose_name_plural = "Avaliações de Músicos"
        indexes = [
            models.Index(fields=["musician", "rating"]),
        ]

    def __str__(self):
        return f"{self.musician} - {self.rating} estrelas - {self.event.title}"

    def save(self, *args, **kwargs):
        """Atualiza estatísticas do músico ao salvar"""
        super().save(*args, **kwargs)
        self._update_musician_stats()

    def delete(self, *args, **kwargs):
        """Atualiza estatísticas do músico ao deletar"""
        musician = self.musician
        super().delete(*args, **kwargs)
        self._update_musician_stats(musician)

    def _update_musician_stats(self, musician=None):
        """Recalcula média e total de avaliações do músico"""
        from django.db.models import Avg

        musician = musician or self.musician
        stats = MusicianRating.objects.filter(musician=musician).aggregate(
            avg=Avg("rating"), total=models.Count("id")
        )
        musician.average_rating = stats["avg"] or 0
        musician.total_ratings = stats["total"] or 0
        musician.save(update_fields=["average_rating", "total_ratings"])


class Connection(models.Model):
    """
    Relações entre músicos: seguir, salvar para ligar depois, indicar e "já toquei com".

    Solução FINAL (nível banco):
      - UniqueConstraint garante que não existe duplicata do mesmo:
        (follower, target, connection_type)
      - Índices melhoram listagens (dashboard/perfil)
    """

    CONNECTION_TYPES = [
        ("follow", "Seguir favorito"),
        ("call_later", "Ligar depois"),
        ("recommend", "Indicar para vaga"),
        ("played_with", "Já toquei com"),
    ]

    follower = models.ForeignKey(
        Musician,
        on_delete=models.CASCADE,
        related_name="connections_from",
        help_text="Músico que iniciou a conexão",
        db_index=True,
    )
    target = models.ForeignKey(
        Musician,
        on_delete=models.CASCADE,
        related_name="connections_to",
        help_text="Músico alvo da conexão",
        db_index=True,
    )
    connection_type = models.CharField(
        max_length=20,
        choices=CONNECTION_TYPES,
        default="follow",
        db_index=True,
    )
    verified = models.BooleanField(
        default=False, help_text='Marcação de "já toquei com" confirmada'
    )
    notes = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Conexão de Músico"
        verbose_name_plural = "Conexões de Músico"
        constraints = [
            models.UniqueConstraint(
                fields=["follower", "target", "connection_type"],
                name="uniq_connection_follower_target_type",
            )
        ]
        indexes = [
            models.Index(fields=["follower", "created_at"]),
            models.Index(fields=["target", "created_at"]),
            models.Index(fields=["follower", "target"]),
        ]

    def __str__(self):
        return f"{self.follower} -> {self.target} ({self.connection_type})"


class MusicianBadge(models.Model):
    """
    Badge/conquista atribuída a um músico.
    As definições estão no código e só guardamos slug/nome/descrição no momento da premiação.
    """

    musician = models.ForeignKey(
        Musician, on_delete=models.CASCADE, related_name="badges"
    )
    slug = models.CharField(
        max_length=50, help_text="Identificador da badge (ex: first_show)"
    )
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True, null=True)
    icon = models.CharField(
        max_length=10, blank=True, null=True, help_text="Emoji opcional"
    )
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("musician", "slug")]
        ordering = ["-awarded_at"]
        verbose_name = "Badge de Músico"
        verbose_name_plural = "Badges de Músico"

    def __str__(self):
        return f"{self.musician} - {self.name}"


class MusicianRequest(models.Model):
    """
    Solicitação de acesso de músico.
    Músicos solicitam acesso e admin aprova manualmente.
    Quando aprovado, um convite com token é enviado por email.
    """

    STATUS_CHOICES = [
        ("pending", "Pendente"),
        ("approved", "Aprovado"),
        ("rejected", "Rejeitado"),
    ]

    # Dados básicos
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)

    # Dados musicais
    instrument = models.CharField(max_length=100, help_text="Instrumento principal")
    instruments = models.JSONField(
        default=list, blank=True, help_text="Lista de instrumentos"
    )
    bio = models.TextField(blank=True, null=True)

    # Localização
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)

    # Redes sociais (para validação)
    instagram = models.CharField(max_length=100, blank=True, null=True)

    # Status e controle
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    admin_notes = models.TextField(
        blank=True, null=True, help_text="Notas do admin sobre a solicitação"
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_musician_requests",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Token de convite (gerado quando aprovado)
    invite_token = models.CharField(max_length=64, unique=True, null=True, blank=True)
    invite_expires_at = models.DateTimeField(null=True, blank=True)
    invite_used = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Solicitação de Músico"
        verbose_name_plural = "Solicitações de Músicos"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["invite_token"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.email}) - {self.get_status_display()}"

    def approve(self, admin_user, notes=None):
        """Aprova a solicitação e gera token de convite"""
        import secrets
        from datetime import timedelta

        self.status = "approved"
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        self.invite_token = secrets.token_urlsafe(32)
        self.invite_expires_at = timezone.now() + timedelta(days=7)
        self.admin_notes = notes if notes else self.admin_notes
        self.save()
        return self.invite_token

    def reject(self, admin_user, notes=None):
        """Rejeita a solicitação"""
        self.status = "rejected"
        self.reviewed_by = admin_user
        self.reviewed_at = timezone.now()
        if notes:
            self.admin_notes = notes
        self.save()

    def is_invite_valid(self):
        """Verifica se o convite ainda é válido"""
        if not self.invite_token:
            return False
        if self.invite_used:
            return False
        if self.invite_expires_at and timezone.now() > self.invite_expires_at:
            return False
        return self.status == "approved"

    def mark_invite_used(self):
        """Marca o convite como usado"""
        self.invite_used = True
        self.save(update_fields=["invite_used"])


class ContactRequest(models.Model):
    """
    Solicitação de contato/orçamento de empresa para músico.
    Empresas podem enviar mensagens para músicos.
    """

    STATUS_CHOICES = [
        ("pending", "Pendente"),
        ("read", "Lido"),
        ("replied", "Respondido"),
        ("archived", "Arquivado"),
    ]

    # Quem enviou
    from_organization = models.ForeignKey(
        "Organization", on_delete=models.CASCADE, related_name="sent_contact_requests"
    )
    from_user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sent_contact_requests"
    )

    # Para quem
    to_musician = models.ForeignKey(
        "Musician", on_delete=models.CASCADE, related_name="received_contact_requests"
    )

    # Conteúdo
    subject = models.CharField(max_length=200, help_text="Assunto da mensagem")
    message = models.TextField(help_text="Mensagem/descrição do evento")
    event_date = models.DateField(
        null=True, blank=True, help_text="Data do evento (opcional)"
    )
    event_location = models.CharField(
        max_length=200, blank=True, null=True, help_text="Local do evento"
    )
    budget_range = models.CharField(
        max_length=100, blank=True, null=True, help_text="Faixa de orçamento"
    )

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    # Resposta do músico
    reply_message = models.TextField(blank=True, null=True)
    replied_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Solicitação de Contato"
        verbose_name_plural = "Solicitações de Contato"
        indexes = [
            models.Index(fields=["to_musician", "status"]),
            models.Index(fields=["from_organization", "created_at"]),
        ]

    def __str__(self):
        return f"{self.from_organization.name} -> {self.to_musician}: {self.subject}"

    def mark_as_read(self):
        """Marca como lido"""
        if self.status == "pending":
            self.status = "read"
            self.save(update_fields=["status", "updated_at"])

    def reply(self, message):
        """Músico responde à solicitação"""
        self.reply_message = message
        self.replied_at = timezone.now()
        self.status = "replied"
        self.save()

    def archive(self):
        """Arquiva a solicitação"""
        self.status = "archived"
        self.save(update_fields=["status", "updated_at"])


# PendingRegistration model removido - agora usamos MusicianRequest com aprovação admin

# agenda/models.py
import re
import unicodedata
from datetime import datetime

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone


def _current_month_start():
    """Retorna o primeiro dia do mes atual (timezone-aware)."""
    today = timezone.now().date()
    return today.replace(day=1)


class Instrument(models.Model):
    """Instrumento musical disponível no sistema."""

    # Nome normalizado (lowercase, sem acentos) - chave única
    name = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Nome normalizado do instrumento (ex: 'violao')",
    )

    # Nome de exibição (com formatação original)
    display_name = models.CharField(
        max_length=50, help_text="Nome formatado para exibição (ex: 'Violão')"
    )

    # Tipo do instrumento
    INSTRUMENT_TYPE_CHOICES = [
        ("predefined", "Pré-definido"),  # Instrumentos oficiais do sistema
        ("community", "Comunidade"),  # Criados por usuários
    ]
    type = models.CharField(max_length=20, choices=INSTRUMENT_TYPE_CHOICES, default="community")

    # Estatísticas de uso
    usage_count = models.PositiveIntegerField(
        default=0, help_text="Quantos músicos usam este instrumento"
    )

    # Auditoria
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="instruments_created",
        help_text="Usuário que adicionou este instrumento (se community)",
    )

    # Moderação
    is_approved = models.BooleanField(
        default=True, help_text="Se False, precisa aprovação de admin"
    )

    class Meta:
        ordering = ["-usage_count", "display_name"]
        verbose_name = "Instrumento"
        verbose_name_plural = "Instrumentos"

    def __str__(self):
        return self.display_name

    @staticmethod
    def normalize_name(name: str) -> str:
        """Normaliza nome do instrumento (lowercase, sem acentos)."""
        name = name.strip().lower()
        # Remove acentos
        name = unicodedata.normalize("NFKD", name)
        name = "".join([c for c in name if not unicodedata.combining(c)])
        # Remove caracteres especiais (mantém apenas letras, números, espaços, hífens)
        name = re.sub(r"[^a-z0-9\s\-]", "", name)
        # Substitui múltiplos espaços por um único
        name = re.sub(r"\s+", " ", name)
        return name

    def increment_usage(self):
        """Incrementa contador de uso."""
        type(self).objects.filter(pk=self.pk).update(usage_count=models.F("usage_count") + 1)
        # Refresh apenas do campo alterado para reduzir janela de leitura inconsistente.
        self.refresh_from_db(fields=["usage_count"])


class Organization(models.Model):
    """
    Organização/grupo que utiliza o sistema.
    Controla escopo de dados e assinatura.
    Suporta bandas, contratantes e casas de shows.
    """

    ORG_TYPE_CHOICES = [
        ("band", "Banda/Grupo"),
        ("company", "Contratante"),
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

    # Dados da organização
    description = models.TextField(blank=True, null=True, help_text="Descrição da organização")
    logo = models.ImageField(
        upload_to="org_logos/", blank=True, null=True, help_text="Logo da organização"
    )
    website = models.URLField(blank=True, null=True, help_text="Site da organização")
    phone = models.CharField(max_length=20, blank=True, null=True, help_text="Telefone de contato")
    contact_email = models.EmailField(blank=True, null=True, help_text="Email de contato")
    contact_name = models.CharField(
        max_length=150, blank=True, null=True, help_text="Nome do responsável"
    )

    # Localização
    city = models.CharField(max_length=100, blank=True, null=True, help_text="Cidade")
    state = models.CharField(max_length=2, blank=True, null=True, help_text="UF")

    # Patrocínio
    is_sponsor = models.BooleanField(default=False, help_text="É patrocinador da plataforma")
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
        """Verifica se é uma organização contratante"""
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
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization"], name="unique_membership_user_org"
            ),
        ]
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

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="musician_profile")
    name_changes_month = models.DateField(
        default=_current_month_start,
        help_text="Mes de referencia para limite de troca de nome",
    )
    name_changes_count = models.PositiveSmallIntegerField(
        default=0, help_text="Quantidade de alteracoes de nome no mes"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="musicians",
        null=True,
        blank=True,
    )
    instrument = models.CharField(max_length=50, help_text="Instrumento principal do músico")
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
        validators=[MinValueValidator(0, message="Valor do cachê não pode ser negativo.")],
        help_text="Valor base de cachê do músico",
    )
    travel_fee_per_km = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0, message="Valor por km não pode ser negativo.")],
        help_text="Valor cobrado por km deslocado",
    )
    equipment_items = models.JSONField(
        default=list, blank=True, help_text="Lista de equipamentos/serviços com valores"
    )
    # Gêneros musicais
    musical_genres = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de gêneros musicais do músico",
    )
    city = models.CharField(
        max_length=100, blank=True, null=True, help_text="Cidade onde o músico reside"
    )
    state = models.CharField(max_length=2, blank=True, null=True, help_text="UF (sigla do estado)")
    is_active = models.BooleanField(default=True)
    is_premium = models.BooleanField(default=False, help_text="Acesso ao Portal Cultural Premium")

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
        indexes = [
            models.Index(fields=["is_active", "city", "state"]),
            models.Index(fields=["is_active", "city", "state", "-average_rating"]),
            models.Index(fields=["is_active", "state"]),
            models.Index(fields=["is_active", "instrument"]),
        ]

    def get_instrument_label(self):
        """Retorna label do instrumento, com fallback para valores customizados."""
        if not self.instrument:
            return "Sem instrumento"
        labels = dict(self.INSTRUMENT_CHOICES)
        return labels.get(self.instrument, self.instrument)

    def save(self, *args, **kwargs):
        # Normaliza state para sigla de 2 letras antes de gravar
        if self.state and len(self.state) > 2:
            from .utils import normalize_uf

            self.state = normalize_uf(self.state) or self.state[:2]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.get_instrument_label()}"


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
    description = models.TextField(blank=True, null=True, help_text="Detalhes do evento")
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

    # Privacidade do evento (oculta detalhes no calendário público)
    is_private = models.BooleanField(
        default=False,
        help_text="Evento privado (oculta detalhes no calendário público)",
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
                errors["event_date"] = "Não é possível criar eventos com datas passadas."

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

            self.end_datetime = timezone.make_aware(datetime.combine(end_date, self.end_time))

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.title} - {self.event_date.strftime('%d/%m/%Y')} - {self.get_status_display()}"
        )

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
        ("user_delete", "Usuário Deletado"),
        ("organization_delete", "Organização Deletada"),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="logs")
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
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
    ]

    musician = models.ForeignKey(Musician, on_delete=models.CASCADE, related_name="availabilities")
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="availabilities")
    response = models.CharField(
        max_length=20, choices=RESPONSE_CHOICES, default="pending", db_index=True
    )
    notes = models.TextField(blank=True, null=True, help_text="Observações sobre a disponibilidade")
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
    notes = models.TextField(blank=True, null=True, help_text="Observações sobre a disponibilidade")

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
            errors["date"] = "Não é possível cadastrar disponibilidades em datas passadas."

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
            self.start_datetime = timezone.make_aware(datetime.combine(self.date, self.start_time))
        if self.date and self.end_time:
            from datetime import timedelta as td

            # Se end_time <= start_time, disponibilidade cruza meia-noite e vai para o dia seguinte
            end_date = (
                self.date + td(days=1)
                if self.start_time and self.end_time <= self.start_time
                else self.date
            )
            self.end_datetime = timezone.make_aware(datetime.combine(end_date, self.end_time))
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
        ).filter(models.Q(start_datetime__lt=buffer_end) & models.Q(end_datetime__gt=buffer_start))

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

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="required_instruments")
    instrument = models.CharField(max_length=50, help_text="Tipo de instrumento necessário")
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
    Participantes do evento podem avaliar.
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
    rating = models.PositiveIntegerField(choices=RATING_CHOICES, help_text="Nota de 1 a 5 estrelas")
    comment = models.TextField(
        blank=True, null=True, help_text="Comentário opcional sobre o músico"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "musician", "rated_by"],
                name="unique_musician_rating_per_event",
            ),
        ]
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
        if not musician:
            return

        with transaction.atomic():
            try:
                locked_musician = Musician.objects.select_for_update().get(pk=musician.pk)
            except Musician.DoesNotExist:
                return

            stats = MusicianRating.objects.filter(musician_id=locked_musician.pk).aggregate(
                avg=Avg("rating"), total=models.Count("id")
            )
            locked_musician.average_rating = stats["avg"] or 0
            locked_musician.total_ratings = stats["total"] or 0
            locked_musician.save(update_fields=["average_rating", "total_ratings"])


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

    musician = models.ForeignKey(Musician, on_delete=models.CASCADE, related_name="badges")
    slug = models.CharField(max_length=50, help_text="Identificador da badge (ex: first_show)")
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True, null=True)
    icon = models.CharField(max_length=10, blank=True, null=True, help_text="Emoji opcional")
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
    instruments = models.JSONField(default=list, blank=True, help_text="Lista de instrumentos")
    musical_genres = models.JSONField(
        default=list,
        blank=True,
        help_text="Lista de gêneros musicais do músico",
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


# =============================================================================
# Contratantes e fluxo de orçamento/reserva
# =============================================================================


class ContractorProfile(models.Model):
    """Perfil simplificado de contratante (cadastro breve)."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="contractor_profile")
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=2, blank=True, null=True)
    accepted_terms_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Contratante"
        verbose_name_plural = "Contratantes"

    def __str__(self):
        return self.name


class QuoteRequest(models.Model):
    """Pedido de orçamento enviado por contratante para um músico."""

    STATUS_CHOICES = [
        ("pending", "Pendente"),
        ("responded", "Respondido"),
        ("reservation_requested", "Reserva solicitada"),
        ("reserved", "Reservado"),
        ("confirmed", "Confirmado"),
        ("completed", "Concluído"),
        ("cancelled", "Cancelado"),
        ("declined", "Recusado"),
    ]

    contractor = models.ForeignKey(
        ContractorProfile, on_delete=models.CASCADE, related_name="quote_requests"
    )
    musician = models.ForeignKey(
        "Musician", on_delete=models.CASCADE, related_name="quote_requests"
    )

    event_date = models.DateField()
    event_type = models.CharField(max_length=120)
    location_city = models.CharField(max_length=100)
    location_state = models.CharField(max_length=2)
    venue_name = models.CharField(max_length=150, blank=True, null=True)
    duration_hours = models.PositiveIntegerField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="pending")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Pedido de Orçamento"
        verbose_name_plural = "Pedidos de Orçamento"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["musician", "status"]),
            models.Index(fields=["contractor", "status"]),
        ]

    def __str__(self):
        return f"{self.contractor} -> {self.musician} ({self.get_status_display()})"


class QuoteProposal(models.Model):
    """Proposta enviada pelo músico para um pedido de orçamento."""

    STATUS_CHOICES = [
        ("sent", "Enviada"),
        ("accepted", "Aceita"),
        ("declined", "Recusada"),
        ("expired", "Expirada"),
    ]

    request = models.ForeignKey(QuoteRequest, on_delete=models.CASCADE, related_name="proposals")
    message = models.TextField()
    proposed_value = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    valid_until = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="sent")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Proposta de Orçamento"
        verbose_name_plural = "Propostas de Orçamento"

    def __str__(self):
        return f"Proposta #{self.id} ({self.get_status_display()})"


class Booking(models.Model):
    """Reserva/contrato gerado a partir de um pedido de orçamento."""

    STATUS_CHOICES = [
        ("reserved", "Reservado"),
        ("confirmed", "Confirmado"),
        ("completed", "Concluído"),
        ("cancelled", "Cancelado"),
    ]

    request = models.OneToOneField(QuoteRequest, on_delete=models.CASCADE, related_name="booking")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="reserved")
    reserved_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    cancel_reason = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["-reserved_at"]
        verbose_name = "Reserva"
        verbose_name_plural = "Reservas"

    def __str__(self):
        return f"Reserva #{self.id} ({self.get_status_display()})"


class BookingEvent(models.Model):
    """Auditoria do fluxo de orçamento/reserva."""

    ACTOR_CHOICES = [
        ("contractor", "Contratante"),
        ("musician", "Músico"),
        ("system", "Sistema"),
        ("admin", "Admin"),
    ]

    request = models.ForeignKey(QuoteRequest, on_delete=models.CASCADE, related_name="events")
    actor_type = models.CharField(max_length=20, choices=ACTOR_CHOICES)
    actor_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=80)
    metadata = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Evento de Reserva"
        verbose_name_plural = "Eventos de Reserva"

    def __str__(self):
        return f"{self.action} ({self.get_actor_type_display()})"


# PendingRegistration model removido - agora usamos MusicianRequest com aprovação admin


class City(models.Model):
    """
    Cidade cadastrada no sistema.
    Controla status de parceria e expansão da plataforma.
    """

    STATUS_CHOICES = [
        ("partner", "Parceiro"),  # Cidade ativa
        ("expansion", "Em Expansão"),  # Coletando interesse
        ("planning", "Em Planejamento"),  # Sendo avaliada
    ]

    name = models.CharField(max_length=100, help_text="Nome da cidade")
    state = models.CharField(max_length=2, help_text="UF (sigla do estado)")
    slug = models.SlugField(max_length=120, unique=True, help_text="Identificador único (URL)")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="planning",
        help_text="Status da cidade na plataforma",
    )
    description = models.TextField(
        blank=True, null=True, help_text="Descrição ou notas sobre a cidade"
    )
    is_active = models.BooleanField(default=True, help_text="Se a cidade está ativa no sistema")
    priority = models.PositiveIntegerField(
        default=0, help_text="Prioridade de exibição (maior = mais importante)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cities_created",
        help_text="Admin que criou a cidade",
    )

    class Meta:
        ordering = ["-priority", "name"]
        verbose_name = "Cidade"
        verbose_name_plural = "Cidades"
        unique_together = [("name", "state")]
        indexes = [
            models.Index(fields=["status", "is_active"]),
            models.Index(fields=["state"]),
        ]

    def __str__(self):
        return f"{self.name}, {self.state}"

    def save(self, *args, **kwargs):
        """Gera slug automaticamente se não fornecido"""
        if not self.slug:
            import unicodedata

            # Normaliza e remove acentos
            name_normalized = unicodedata.normalize("NFKD", self.name.lower())
            name_clean = "".join([c for c in name_normalized if not unicodedata.combining(c)])
            # Substitui espaços por hífens e remove caracteres especiais
            name_clean = re.sub(r"[^a-z0-9\s-]", "", name_clean)
            name_clean = re.sub(r"\s+", "-", name_clean.strip())
            self.slug = f"{name_clean}-{self.state.lower()}"
        super().save(*args, **kwargs)


class CulturalNotice(models.Model):
    """
    Conteúdo cultural curado por administradores para o Portal Premium.
    Segmentado por estado e, opcionalmente, por cidade.
    """

    CATEGORY_CHOICES = [
        ("edital", "Edital"),
        ("festival", "Festival"),
        ("noticia", "Notícia"),
        ("rouanet", "Lei Rouanet"),
        ("aldir_blanc", "Aldir Blanc"),
        ("premio", "Prêmio"),
        ("other", "Outro"),
    ]

    title = models.CharField(max_length=220, help_text="Título do conteúdo")
    summary = models.TextField(
        blank=True,
        null=True,
        help_text="Resumo curto para exibição no portal",
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default="edital",
        help_text="Categoria principal do conteúdo",
    )

    state = models.CharField(max_length=2, help_text="UF alvo do conteúdo")
    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Cidade alvo (opcional; vazio = conteúdo estadual)",
    )

    source_name = models.CharField(
        max_length=120,
        blank=True,
        null=True,
        help_text="Fonte do conteúdo (ex: Prefeitura, MinC, Secult)",
    )
    source_url = models.URLField(
        blank=True,
        null=True,
        help_text="URL oficial para mais detalhes",
    )
    deadline_at = models.DateField(
        blank=True,
        null=True,
        help_text="Data limite de inscrição (quando aplicável)",
    )
    event_date = models.DateField(
        blank=True,
        null=True,
        help_text="Data do evento/festival (quando aplicável)",
    )
    published_at = models.DateField(default=timezone.localdate)
    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cultural_notices_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        verbose_name = "Conteúdo Cultural Premium"
        verbose_name_plural = "Conteúdos Culturais Premium"
        indexes = [
            models.Index(fields=["is_active", "state"]),
            models.Index(fields=["is_active", "state", "city"]),
            models.Index(fields=["category", "published_at"]),
        ]

    def __str__(self):
        location = f"{self.city}, {self.state}" if self.city else self.state
        return f"{self.title} ({location})"


class ContactView(models.Model):
    """
    Registra quando um contratante visualiza o contato de um músico.
    Usado para auditoria e analytics de interesse.
    """

    contractor = models.ForeignKey(
        "ContractorProfile",
        on_delete=models.CASCADE,
        related_name="contact_views",
    )
    musician = models.ForeignKey(
        "Musician",
        on_delete=models.CASCADE,
        related_name="contact_views",
    )
    viewed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True, max_length=500)

    class Meta:
        ordering = ["-viewed_at"]
        verbose_name = "Visualização de Contato"
        verbose_name_plural = "Visualizações de Contato"
        indexes = [
            models.Index(fields=["-viewed_at"]),
            models.Index(fields=["contractor", "-viewed_at"]),
            models.Index(fields=["musician", "-viewed_at"]),
        ]

    def __str__(self):
        return f"{self.contractor.name} → {self.musician.user.get_full_name()} ({self.viewed_at})"


class PwaAnalyticsEvent(models.Model):
    """
    Evento de analytics do PWA enviado pelo frontend.

    Usado para acompanhar funil de install/update/offline.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pwa_analytics_events",
    )
    event_name = models.CharField(max_length=80)
    metadata = models.JSONField(default=dict, blank=True)
    path = models.CharField(max_length=255, blank=True)
    release_label = models.CharField(max_length=80, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, max_length=500)
    is_authenticated = models.BooleanField(default=False)

    class Meta:
        ordering = ["-occurred_at"]
        verbose_name = "Evento Analytics PWA"
        verbose_name_plural = "Eventos Analytics PWA"
        indexes = [
            models.Index(fields=["event_name", "-occurred_at"], name="pwa_event_name_ts_idx"),
            models.Index(fields=["is_authenticated", "-occurred_at"], name="pwa_event_auth_ts_idx"),
            models.Index(fields=["release_label"], name="pwa_event_release_idx"),
        ]

    def __str__(self):
        return f"{self.event_name} ({self.occurred_at})"


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
        settings.AUTH_USER_MODEL,
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

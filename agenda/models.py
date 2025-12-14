# agenda/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.utils import timezone
from datetime import datetime


class Musician(models.Model):
    """
    Modelo para representar músicos da banda.
    Separado do User para permitir extensões futuras sem mexer no auth.
    """
    INSTRUMENT_CHOICES = [
        ('vocal', 'Vocal'),
        ('guitar', 'Guitarra'),
        ('bass', 'Baixo'),
        ('drums', 'Bateria'),
        ('keyboard', 'Teclado'),
        ('other', 'Outro'),
    ]
    
    ROLE_CHOICES = [
        ('member', 'Membro'),
        ('leader', 'Líder/Aprovador'),  # Roberto será leader
    ]
    
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE,
        related_name='musician_profile'
    )
    instrument = models.CharField(max_length=20, choices=INSTRUMENT_CHOICES)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    bio = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['user__first_name']
        verbose_name = 'Músico'
        verbose_name_plural = 'Músicos'
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.get_instrument_display()}"
    
    def is_leader(self):
        """Verifica se o músico é líder/aprovador"""
        return self.role == 'leader'


class Event(models.Model):
    """
    Representa uma proposta de evento/show na agenda.
    Músicos criam propostas que precisam ser aprovadas pelo líder.
    """
    STATUS_CHOICES = [
        ('proposed', 'Proposta Enviada'),
        ('approved', 'Aprovado'),
        ('rejected', 'Rejeitado'),
        ('confirmed', 'Confirmado'),
        ('cancelled', 'Cancelado'),
    ]
    
    title = models.CharField(max_length=200, help_text='Nome do evento/show')
    description = models.TextField(blank=True, null=True, help_text='Detalhes do evento')
    location = models.CharField(max_length=300, help_text='Local do show')
    venue_contact = models.CharField(max_length=200, blank=True, null=True, help_text='Contato do local')
    
    # Datas
    event_date = models.DateField(help_text='Data do evento')
    start_time = models.TimeField(help_text='Hora de início')
    end_time = models.TimeField(help_text='Hora de término')
    
    # Para facilitar queries (combinação de date + time)
    start_datetime = models.DateTimeField(help_text='Data/hora início completa')
    end_datetime = models.DateTimeField(help_text='Data/hora fim completa')
    
    # Informações financeiras (opcional)
    payment_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[MinValueValidator(0, message='Valor do cachê não pode ser negativo.')],
        help_text='Valor do cachê'
    )

    # Show solo (não requer aprovação do líder)
    is_solo = models.BooleanField(
        default=False,
        help_text='Indica se é um show solo (sem necessidade de aprovação do líder)'
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='proposed')
    
    # Quem criou a proposta
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        db_index=True,
        related_name='created_events'
    )
    
    # Quem aprovou (Roberto)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_events'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Motivo da rejeição
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-event_date', '-start_time']
        verbose_name = 'Evento'
        verbose_name_plural = 'Eventos'
        indexes = [
            models.Index(fields=['event_date', 'status']),
            models.Index(fields=['status']),
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
                errors['end_time'] = 'Evento deve ter duração mínima. Horário de término não pode ser igual ao início.'

        # Valida data (não pode ser no passado para novas propostas)
        if self.event_date and not self.pk:  # Apenas na criação
            if self.event_date < timezone.now().date():
                errors['event_date'] = 'Não é possível criar eventos com datas passadas.'

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
        """Verifica se o evento pode ser aprovado"""
        return self.status == 'proposed'
    
    def approve(self, user):
        """Aprova o evento"""
        if self.can_be_approved():
            self.status = 'approved'
            self.approved_by = user
            self.approved_at = timezone.now()
            self.save()
            return True
        return False
    
    def reject(self, user, reason=''):
        """Rejeita o evento"""
        if self.can_be_approved():
            self.status = 'rejected'
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
        ('created', 'Criado'),
        ('approved', 'Aprovado'),
        ('rejected', 'Rejeitado'),
        ('cancelled', 'Cancelado'),
        ('availability', 'Disponibilidade'),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='logs')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Log de Evento'
        verbose_name_plural = 'Logs de Evento'
        indexes = [
            models.Index(fields=['event', 'created_at']),
        ]

    def __str__(self):
        user = self.performed_by.get_full_name() if self.performed_by else 'Sistema'
        return f"{self.get_action_display()} - {user} ({self.created_at})"


class Availability(models.Model):
    """
    Disponibilidade de cada músico para eventos.
    Criada automaticamente quando um evento é proposto.
    """
    RESPONSE_CHOICES = [
        ('pending', 'Pendente'),           # Ainda não respondeu
        ('available', 'Disponível'),       # Pode tocar
        ('unavailable', 'Indisponível'),   # Não pode
        ('maybe', 'Talvez'),               # Depende
    ]
    
    musician = models.ForeignKey(
        Musician, 
        on_delete=models.CASCADE, 
        related_name='availabilities'
    )
    event = models.ForeignKey(
        Event, 
        on_delete=models.CASCADE, 
        related_name='availabilities'
    )
    response = models.CharField(
        max_length=20,
        choices=RESPONSE_CHOICES,
        default='pending',
        db_index=True
    )
    notes = models.TextField(
        blank=True, 
        null=True,
        help_text='Observações sobre a disponibilidade'
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['musician', 'event']
        ordering = ['event__event_date', 'musician__user__first_name']
        verbose_name = 'Disponibilidade'
        verbose_name_plural = 'Disponibilidades'
    
    def __str__(self):
        return f"{self.musician} - {self.event.title} - {self.get_response_display()}"
    
    def save(self, *args, **kwargs):
        """Atualiza responded_at quando muda de pending"""
        if self.response != 'pending' and not self.responded_at:
            self.responded_at = timezone.now()
        super().save(*args, **kwargs)


class LeaderAvailability(models.Model):
    """
    Datas e horários disponíveis cadastrados por cada músico.
    Outros músicos visualizam essas disponibilidades ao criar eventos.
    Regra: mínimo 40 minutos entre eventos.
    """
    leader = models.ForeignKey(
        Musician,
        on_delete=models.CASCADE,
        related_name='leader_availabilities',
        help_text='Músico que cadastrou a disponibilidade'
    )
    date = models.DateField(help_text='Data disponível')
    start_time = models.TimeField(help_text='Hora de início da disponibilidade')
    end_time = models.TimeField(help_text='Hora de término da disponibilidade')
    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Observações sobre a disponibilidade'
    )

    # Para facilitar queries
    start_datetime = models.DateTimeField(help_text='Data/hora início completa')
    end_datetime = models.DateTimeField(help_text='Data/hora fim completa')

    is_active = models.BooleanField(
        default=True,
        help_text='Se False, a disponibilidade foi removida/cancelada'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'start_time']
        verbose_name = 'Disponibilidade do Líder'
        verbose_name_plural = 'Disponibilidades do Líder'
        indexes = [
            models.Index(fields=['date', 'is_active']),
            models.Index(fields=['leader', 'date']),
        ]

    def clean(self):
        """Validações customizadas"""
        errors = {}

        # Valida horários
        if self.start_time and self.end_time:
            if self.end_time == self.start_time:
                errors['end_time'] = 'Horário de término deve ser posterior ao início.'

        # Valida data (não pode ser no passado)
        if self.date and self.date < timezone.now().date():
            errors['date'] = 'Não é possível cadastrar disponibilidades em datas passadas.'

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
                errors['date'] = 'Formato inválido. Use YYYY-MM-DD.'

        # Garantir que times são objetos time, não strings
        if isinstance(self.start_time, str):
            from datetime import time as time_cls
            try:
                parts = self.start_time.split(':')
                self.start_time = time_cls(int(parts[0]), int(parts[1]))
            except Exception:
                errors['start_time'] = 'Formato inválido. Use HH:MM.'

        if isinstance(self.end_time, str):
            from datetime import time as time_cls
            try:
                parts = self.end_time.split(':')
                self.end_time = time_cls(int(parts[0]), int(parts[1]))
            except Exception:
                errors['end_time'] = 'Formato inválido. Use HH:MM.'

        if errors:
            raise ValidationError(errors)

        if self.date and self.start_time:
            self.start_datetime = timezone.make_aware(
                datetime.combine(self.date, self.start_time)
            )
        if self.date and self.end_time:
            from datetime import timedelta as td
            # Se end_time <= start_time, disponibilidade cruza meia-noite e vai para o dia seguinte
            end_date = self.date + td(days=1) if self.start_time and self.end_time <= self.start_time else self.date
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
            status__in=['proposed', 'approved', 'confirmed']
        ).filter(
            models.Q(start_datetime__lt=buffer_end) &
            models.Q(end_datetime__gt=buffer_start)
        )

        return conflicting_events

    def has_conflicts(self):
        """Verifica se há eventos conflitantes"""
        return self.get_conflicting_events().exists()

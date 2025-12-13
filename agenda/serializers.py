# agenda/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Musician, Event, Availability, LeaderAvailability, EventLog
from .validators import validate_not_empty_string


class UserSerializer(serializers.ModelSerializer):
    """Serializer básico de usuário para uso nested"""
    full_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'full_name']
        read_only_fields = ['id']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_email(self, obj):
        """Retorna email apenas para o próprio usuário"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Mostra email apenas para o próprio usuário
            if request.user.id == obj.id:
                return obj.email
        return None


class MusicianSerializer(serializers.ModelSerializer):
    """Serializer de músico com dados do usuário"""
    user = UserSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    is_leader = serializers.SerializerMethodField()
    
    class Meta:
        model = Musician
        fields = [
            'id', 'user', 'full_name', 'instrument', 'role', 
            'is_leader', 'bio', 'phone', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    
    def get_is_leader(self, obj):
        return obj.is_leader()


class AvailabilitySerializer(serializers.ModelSerializer):
    """Serializer de disponibilidade com dados do músico"""
    musician = MusicianSerializer(read_only=True)
    musician_id = serializers.PrimaryKeyRelatedField(
        queryset=Musician.objects.all(),
        source='musician',
        write_only=True,
        required=False  # Será setado automaticamente na view
    )
    
    class Meta:
        model = Availability
        fields = [
            'id', 'musician', 'musician_id', 'event', 'response', 
            'notes', 'responded_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'responded_at', 'created_at', 'updated_at']


class EventListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de eventos"""
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    availability_summary = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'location', 'event_date', 'start_time', 'end_time',
            'status', 'status_display', 'created_by_name', 'approved_by_name',
            'availability_summary', 'payment_amount', 'is_solo', 'created_at', 'created_by'
        ]
    
    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'Sistema'
    
    def get_approved_by_name(self, obj):
        return obj.approved_by.get_full_name() if obj.approved_by else None
    
    def get_availability_summary(self, obj):
        """Retorna resumo das disponibilidades"""
        availabilities = obj.availabilities.all()
        return {
            'pending': availabilities.filter(response='pending').count(),
            'available': availabilities.filter(response='available').count(),
            'unavailable': availabilities.filter(response='unavailable').count(),
            'maybe': availabilities.filter(response='maybe').count(),
            'total': availabilities.count(),
        }


class EventLogSerializer(serializers.ModelSerializer):
    """Serializer simples para histórico do evento"""
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EventLog
        fields = ['id', 'action', 'description', 'performed_by', 'performed_by_name', 'created_at']
        read_only_fields = fields

    def get_performed_by_name(self, obj):
        return obj.performed_by.get_full_name() if obj.performed_by else 'Sistema'


class EventDetailSerializer(serializers.ModelSerializer):
    """Serializer completo de evento com todas as disponibilidades"""
    availabilities = AvailabilitySerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    can_approve = serializers.SerializerMethodField()
    logs = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'location', 'venue_contact',
            'event_date', 'start_time', 'end_time', 'start_datetime', 'end_datetime',
            'payment_amount', 'is_solo', 'status', 'status_display', 'can_approve',
            'created_by', 'created_by_name', 'approved_by', 'approved_by_name',
            'approved_at', 'rejection_reason', 'availabilities',
            'logs', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'start_datetime', 'end_datetime', 'created_by',
            'approved_by', 'approved_at', 'status', 'rejection_reason',
            'created_at', 'updated_at'
        ]
    
    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'Sistema'
    
    def get_approved_by_name(self, obj):
        return obj.approved_by.get_full_name() if obj.approved_by else None
    
    def get_can_approve(self, obj):
        """Verifica se o usuário atual pode aprovar"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        
        try:
            musician = request.user.musician_profile
            return musician.is_leader() and obj.can_be_approved()
        except Musician.DoesNotExist:
            return False

    def get_logs(self, obj):
        """Retorna últimos registros de log (limitado para evitar payload grande)"""
        logs = obj.logs.select_related('performed_by').all()[:20]
        return EventLogSerializer(logs, many=True).data
    
    def validate(self, data):
        """Validações customizadas"""
        errors = {}

        # Valida strings vazias em campos obrigatórios
        string_fields = ['title', 'location']
        for field in string_fields:
            if field in data:
                try:
                    data[field] = validate_not_empty_string(data[field])
                except serializers.ValidationError as e:
                    errors[field] = str(e.detail[0])

        # Valida horários
        # Nota: end_time < start_time é permitido (eventos noturnos que cruzam meia-noite)
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if start_time and end_time:
            if end_time == start_time:
                # Duração zero não é permitida
                errors['end_time'] = 'Evento deve ter duração mínima. Horário de término não pode ser igual ao início.'

        # Valida data (não pode ser no passado)
        event_date = data.get('event_date')
        if event_date and event_date < timezone.now().date():
            errors['event_date'] = 'Não é possível criar eventos com datas passadas.'

        # Proíbe edição de horários em eventos aprovados/confirmados (UPDATE)
        if self.instance:  # É um update
            if self.instance.status in ['approved', 'confirmed']:
                # Verifica se tentou mudar horários
                fields_changed = ['event_date', 'start_time', 'end_time']
                for field in fields_changed:
                    if field in data and data[field] != getattr(self.instance, field):
                        errors[field] = f'Não é possível alterar {field} de eventos aprovados/confirmados. Cancele e crie novo evento.'

        if errors:
            raise serializers.ValidationError(errors)

        return data


class EventCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de eventos (campos simplificados)"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'location', 'venue_contact',
            'event_date', 'start_time', 'end_time', 'payment_amount', 'is_solo',
            'status', 'status_display'
        ]
        read_only_fields = ['id', 'status', 'status_display']
    
    def validate(self, data):
        """Validações"""
        errors = {}

        # Valida strings vazias em campos obrigatórios
        string_fields = ['title', 'location']
        for field in string_fields:
            if field in data:
                try:
                    data[field] = validate_not_empty_string(data[field])
                except serializers.ValidationError as e:
                    errors[field] = str(e.detail[0])

        # Permite end_time < start_time (eventos noturnos), mas não duração zero
        if data.get('end_time') and data.get('start_time'):
            if data['end_time'] == data['start_time']:
                errors['end_time'] = 'Evento deve ter duração mínima. Horário de término não pode ser igual ao início.'

        if data.get('event_date') and data['event_date'] < timezone.now().date():
            errors['event_date'] = 'Não é possível criar eventos com datas passadas.'

        if errors:
            raise serializers.ValidationError(errors)

        return data


class LeaderAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer para disponibilidades cadastradas pelo líder"""
    leader_name = serializers.SerializerMethodField()
    has_conflicts = serializers.SerializerMethodField()
    conflicting_events_count = serializers.SerializerMethodField()

    class Meta:
        model = LeaderAvailability
        fields = [
            'id', 'leader', 'leader_name', 'date', 'start_time', 'end_time',
            'start_datetime', 'end_datetime', 'notes', 'is_active',
            'has_conflicts', 'conflicting_events_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'start_datetime', 'end_datetime', 'leader',
            'created_at', 'updated_at'
        ]

    def get_leader_name(self, obj):
        return obj.leader.user.get_full_name() if obj.leader else 'Sistema'

    def get_has_conflicts(self, obj):
        """Verifica se há conflitos com eventos existentes"""
        return obj.has_conflicts()

    def get_conflicting_events_count(self, obj):
        """Conta eventos conflitantes"""
        return obj.get_conflicting_events().count()

    def validate(self, data):
        """Validações customizadas"""
        errors = {}

        # Valida horários - permite cruzar meia-noite; apenas bloqueia duração zero
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if start_time and end_time:
            if end_time == start_time:
                errors['end_time'] = 'Horário de término deve ser posterior ao início.'

        # Valida data (não pode ser no passado)
        date = data.get('date')
        if date and date < timezone.now().date():
            errors['date'] = 'Não é possível cadastrar disponibilidades em datas passadas.'

        if errors:
            raise serializers.ValidationError(errors)

        return data

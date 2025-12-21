# agenda/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    Musician,
    Event,
    Availability,
    LeaderAvailability,
    EventLog,
    EventInstrument,
    MusicianRating,
    Connection,
    MusicianBadge,
)
from .validators import validate_not_empty_string
from .utils import get_user_organization


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
    public_email = serializers.SerializerMethodField()
    subscription_info = serializers.SerializerMethodField()

    class Meta:
        model = Musician
        fields = [
            'id', 'user', 'full_name', 'instrument', 'instruments', 'role',
            'is_leader', 'bio', 'phone', 'instagram', 'public_email', 'is_active',
            'average_rating', 'total_ratings', 'created_at', 'subscription_info'
        ]
        read_only_fields = ['id', 'average_rating', 'total_ratings', 'created_at', 'subscription_info']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_is_leader(self, obj):
        return obj.is_leader()

    def get_public_email(self, obj):
        return obj.user.email or None

    def get_subscription_info(self, obj):
        # Só retorna info de assinatura para o próprio usuário
        request = self.context.get('request')
        if request and request.user == obj.user:
            return obj.get_subscription_info()
        return None


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

    def validate(self, attrs):
        if self.instance and 'musician' in attrs:
            raise serializers.ValidationError({
                'musician_id': 'Não é permitido alterar o músico desta disponibilidade.'
            })
        return attrs


class EventListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de eventos"""
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    availability_summary = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approval_label = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'location', 'event_date', 'start_time', 'end_time',
            'status', 'status_display', 'created_by_name', 'approved_by_name',
            'approval_label', 'availability_summary', 'payment_amount', 'is_solo', 'created_at', 'created_by'
        ]
    
    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'Sistema'
    
    def get_approved_by_name(self, obj):
        return obj.approved_by.get_full_name() if obj.approved_by else None

    def get_approval_label(self, obj):
        """Mostra quem aprovou quando status é aprovado"""
        if obj.status == 'approved' and obj.approved_by:
            return f"Aprovado por {obj.approved_by.get_full_name() or obj.approved_by.username}"
        return obj.get_status_display()
    
    def get_availability_summary(self, obj):
        """
        Retorna resumo das disponibilidades.
        Usa valores pré-anotados se disponíveis (otimização N+1),
        caso contrário calcula com uma única iteração.
        """
        # Verifica se os valores foram pré-anotados no queryset
        if hasattr(obj, 'avail_pending'):
            return {
                'pending': obj.avail_pending or 0,
                'available': obj.avail_available or 0,
                'unavailable': obj.avail_unavailable or 0,
                'maybe': obj.avail_maybe or 0,
                'total': obj.avail_total or 0,
            }

        # Fallback: calcula com uma única iteração (evita 5 queries)
        summary = {'pending': 0, 'available': 0, 'unavailable': 0, 'maybe': 0, 'total': 0}
        for availability in obj.availabilities.all():
            response = availability.response
            if response in summary:
                summary[response] += 1
            summary['total'] += 1
        return summary


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
    can_rate = serializers.SerializerMethodField()
    logs = serializers.SerializerMethodField()
    approval_label = serializers.SerializerMethodField()
    required_instruments = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'location', 'venue_contact',
            'event_date', 'start_time', 'end_time', 'start_datetime', 'end_datetime',
            'payment_amount', 'is_solo', 'status', 'status_display', 'can_approve',
            'can_rate', 'created_by', 'created_by_name', 'approved_by', 'approved_by_name',
            'approved_at', 'rejection_reason', 'approval_label', 'availabilities',
            'required_instruments', 'logs', 'created_at', 'updated_at'
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
        """
        Verifica se o usuário atual pode responder ao convite.
        Retorna True se o músico foi convidado e ainda não respondeu (pending).
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False

        try:
            musician = request.user.musician_profile
            # Verifica se foi convidado e ainda está pendente
            availability = obj.availabilities.filter(musician=musician).first()
            if availability and availability.response == 'pending':
                return True
            return False
        except Musician.DoesNotExist:
            return False

    def get_approval_label(self, obj):
        if obj.status == 'approved' and obj.approved_by:
            return f"Aprovado por {obj.approved_by.get_full_name() or obj.approved_by.username}"
        return obj.get_status_display()

    def get_logs(self, obj):
        """Retorna últimos registros de log (limitado para evitar payload grande)"""
        logs = obj.logs.select_related('performed_by').all()[:20]
        raw_logs = EventLogSerializer(logs, many=True).data

        # Ajusta textos de disponibilidade para PT-BR quando existirem registros antigos
        response_labels = {
            'available': 'Disponível',
            'unavailable': 'Indisponível',
            'maybe': 'Talvez',
            'pending': 'Pendente',
        }

        adjusted_logs = []
        for log in raw_logs:
            desc = log.get('description', '')
            if log.get('action') == 'availability':
                for eng, label in response_labels.items():
                    desc = desc.replace(f': {eng}', f': {label}')
            log['description'] = desc
            adjusted_logs.append(log)

        return adjusted_logs

    def get_can_rate(self, obj):
        """
        Verifica se o usuário pode avaliar os músicos do evento.
        Condições: é criador + data do evento já passou + ainda não avaliou
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False

        # Apenas criador pode avaliar
        if obj.created_by != request.user:
            return False

        # Evento deve estar no passado
        if obj.event_date >= timezone.now().date():
            return False

        # Verifica se já avaliou algum músico neste evento
        already_rated = MusicianRating.objects.filter(
            event=obj,
            rated_by=request.user
        ).exists()

        return not already_rated

    def get_required_instruments(self, obj):
        """Retorna instrumentos necessários para o evento"""
        from .serializers import EventInstrumentSerializer
        instruments = obj.required_instruments.all()
        return EventInstrumentSerializer(instruments, many=True).data

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
    invited_musicians = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text='Lista de IDs dos músicos a convidar para o evento'
    )
    required_instruments = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text='Lista de instrumentos necessários [{instrument, quantity}]'
    )

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'location', 'venue_contact',
            'event_date', 'start_time', 'end_time', 'payment_amount', 'is_solo',
            'status', 'status_display', 'invited_musicians', 'required_instruments'
        ]
        read_only_fields = ['id', 'status', 'status_display']
    
    def validate_required_instruments(self, value):
        if not value:
            return []

        normalized = {}
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError('Cada instrumento deve ser um objeto.')

            instrument_raw = item.get('instrument', '')
            instrument = str(instrument_raw).strip()
            if not instrument:
                raise serializers.ValidationError('Instrumento é obrigatório.')

            quantity_raw = item.get('quantity', 1)
            try:
                quantity = int(quantity_raw)
            except (TypeError, ValueError):
                raise serializers.ValidationError('Quantidade inválida para instrumento.')

            if quantity <= 0:
                raise serializers.ValidationError('Quantidade deve ser maior que zero.')

            key = instrument.lower()
            if key in normalized:
                normalized[key]['quantity'] += quantity
            else:
                normalized[key] = {'instrument': instrument, 'quantity': quantity}

        return list(normalized.values())

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
    leader_instrument = serializers.SerializerMethodField()
    leader_instrument_display = serializers.SerializerMethodField()
    has_conflicts = serializers.SerializerMethodField()
    conflicting_events_count = serializers.SerializerMethodField()

    class Meta:
        model = LeaderAvailability
        fields = [
            'id', 'leader', 'leader_name', 'leader_instrument', 'leader_instrument_display',
            'date', 'start_time', 'end_time',
            'start_datetime', 'end_datetime', 'notes', 'is_active',
            'is_public', 'has_conflicts', 'conflicting_events_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'start_datetime', 'end_datetime', 'leader',
            'created_at', 'updated_at'
        ]

    def get_leader_name(self, obj):
        return obj.leader.user.get_full_name() if obj.leader else 'Sistema'

    def get_leader_instrument(self, obj):
        return obj.leader.instrument if obj.leader else None

    def get_leader_instrument_display(self, obj):
        if not obj.leader or not obj.leader.instrument:
            return None
        instrument_labels = {
            'vocal': 'Vocal',
            'guitar': 'Guitarra/Violão',
            'bass': 'Baixo',
            'drums': 'Bateria',
            'keyboard': 'Teclado',
            'percussion': 'Percussão/Outros',
        }
        return instrument_labels.get(obj.leader.instrument, obj.leader.instrument)

    def get_has_conflicts(self, obj):
        """
        Verifica se há conflitos com eventos existentes.
        Usa cache para evitar query duplicada com conflicting_events_count.
        """
        # Usa cache no objeto para evitar query duplicada
        if not hasattr(obj, '_cached_conflicts_count'):
            obj._cached_conflicts_count = obj.get_conflicting_events().count()
        return obj._cached_conflicts_count > 0

    def get_conflicting_events_count(self, obj):
        """
        Conta eventos conflitantes.
        Usa cache para evitar query duplicada com has_conflicts.
        """
        if not hasattr(obj, '_cached_conflicts_count'):
            obj._cached_conflicts_count = obj.get_conflicting_events().count()
        return obj._cached_conflicts_count

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


class EventInstrumentSerializer(serializers.ModelSerializer):
    """Serializer para instrumentos necessários de um evento"""
    instrument_display = serializers.SerializerMethodField()

    class Meta:
        model = EventInstrument
        fields = ['id', 'instrument', 'instrument_display', 'quantity']
        read_only_fields = ['id']

    def get_instrument_display(self, obj):
        return obj.get_instrument_label()


class MusicianRatingSerializer(serializers.ModelSerializer):
    """Serializer para avaliações de músicos"""
    musician_name = serializers.SerializerMethodField()
    rated_by_name = serializers.SerializerMethodField()
    event_title = serializers.SerializerMethodField()

    class Meta:
        model = MusicianRating
        fields = [
            'id', 'event', 'event_title', 'musician', 'musician_name',
            'rating', 'comment', 'rated_by', 'rated_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'rated_by', 'created_at']

    def get_musician_name(self, obj):
        return obj.musician.user.get_full_name() or obj.musician.user.username

    def get_rated_by_name(self, obj):
        return obj.rated_by.get_full_name() or obj.rated_by.username

    def get_event_title(self, obj):
        return obj.event.title


class RatingSubmitSerializer(serializers.Serializer):
    """Serializer para submissão de múltiplas avaliações"""
    ratings = serializers.ListField(
        child=serializers.DictField(),
        help_text='Lista de avaliações [{musician_id, rating, comment}]'
    )

    def validate_ratings(self, value):
        """Valida lista de ratings"""
        if not value:
            raise serializers.ValidationError('Lista de avaliações não pode estar vazia.')

        for item in value:
            if 'musician_id' not in item:
                raise serializers.ValidationError('Cada avaliação deve conter musician_id.')
            if 'rating' not in item:
                raise serializers.ValidationError('Cada avaliação deve conter rating.')
            if not 1 <= item['rating'] <= 5:
                raise serializers.ValidationError('Rating deve ser entre 1 e 5.')

        return value


class ConnectionSerializer(serializers.ModelSerializer):
    follower = MusicianSerializer(read_only=True)
    target = MusicianSerializer(read_only=True)
    target_id = serializers.PrimaryKeyRelatedField(
        source='target',
        queryset=Musician.objects.filter(is_active=True),
        write_only=True,
    )

    class Meta:
        model = Connection
        fields = [
            'id',
            'follower',
            'target',
            'target_id',
            'connection_type',
            'verified',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'follower', 'created_at']

    def validate(self, attrs):
        target = attrs.get('target') or getattr(self.instance, 'target', None)
        request = self.context.get('request')
        if request and hasattr(request.user, 'musician_profile') and target:
            follower = request.user.musician_profile
            if follower == target:
                raise serializers.ValidationError('Você não pode criar conexão consigo mesmo.')
            org = get_user_organization(request.user)
            if org and target.organization_id != org.id:
                raise serializers.ValidationError('Você só pode criar conexões dentro da sua organização.')
        return attrs


class MusicianBadgeSerializer(serializers.ModelSerializer):
    musician = MusicianSerializer(read_only=True)

    class Meta:
        model = MusicianBadge
        fields = ['id', 'musician', 'slug', 'name', 'description', 'icon', 'awarded_at']
        read_only_fields = fields

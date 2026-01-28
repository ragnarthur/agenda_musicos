# agenda/serializers.py
from datetime import datetime
from decimal import Decimal, InvalidOperation
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
    MusicianRequest,
    ContactRequest,
    Organization,
)
from .validators import validate_not_empty_string, sanitize_string


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
    public_email = serializers.SerializerMethodField()
    subscription_info = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Musician
        fields = [
            'id', 'user', 'full_name', 'instrument', 'instruments', 'role',
            'bio', 'phone', 'instagram', 'whatsapp', 'city', 'state',
            'avatar_url', 'cover_image_url',
            'base_fee', 'travel_fee_per_km', 'equipment_items', 'public_email', 'is_active',
            'average_rating', 'total_ratings', 'created_at', 'subscription_info'
        ]
        read_only_fields = ['id', 'average_rating', 'total_ratings', 'created_at', 'subscription_info']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_public_email(self, obj):
        """Retorna email apenas para o próprio usuário (privacidade)"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user.id == obj.user.id:
                return obj.user.email
        return None

    def get_avatar_url(self, obj):
        """Retorna URL completa do avatar"""
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_cover_image_url(self, obj):
        """Retorna URL completa da imagem de capa"""
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        return None

    def get_subscription_info(self, obj):
        # Só retorna info de assinatura para o próprio usuário
        request = self.context.get('request')
        if request and request.user == obj.user:
            return obj.get_subscription_info()
        return None


class MusicianUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualização do próprio perfil de músico"""

    class Meta:
        model = Musician
        fields = [
            'instrument', 'instruments', 'bio', 'phone', 'instagram', 'whatsapp', 'city', 'state',
            'base_fee', 'travel_fee_per_km', 'equipment_items'
        ]

    def validate_base_fee(self, value):
        if value is None:
            return value
        try:
            decimal_value = Decimal(str(value))
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError('Valor do cachê inválido.')
        if decimal_value < 0:
            raise serializers.ValidationError('Valor do cachê não pode ser negativo.')
        return decimal_value

    def validate_travel_fee_per_km(self, value):
        if value is None:
            return value
        try:
            decimal_value = Decimal(str(value))
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError('Valor por km inválido.')
        if decimal_value < 0:
            raise serializers.ValidationError('Valor por km não pode ser negativo.')
        return decimal_value

    def validate_equipment_items(self, value):
        if value in [None, '']:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Equipamentos devem ser enviados como lista.')
        if len(value) > 30:
            raise serializers.ValidationError('Máximo de 30 equipamentos/serviços.')

        cleaned_items = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError('Cada equipamento deve ser um objeto com nome e valor.')

            name = str(item.get('name', '')).strip()
            if not name:
                # Ignora itens vazios
                continue
            if len(name) > 80:
                raise serializers.ValidationError('Nome de equipamento deve ter no máximo 80 caracteres.')

            raw_price = item.get('price')
            if raw_price in [None, '']:
                price_decimal = None
            else:
                try:
                    price_decimal = Decimal(str(raw_price))
                except (InvalidOperation, TypeError):
                    raise serializers.ValidationError(f'Valor inválido para o equipamento {name}.')

                if price_decimal < 0:
                    raise serializers.ValidationError(f'O valor de {name} não pode ser negativo.')

            cleaned_items.append({
                'name': name,
                'price': price_decimal if price_decimal is None else float(price_decimal.quantize(Decimal('0.01'))),
            })

        return cleaned_items

    def validate(self, attrs):
        if 'instrument' in attrs:
            attrs['instrument'] = sanitize_string(
                attrs.get('instrument'),
                max_length=50,
                allow_empty=False,
                to_lower=True
            )

        if 'instruments' in attrs:
            instruments_raw = attrs.get('instruments') or []
            if not isinstance(instruments_raw, list):
                raise serializers.ValidationError({'instruments': 'Instrumentos devem ser enviados como lista.'})
            if len(instruments_raw) > 10:
                raise serializers.ValidationError({'instruments': 'Máximo de 10 instrumentos permitidos.'})
            cleaned = []
            for item in instruments_raw:
                cleaned_item = sanitize_string(item, max_length=50, allow_empty=False, to_lower=True)
                if cleaned_item:
                    cleaned.append(cleaned_item)
            cleaned = list(dict.fromkeys(cleaned))
            attrs['instruments'] = cleaned
            if attrs.get('instrument') and attrs['instrument'] not in cleaned:
                attrs['instruments'] = [attrs['instrument'], *cleaned]

        if 'bio' in attrs:
            attrs['bio'] = sanitize_string(attrs.get('bio'), max_length=350, allow_empty=True)

        if 'phone' in attrs:
            attrs['phone'] = sanitize_string(attrs.get('phone'), max_length=20, allow_empty=True)

        if 'whatsapp' in attrs:
            attrs['whatsapp'] = sanitize_string(attrs.get('whatsapp'), max_length=20, allow_empty=True)

        if 'instagram' in attrs:
            instagram = sanitize_string(attrs.get('instagram'), max_length=100, allow_empty=True)
            if instagram and not instagram.startswith('@'):
                instagram = f'@{instagram}'
            attrs['instagram'] = instagram

        if 'city' in attrs:
            attrs['city'] = sanitize_string(attrs.get('city'), max_length=100, allow_empty=True)

        if 'state' in attrs:
            attrs['state'] = sanitize_string(attrs.get('state'), max_length=2, allow_empty=True, to_upper=True)

        return attrs


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
        if self.instance and 'event' in attrs and attrs['event'] != self.instance.event:
            raise serializers.ValidationError({
                'event': 'Não é permitido alterar o evento desta disponibilidade.'
            })
        if 'notes' in attrs:
            attrs['notes'] = sanitize_string(attrs.get('notes'), max_length=1000, allow_empty=True)
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
        """Mostra quem confirmou o evento (texto unificado para approved e confirmed)"""
        if obj.status in ('approved', 'confirmed'):
            # Para eventos approved, usa approved_by
            if obj.approved_by:
                name = obj.approved_by.get_full_name() or obj.approved_by.username
                return f"Confirmado por {name}"

            # Busca o último músico que aceitou
            last_available = obj.availabilities.filter(
                response='available',
                responded_at__isnull=False
            ).order_by('-responded_at').first()

            if not last_available:
                last_available = obj.availabilities.filter(
                    response='available'
                ).select_related('musician__user').first()

            if last_available:
                name = last_available.musician.user.get_full_name() or last_available.musician.user.username
                return f"Confirmado por {name}"
            elif obj.created_by:
                name = obj.created_by.get_full_name() or obj.created_by.username
                return f"Confirmado por {name}"
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
        """Mostra quem confirmou o evento (texto unificado para approved e confirmed)"""
        if obj.status in ('approved', 'confirmed'):
            # Para eventos approved, usa approved_by
            if obj.approved_by:
                name = obj.approved_by.get_full_name() or obj.approved_by.username
                return f"Confirmado por {name}"

            # Busca o último músico que aceitou
            last_available = obj.availabilities.filter(
                response='available',
                responded_at__isnull=False
            ).order_by('-responded_at').first()

            if not last_available:
                last_available = obj.availabilities.filter(
                    response='available'
                ).select_related('musician__user').first()

            if last_available:
                name = last_available.musician.user.get_full_name() or last_available.musician.user.username
                return f"Confirmado por {name}"
            elif obj.created_by:
                name = obj.created_by.get_full_name() or obj.created_by.username
                return f"Confirmado por {name}"
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

        # Evento deve estar no passado (considera término real)
        event_end = obj.end_datetime
        if not event_end and obj.event_date and obj.end_time:
            event_end = timezone.make_aware(datetime.combine(obj.event_date, obj.end_time))

        if event_end and event_end >= timezone.now():
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

        optional_limits = {
            'description': 5000,
            'venue_contact': 200,
            'rejection_reason': 2000,
        }
        for field, max_len in optional_limits.items():
            if field in data:
                try:
                    data[field] = sanitize_string(data.get(field), max_length=max_len, allow_empty=True)
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
                        errors[field] = f'Não é possível alterar {field} de eventos confirmados. Cancele e crie novo evento.'

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

        # Validação de tamanho máximo para prevenir payload abuse
        max_lengths = {
            'title': (200, False),
            'description': (5000, True),
            'location': (300, False),
            'venue_contact': (200, True),
        }
        for field, (max_len, allow_empty) in max_lengths.items():
            value = data.get(field, '')
            try:
                data[field] = sanitize_string(value, max_length=max_len, allow_empty=allow_empty)
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
    """Serializer para disponibilidades cadastradas pelo músico"""
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
            'guitar': 'Guitarra',
            'acoustic_guitar': 'Violão',
            'bass': 'Baixo',
            'drums': 'Bateria',
            'keyboard': 'Teclado',
            'piano': 'Piano',
            'synth': 'Sintetizador',
            'percussion': 'Percussão',
            'cajon': 'Cajón',
            'violin': 'Violino',
            'viola': 'Viola',
            'cello': 'Violoncelo',
            'double_bass': 'Contrabaixo acústico',
            'saxophone': 'Saxofone',
            'trumpet': 'Trompete',
            'trombone': 'Trombone',
            'flute': 'Flauta',
            'clarinet': 'Clarinete',
            'harmonica': 'Gaita',
            'ukulele': 'Ukulele',
            'banjo': 'Banjo',
            'mandolin': 'Bandolim',
            'dj': 'DJ',
            'producer': 'Produtor(a)',
            'other': 'Outro',
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

        if 'notes' in data:
            try:
                data['notes'] = sanitize_string(data.get('notes'), max_length=1000, allow_empty=True)
            except serializers.ValidationError as e:
                errors['notes'] = str(e.detail[0])

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
    rated_by_avatar = serializers.SerializerMethodField()
    event_title = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = MusicianRating
        fields = [
            'id', 'event', 'event_title', 'musician', 'musician_name',
            'rating', 'comment', 'rated_by', 'rated_by_name', 'rated_by_avatar',
            'time_ago', 'created_at'
        ]
        read_only_fields = ['id', 'rated_by', 'created_at']

    def get_musician_name(self, obj):
        return obj.musician.user.get_full_name() or obj.musician.user.username

    def get_rated_by_name(self, obj):
        return obj.rated_by.get_full_name() or obj.rated_by.username

    def get_rated_by_avatar(self, obj):
        """Retorna avatar do avaliador se ele tiver perfil de músico"""
        if hasattr(obj.rated_by, 'musician_profile') and obj.rated_by.musician_profile.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.rated_by.musician_profile.avatar.url)
        return None

    def get_time_ago(self, obj):
        """Retorna tempo decorrido desde a criação em formato legível"""
        from django.utils.timesince import timesince
        return timesince(obj.created_at)

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
            try:
                musician_id = int(item['musician_id'])
            except (TypeError, ValueError):
                raise serializers.ValidationError('musician_id inválido.')
            if musician_id <= 0:
                raise serializers.ValidationError('musician_id inválido.')
            item['musician_id'] = musician_id

            try:
                rating = int(item['rating'])
            except (TypeError, ValueError):
                raise serializers.ValidationError('Rating inválido.')
            if not 1 <= rating <= 5:
                raise serializers.ValidationError('Rating deve ser entre 1 e 5.')
            item['rating'] = rating
            if 'comment' in item:
                try:
                    item['comment'] = sanitize_string(item.get('comment'), max_length=1000, allow_empty=True)
                except serializers.ValidationError as e:
                    raise serializers.ValidationError(str(e.detail[0])) from e

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
        if 'notes' in attrs:
            attrs['notes'] = sanitize_string(attrs.get('notes'), max_length=255, allow_empty=True)
        return attrs


class MusicianBadgeSerializer(serializers.ModelSerializer):
    musician = MusicianSerializer(read_only=True)

    class Meta:
        model = MusicianBadge
        fields = ['id', 'musician', 'slug', 'name', 'description', 'icon', 'awarded_at']
        read_only_fields = fields


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer para organizações/empresas"""
    logo_url = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'org_type', 'description', 'logo', 'logo_url',
            'website', 'phone', 'contact_email', 'contact_name',
            'city', 'state', 'is_sponsor', 'sponsor_tier',
            'owner', 'owner_name', 'subscription_status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None


class OrganizationPublicSerializer(serializers.ModelSerializer):
    """Serializer público para patrocinadores (sem dados sensíveis)"""
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'org_type', 'description', 'logo_url',
            'website', 'city', 'state', 'sponsor_tier'
        ]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class MusicianRequestSerializer(serializers.ModelSerializer):
    """Serializer para solicitação de acesso de músicos"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MusicianRequest
        fields = [
            'id', 'email', 'full_name', 'phone',
            'instrument', 'instruments', 'bio',
            'city', 'state', 'instagram',
            'status', 'status_display', 'admin_notes',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'admin_notes', 'reviewed_by',
            'reviewed_at', 'created_at', 'updated_at'
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None

    def validate_email(self, value):
        """Verifica se email já não existe no sistema"""
        from django.contrib.auth.models import User
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Este email já está cadastrado no sistema.')
        if MusicianRequest.objects.filter(email__iexact=value, status='pending').exists():
            raise serializers.ValidationError('Já existe uma solicitação pendente para este email.')
        return value.lower()

    def validate(self, attrs):
        if 'full_name' in attrs:
            attrs['full_name'] = sanitize_string(attrs['full_name'], max_length=150, allow_empty=False)
        if 'phone' in attrs:
            attrs['phone'] = sanitize_string(attrs['phone'], max_length=20, allow_empty=False)
        if 'instrument' in attrs:
            attrs['instrument'] = sanitize_string(attrs['instrument'], max_length=100, allow_empty=False)
        if 'bio' in attrs:
            attrs['bio'] = sanitize_string(attrs.get('bio'), max_length=500, allow_empty=True)
        if 'city' in attrs:
            attrs['city'] = sanitize_string(attrs['city'], max_length=100, allow_empty=False)
        if 'state' in attrs:
            attrs['state'] = sanitize_string(attrs['state'], max_length=2, allow_empty=False, to_upper=True)
        if 'instagram' in attrs:
            instagram = sanitize_string(attrs.get('instagram'), max_length=100, allow_empty=True)
            if instagram and not instagram.startswith('@'):
                instagram = f'@{instagram}'
            attrs['instagram'] = instagram
        return attrs


class MusicianRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de solicitação (público)"""

    class Meta:
        model = MusicianRequest
        fields = [
            'email', 'full_name', 'phone',
            'instrument', 'instruments', 'bio',
            'city', 'state', 'instagram'
        ]

    def validate_email(self, value):
        from django.contrib.auth.models import User
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Este email já está cadastrado no sistema.')
        if MusicianRequest.objects.filter(email__iexact=value, status='pending').exists():
            raise serializers.ValidationError('Já existe uma solicitação pendente para este email.')
        return value.lower()

    def validate(self, attrs):
        if 'full_name' in attrs:
            attrs['full_name'] = sanitize_string(attrs['full_name'], max_length=150, allow_empty=False)
        if 'phone' in attrs:
            attrs['phone'] = sanitize_string(attrs['phone'], max_length=20, allow_empty=False)
        if 'instrument' in attrs:
            attrs['instrument'] = sanitize_string(attrs['instrument'], max_length=100, allow_empty=False)
        if 'bio' in attrs:
            attrs['bio'] = sanitize_string(attrs.get('bio'), max_length=500, allow_empty=True)
        if 'city' in attrs:
            attrs['city'] = sanitize_string(attrs['city'], max_length=100, allow_empty=False)
        if 'state' in attrs:
            attrs['state'] = sanitize_string(attrs['state'], max_length=2, allow_empty=False, to_upper=True)
        if 'instagram' in attrs:
            instagram = sanitize_string(attrs.get('instagram'), max_length=100, allow_empty=True)
            if instagram and not instagram.startswith('@'):
                instagram = f'@{instagram}'
            attrs['instagram'] = instagram
        return attrs


class MusicianRequestAdminSerializer(serializers.ModelSerializer):
    """Serializer para admin gerenciar solicitações"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MusicianRequest
        fields = [
            'id', 'email', 'full_name', 'phone',
            'instrument', 'instruments', 'bio',
            'city', 'state', 'instagram',
            'status', 'status_display', 'admin_notes',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'invite_token', 'invite_expires_at', 'invite_used',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'email', 'full_name', 'phone',
            'instrument', 'instruments', 'bio',
            'city', 'state', 'instagram',
            'reviewed_by', 'reviewed_at',
            'invite_token', 'invite_expires_at', 'invite_used',
            'created_at', 'updated_at'
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None


class ContactRequestSerializer(serializers.ModelSerializer):
    """Serializer para solicitações de contato"""
    from_organization_name = serializers.SerializerMethodField()
    from_user_name = serializers.SerializerMethodField()
    to_musician_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ContactRequest
        fields = [
            'id', 'from_organization', 'from_organization_name',
            'from_user', 'from_user_name',
            'to_musician', 'to_musician_name',
            'subject', 'message', 'event_date', 'event_location', 'budget_range',
            'status', 'status_display',
            'reply_message', 'replied_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'from_organization', 'from_user',
            'replied_at', 'created_at', 'updated_at'
        ]

    def get_from_organization_name(self, obj):
        return obj.from_organization.name if obj.from_organization else None

    def get_from_user_name(self, obj):
        return obj.from_user.get_full_name() or obj.from_user.username if obj.from_user else None

    def get_to_musician_name(self, obj):
        return obj.to_musician.user.get_full_name() or obj.to_musician.user.username if obj.to_musician else None


class ContactRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar solicitação de contato (empresa)"""

    class Meta:
        model = ContactRequest
        fields = [
            'to_musician', 'subject', 'message',
            'event_date', 'event_location', 'budget_range'
        ]

    def validate(self, attrs):
        if 'subject' in attrs:
            attrs['subject'] = sanitize_string(attrs['subject'], max_length=200, allow_empty=False)
        if 'message' in attrs:
            attrs['message'] = sanitize_string(attrs['message'], max_length=2000, allow_empty=False)
        if 'event_location' in attrs:
            attrs['event_location'] = sanitize_string(attrs.get('event_location'), max_length=200, allow_empty=True)
        if 'budget_range' in attrs:
            attrs['budget_range'] = sanitize_string(attrs.get('budget_range'), max_length=100, allow_empty=True)
        return attrs


class ContactRequestReplySerializer(serializers.Serializer):
    """Serializer para músico responder solicitação"""
    reply_message = serializers.CharField(max_length=2000)

    def validate_reply_message(self, value):
        return sanitize_string(value, max_length=2000, allow_empty=False)


class MusicianPublicSerializer(serializers.ModelSerializer):
    """Serializer público de músico (para empresas e landing pages)"""
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Musician
        fields = [
            'id', 'full_name', 'instrument', 'instruments', 'bio',
            'city', 'state', 'instagram',
            'avatar_url', 'cover_image_url',
            'average_rating', 'total_ratings'
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        return None


class CompanyRegisterSerializer(serializers.Serializer):
    """Serializer para registro de empresa"""
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    company_name = serializers.CharField(max_length=150)
    contact_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=2)
    org_type = serializers.ChoiceField(
        choices=[('company', 'Empresa'), ('venue', 'Casa de Shows')],
        default='company'
    )

    def validate_email(self, value):
        from django.contrib.auth.models import User
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Este email já está cadastrado.')
        return value.lower()

    def validate(self, attrs):
        attrs['company_name'] = sanitize_string(attrs['company_name'], max_length=150, allow_empty=False)
        attrs['contact_name'] = sanitize_string(attrs['contact_name'], max_length=150, allow_empty=False)
        if 'phone' in attrs:
            attrs['phone'] = sanitize_string(attrs.get('phone'), max_length=20, allow_empty=True)
        attrs['city'] = sanitize_string(attrs['city'], max_length=100, allow_empty=False)
        attrs['state'] = sanitize_string(attrs['state'], max_length=2, allow_empty=False, to_upper=True)
        return attrs

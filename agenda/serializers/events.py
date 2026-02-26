from datetime import datetime
from typing import Any

from django.utils import timezone
from rest_framework import serializers

from ..models import Event, EventInstrument, EventLog, Musician, MusicianRating
from ..validators import sanitize_string, validate_not_empty_string
from .availability import AvailabilitySerializer, LeaderAvailabilitySerializer


class EventListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de eventos"""

    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    availability_summary = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    approval_label = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "location",
            "payment_amount",
            "event_date",
            "start_time",
            "end_time",
            "is_private",
            "status",
            "status_display",
            "created_by_name",
            "approved_by_name",
            "approval_label",
            "availability_summary",
            "is_solo",
            "created_at",
            "created_by",
        ]

    def get_created_by_name(self, obj) -> str:
        return obj.created_by.get_full_name() if obj.created_by else "Sistema"

    def get_approved_by_name(self, obj) -> str | None:
        return obj.approved_by.get_full_name() if obj.approved_by else None

    def get_approval_label(self, obj) -> str:
        """Mostra quem confirmou o evento (texto unificado para approved e confirmed)"""
        if obj.status in ("approved", "confirmed"):
            # Para eventos approved, usa approved_by
            if obj.approved_by:
                name = obj.approved_by.get_full_name() or obj.approved_by.username
                return f"Confirmado por {name}"

            # Busca o último músico que aceitou
            last_available = (
                obj.availabilities.filter(response="available", responded_at__isnull=False)
                .order_by("-responded_at")
                .first()
            )

            if not last_available:
                last_available = (
                    obj.availabilities.filter(response="available")
                    .select_related("musician__user")
                    .first()
                )

            if last_available:
                name = (
                    last_available.musician.user.get_full_name()
                    or last_available.musician.user.username
                )
                return f"Confirmado por {name}"
            elif obj.created_by:
                name = obj.created_by.get_full_name() or obj.created_by.username
                return f"Confirmado por {name}"
        return obj.get_status_display()

    def get_availability_summary(self, obj) -> dict[str, int]:
        """
        Retorna resumo das disponibilidades.
        Usa valores pré-anotados se disponíveis (otimização N+1),
        caso contrário calcula com uma única iteração.
        """
        # Verifica se os valores foram pré-anotados no queryset
        if hasattr(obj, "avail_pending"):
            return {
                "pending": obj.avail_pending or 0,
                "available": obj.avail_available or 0,
                "unavailable": obj.avail_unavailable or 0,
                "total": obj.avail_total or 0,
            }

        # Fallback: calcula com uma única iteração (evita 5 queries)
        summary = {
            "pending": 0,
            "available": 0,
            "unavailable": 0,
            "total": 0,
        }
        for availability in obj.availabilities.all():
            response = availability.response
            if response in summary:
                summary[response] += 1
            summary["total"] += 1
        return summary


class EventLogSerializer(serializers.ModelSerializer):
    """Serializer simples para histórico do evento"""

    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EventLog
        fields = [
            "id",
            "action",
            "description",
            "performed_by",
            "performed_by_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_performed_by_name(self, obj) -> str:
        return obj.performed_by.get_full_name() if obj.performed_by else "Sistema"


class EventInstrumentSerializer(serializers.ModelSerializer):
    """Serializer para instrumentos necessários de um evento"""

    instrument_display = serializers.SerializerMethodField()

    class Meta:
        model = EventInstrument
        fields = ["id", "instrument", "instrument_display", "quantity"]
        read_only_fields = ["id"]

    def get_instrument_display(self, obj):
        return obj.get_instrument_label()


class EventDetailSerializer(serializers.ModelSerializer):
    """Serializer completo de evento com todas as disponibilidades"""

    availabilities = AvailabilitySerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    can_approve = serializers.SerializerMethodField()
    can_rate = serializers.SerializerMethodField()
    logs = serializers.SerializerMethodField()
    approval_label = serializers.SerializerMethodField()
    required_instruments = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "location",
            "venue_contact",
            "payment_amount",
            "event_date",
            "start_time",
            "end_time",
            "start_datetime",
            "end_datetime",
            "is_solo",
            "is_private",
            "status",
            "status_display",
            "can_approve",
            "can_rate",
            "created_by",
            "created_by_name",
            "approved_by",
            "approved_by_name",
            "approved_at",
            "rejection_reason",
            "approval_label",
            "availabilities",
            "required_instruments",
            "logs",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "start_datetime",
            "end_datetime",
            "created_by",
            "approved_by",
            "approved_at",
            "status",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]

    def get_created_by_name(self, obj) -> str:
        return obj.created_by.get_full_name() if obj.created_by else "Sistema"

    def get_approved_by_name(self, obj) -> str | None:
        return obj.approved_by.get_full_name() if obj.approved_by else None

    def get_can_approve(self, obj) -> bool:
        """
        Verifica se o usuário atual pode responder ao convite.
        Retorna True se o músico foi convidado e ainda não respondeu (pending).
        """
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        try:
            musician = request.user.musician_profile
            # Verifica se foi convidado e ainda está pendente
            availability = obj.availabilities.filter(musician=musician).first()
            if availability and availability.response == "pending":
                return True
            return False
        except Musician.DoesNotExist:
            return False

    def get_approval_label(self, obj) -> str:
        """Mostra quem confirmou o evento (texto unificado para approved e confirmed)"""
        if obj.status in ("approved", "confirmed"):
            # Para eventos approved, usa approved_by
            if obj.approved_by:
                name = obj.approved_by.get_full_name() or obj.approved_by.username
                return f"Confirmado por {name}"

            # Busca o último músico que aceitou
            last_available = (
                obj.availabilities.filter(response="available", responded_at__isnull=False)
                .order_by("-responded_at")
                .first()
            )

            if not last_available:
                last_available = (
                    obj.availabilities.filter(response="available")
                    .select_related("musician__user")
                    .first()
                )

            if last_available:
                name = (
                    last_available.musician.user.get_full_name()
                    or last_available.musician.user.username
                )
                return f"Confirmado por {name}"
            elif obj.created_by:
                name = obj.created_by.get_full_name() or obj.created_by.username
                return f"Confirmado por {name}"
        return obj.get_status_display()

    def get_logs(self, obj) -> list[dict[str, Any]]:
        """Retorna últimos registros de log (limitado para evitar payload grande)"""
        logs = obj.logs.select_related("performed_by").all()[:20]
        raw_logs = EventLogSerializer(logs, many=True).data

        # Ajusta textos de disponibilidade para PT-BR quando existirem registros antigos
        response_labels = {
            "available": "Disponível",
            "unavailable": "Indisponível",
            "pending": "Pendente",
        }

        adjusted_logs = []
        for log in raw_logs:
            desc = log.get("description", "")
            if log.get("action") == "availability":
                for eng, label in response_labels.items():
                    desc = desc.replace(f": {eng}", f": {label}")
            log["description"] = desc
            adjusted_logs.append(log)

        return adjusted_logs

    def get_can_rate(self, obj) -> bool:
        """
        Verifica se o usuário pode avaliar os músicos do evento.
        Condições: participante + data do evento já passou + ainda não avaliou
        """
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        # Participante: criador ou músico que aceitou o convite
        is_creator = obj.created_by == request.user
        is_invited = obj.availabilities.filter(
            musician__user=request.user, response="available"
        ).exists()
        if not (is_creator or is_invited):
            return False

        # Evento deve estar no passado (considera término real)
        event_end = obj.end_datetime
        if not event_end and obj.event_date and obj.end_time:
            event_end = timezone.make_aware(datetime.combine(obj.event_date, obj.end_time))

        if event_end and event_end >= timezone.now():
            return False

        # Verifica se já avaliou algum músico neste evento
        already_rated = MusicianRating.objects.filter(event=obj, rated_by=request.user).exists()

        return not already_rated

    def get_required_instruments(self, obj) -> list[dict[str, Any]]:
        """Retorna instrumentos necessários para o evento"""
        instruments = obj.required_instruments.all()
        return EventInstrumentSerializer(instruments, many=True).data

    def validate(self, data):
        """Validações customizadas"""
        errors = {}

        # Valida strings vazias em campos obrigatórios
        string_fields = ["title", "location"]
        for field in string_fields:
            if field in data:
                try:
                    data[field] = validate_not_empty_string(data[field])
                except serializers.ValidationError as e:
                    errors[field] = str(e.detail[0])

        optional_limits = {
            "description": 5000,
            "venue_contact": 200,
            "rejection_reason": 2000,
        }
        for field, max_len in optional_limits.items():
            if field in data:
                try:
                    data[field] = sanitize_string(
                        data.get(field), max_length=max_len, allow_empty=True
                    )
                except serializers.ValidationError as e:
                    errors[field] = str(e.detail[0])

        # Valida horários
        # Nota: end_time < start_time é permitido (eventos noturnos que cruzam meia-noite)
        start_time = data.get("start_time")
        end_time = data.get("end_time")

        if start_time and end_time:
            if end_time == start_time:
                # Duração zero não é permitida
                errors["end_time"] = (
                    "Evento deve ter duração mínima. Horário de término não pode ser igual ao início."
                )

        # Valida data (não pode ser no passado)
        event_date = data.get("event_date")
        if event_date and event_date < timezone.now().date():
            errors["event_date"] = "Não é possível criar eventos com datas passadas."

        # Proíbe edição de horários em eventos aprovados/confirmados (UPDATE)
        if self.instance:  # É um update
            if self.instance.status in ["approved", "confirmed"]:
                # Verifica se tentou mudar horários
                fields_changed = ["event_date", "start_time", "end_time"]
                for field in fields_changed:
                    if field in data and data[field] != getattr(self.instance, field):
                        errors[field] = (
                            f"Não é possível alterar {field} de eventos confirmados. Cancele e crie novo evento."
                        )

        if errors:
            raise serializers.ValidationError(errors)

        return data


class EventCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de eventos (campos simplificados)"""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    invited_musicians = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="Lista de IDs dos músicos a convidar para o evento",
    )
    required_instruments = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="Lista de instrumentos necessários [{instrument, quantity}]",
    )

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "location",
            "venue_contact",
            "payment_amount",
            "event_date",
            "start_time",
            "end_time",
            "is_solo",
            "is_private",
            "status",
            "status_display",
            "invited_musicians",
            "required_instruments",
        ]
        read_only_fields = ["id", "status", "status_display"]

    def validate_required_instruments(self, value):
        if not value:
            return []

        normalized = {}
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Cada instrumento deve ser um objeto.")

            instrument_raw = item.get("instrument", "")
            instrument = str(instrument_raw).strip()
            if not instrument:
                raise serializers.ValidationError("Instrumento é obrigatório.")

            quantity_raw = item.get("quantity", 1)
            try:
                quantity = int(quantity_raw)
            except (TypeError, ValueError):
                raise serializers.ValidationError("Quantidade inválida para instrumento.")

            if quantity <= 0:
                raise serializers.ValidationError("Quantidade deve ser maior que zero.")

            key = instrument.lower()
            if key in normalized:
                normalized[key]["quantity"] += quantity
            else:
                normalized[key] = {"instrument": instrument, "quantity": quantity}

        return list(normalized.values())

    def validate(self, data):
        """Validações"""
        errors = {}

        # Valida strings vazias em campos obrigatórios
        string_fields = ["title", "location"]
        for field in string_fields:
            if field in data:
                try:
                    data[field] = validate_not_empty_string(data[field])
                except serializers.ValidationError as e:
                    errors[field] = str(e.detail[0])

        # Validação de tamanho máximo para prevenir payload abuse
        max_lengths = {
            "title": (200, False),
            "description": (5000, True),
            "location": (300, False),
            "venue_contact": (200, True),
        }
        for field, (max_len, allow_empty) in max_lengths.items():
            value = data.get(field, "")
            try:
                data[field] = sanitize_string(value, max_length=max_len, allow_empty=allow_empty)
            except serializers.ValidationError as e:
                errors[field] = str(e.detail[0])

        # Permite end_time < start_time (eventos noturnos), mas não duração zero
        if data.get("end_time") and data.get("start_time"):
            if data["end_time"] == data["start_time"]:
                errors["end_time"] = (
                    "Evento deve ter duração mínima. Horário de término não pode ser igual ao início."
                )

        if data.get("event_date") and data["event_date"] < timezone.now().date():
            errors["event_date"] = "Não é possível criar eventos com datas passadas."

        if errors:
            raise serializers.ValidationError(errors)

        return data


class EventUpdateSerializer(EventCreateSerializer):
    """Serializer para atualização de eventos (permite convidar músicos)"""

    def validate(self, data):
        """Validações"""
        errors = {}

        # Valida strings vazias em campos obrigatórios
        string_fields = ["title", "location"]
        for field in string_fields:
            if field in data:
                try:
                    data[field] = validate_not_empty_string(data[field])
                except serializers.ValidationError as e:
                    errors[field] = str(e.detail[0])

        # Validação de tamanho máximo para prevenir payload abuse
        max_lengths = {
            "title": (200, False),
            "description": (5000, True),
            "location": (300, False),
            "venue_contact": (200, True),
        }
        for field, (max_len, allow_empty) in max_lengths.items():
            value = data.get(field, "")
            try:
                data[field] = sanitize_string(value, max_length=max_len, allow_empty=allow_empty)
            except serializers.ValidationError as e:
                errors[field] = str(e.detail[0])

        # Permite end_time < start_time (eventos noturnos), mas não duração zero
        if data.get("end_time") and data.get("start_time"):
            if data["end_time"] == data["start_time"]:
                errors["end_time"] = (
                    "Evento deve ter duração mínima. Horário de término não pode ser igual ao início."
                )

        if data.get("event_date") and data["event_date"] < timezone.now().date():
            errors["event_date"] = "Não é possível criar eventos com datas passadas."

        if errors:
            raise serializers.ValidationError(errors)

        return data


class PublicCalendarEventSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para eventos no calendário público.
    Visitantes veem apenas data/hora (sem título/local).
    """

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "event_date",
            "start_time",
            "end_time",
            "start_datetime",
            "end_datetime",
            "status",
            "status_display",
            "is_solo",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.is_private:
            # Exibe apenas bloqueio de agenda para visitantes
            data["status"] = "confirmed"
            data["status_display"] = "Ocupado"
        return data


class OwnerCalendarEventSerializer(serializers.ModelSerializer):
    """
    Serializer completo para eventos no calendário do dono.
    Usado pelo próprio músico (mostra todos os detalhes).
    """

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    availability_summary = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "location",
            "payment_amount",
            "event_date",
            "start_time",
            "end_time",
            "start_datetime",
            "end_datetime",
            "status",
            "status_display",
            "is_solo",
            "is_private",
            "availability_summary",
            "created_at",
            "updated_at",
        ]

    def get_availability_summary(self, obj):
        """
        Retorna resumo das disponibilidades.
        Calcula apenas uma vez (otimização N+1).
        """
        # Verifica se foi pré-anotado no queryset
        if hasattr(obj, "avail_pending"):
            return {
                "pending": obj.avail_pending or 0,
                "available": obj.avail_available or 0,
                "unavailable": obj.avail_unavailable or 0,
                "total": obj.avail_total or 0,
            }

        # Fallback: calcula com uma única iteração
        summary = {
            "pending": 0,
            "available": 0,
            "unavailable": 0,
            "total": 0,
        }
        for availability in obj.availabilities.all():
            response = availability.response
            if response in summary:
                summary[response] += 1
            summary["total"] += 1
        return summary


class PublicCalendarSerializer(serializers.Serializer):
    """
    Serializer principal para resposta do calendário público.
    Combina eventos e disponibilidades em um único array.
    """

    events = serializers.SerializerMethodField()
    availabilities = serializers.SerializerMethodField()
    is_owner = serializers.BooleanField(read_only=True)
    days_ahead = serializers.IntegerField(read_only=True)

    def get_events(self, obj):
        """
        Retorna eventos com base no tipo de usuário.
        Visitantes: apenas data/hora (sem título/local)
        Dono: todos os detalhes
        """
        events = obj.get("events", [])
        is_owner = obj.get("is_owner", False)

        # Escolhe serializer baseado em se é dono
        serializer_class = (
            OwnerCalendarEventSerializer if is_owner else PublicCalendarEventSerializer
        )

        return serializer_class(events, many=True, context=self.context).data

    def get_availabilities(self, obj):
        """
        Retorna disponibilidades públicas.
        Visitantes e dono veem as públicas.
        """
        availabilities = obj.get("availabilities", [])

        return LeaderAvailabilitySerializer(availabilities, many=True, context=self.context).data

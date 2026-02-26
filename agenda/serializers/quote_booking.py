from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from ..models import Booking, BookingEvent, QuoteProposal, QuoteRequest
from ..validators import sanitize_string


class QuoteRequestSerializer(serializers.ModelSerializer):
    """Serializer de pedido de orçamento."""

    contractor_name = serializers.CharField(source="contractor.name", read_only=True)
    musician_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = QuoteRequest
        fields = [
            "id",
            "contractor",
            "contractor_name",
            "musician",
            "musician_name",
            "event_date",
            "event_type",
            "location_city",
            "location_state",
            "venue_name",
            "duration_hours",
            "notes",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "contractor", "created_at", "updated_at"]

    def get_musician_name(self, obj):
        return obj.musician.user.get_full_name() or obj.musician.user.username


class QuoteRequestCreateSerializer(serializers.ModelSerializer):
    """Criação de pedido de orçamento (contratante)."""

    class Meta:
        model = QuoteRequest
        fields = [
            "musician",
            "event_date",
            "event_type",
            "location_city",
            "location_state",
            "venue_name",
            "duration_hours",
            "notes",
        ]

    def validate(self, attrs):
        event_date = attrs.get("event_date")
        if event_date and event_date < timezone.localdate():
            raise serializers.ValidationError(
                {"event_date": "A data do evento não pode estar no passado."}
            )
        duration_hours = attrs.get("duration_hours")
        if duration_hours is not None and duration_hours <= 0:
            raise serializers.ValidationError(
                {"duration_hours": "A duração deve ser maior que zero."}
            )
        attrs["event_type"] = sanitize_string(
            attrs["event_type"], max_length=120, allow_empty=False
        )
        attrs["location_city"] = sanitize_string(
            attrs["location_city"], max_length=100, allow_empty=False
        )
        attrs["location_state"] = sanitize_string(
            attrs["location_state"], max_length=2, allow_empty=False, to_upper=True
        )
        if "venue_name" in attrs:
            attrs["venue_name"] = sanitize_string(
                attrs.get("venue_name"), max_length=150, allow_empty=True
            )
        if "notes" in attrs:
            attrs["notes"] = sanitize_string(attrs.get("notes"), max_length=2000, allow_empty=True)
        return attrs


class QuoteProposalSerializer(serializers.ModelSerializer):
    """Serializer de propostas de orçamento."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = QuoteProposal
        fields = [
            "id",
            "request",
            "message",
            "proposed_value",
            "valid_until",
            "status",
            "status_display",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class QuoteProposalCreateSerializer(serializers.ModelSerializer):
    """Criação de proposta pelo músico."""

    class Meta:
        model = QuoteProposal
        fields = ["message", "proposed_value", "valid_until"]

    def validate_message(self, value):
        return sanitize_string(value, max_length=2000, allow_empty=False)

    def validate_proposed_value(self, value):
        if value is not None:
            if value <= 0:
                raise serializers.ValidationError("O valor proposto deve ser positivo.")
            if value > Decimal("100000.00"):
                raise serializers.ValidationError(
                    "Valor excede o máximo permitido (R$ 100.000,00)."
                )
        return value


class BookingSerializer(serializers.ModelSerializer):
    """Serializer de reserva."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "request",
            "status",
            "status_display",
            "reserved_at",
            "confirmed_at",
            "completed_at",
            "cancel_reason",
        ]
        read_only_fields = ["id", "reserved_at"]


class BookingEventSerializer(serializers.ModelSerializer):
    """Serializer de auditoria de reserva."""

    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = BookingEvent
        fields = [
            "id",
            "request",
            "actor_type",
            "actor_user",
            "actor_name",
            "action",
            "metadata",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_actor_name(self, obj):
        if obj.actor_user:
            return obj.actor_user.get_full_name() or obj.actor_user.username
        return None

from rest_framework import serializers

from ..models import Availability, LeaderAvailability, Musician
from ..validators import sanitize_string
from .musician import MusicianSerializer


class AvailabilitySerializer(serializers.ModelSerializer):
    """Serializer de disponibilidade com dados do músico"""

    musician = MusicianSerializer(read_only=True)
    musician_id = serializers.PrimaryKeyRelatedField(
        queryset=Musician.objects.all(),
        source="musician",
        write_only=True,
        required=False,  # Será setado automaticamente na view
    )

    class Meta:
        model = Availability
        fields = [
            "id",
            "musician",
            "musician_id",
            "event",
            "response",
            "notes",
            "responded_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "responded_at", "created_at", "updated_at"]

    def validate(self, attrs):
        if self.instance and "musician" in attrs:
            raise serializers.ValidationError(
                {"musician_id": "Não é permitido alterar o músico desta disponibilidade."}
            )
        if self.instance and "event" in attrs and attrs["event"] != self.instance.event:
            raise serializers.ValidationError(
                {"event": "Não é permitido alterar o evento desta disponibilidade."}
            )
        if "notes" in attrs:
            attrs["notes"] = sanitize_string(attrs.get("notes"), max_length=1000, allow_empty=True)
        return attrs


class LeaderAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer para disponibilidades cadastradas pelo músico"""

    leader_name = serializers.SerializerMethodField()
    leader_instrument = serializers.SerializerMethodField()
    leader_instrument_display = serializers.SerializerMethodField()
    leader_avatar_url = serializers.SerializerMethodField()
    has_conflicts = serializers.SerializerMethodField()
    conflicting_events_count = serializers.SerializerMethodField()

    class Meta:
        model = LeaderAvailability
        fields = [
            "id",
            "leader",
            "leader_name",
            "leader_instrument",
            "leader_instrument_display",
            "leader_avatar_url",
            "date",
            "start_time",
            "end_time",
            "start_datetime",
            "end_datetime",
            "notes",
            "is_active",
            "is_public",
            "has_conflicts",
            "conflicting_events_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "start_datetime",
            "end_datetime",
            "leader",
            "created_at",
            "updated_at",
        ]

    def get_leader_name(self, obj) -> str:
        return obj.leader.user.get_full_name() if obj.leader else "Sistema"

    def get_leader_instrument(self, obj) -> str | None:
        return obj.leader.instrument if obj.leader else None

    def get_leader_avatar_url(self, obj) -> str | None:
        if obj.leader and obj.leader.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.leader.avatar.url)
            return obj.leader.avatar.url
        return None

    def get_leader_instrument_display(self, obj) -> str | None:
        if not obj.leader or not obj.leader.instrument:
            return None
        instrument_labels = {
            "vocal": "Vocal",
            "guitar": "Guitarra",
            "acoustic_guitar": "Violão",
            "bass": "Baixo",
            "drums": "Bateria",
            "keyboard": "Teclado",
            "piano": "Piano",
            "synth": "Sintetizador",
            "percussion": "Percussão",
            "cajon": "Cajón",
            "violin": "Violino",
            "viola": "Viola",
            "cello": "Violoncelo",
            "double_bass": "Contrabaixo acústico",
            "saxophone": "Saxofone",
            "trumpet": "Trompete",
            "trombone": "Trombone",
            "flute": "Flauta",
            "clarinet": "Clarinete",
            "harmonica": "Gaita",
            "ukulele": "Ukulele",
            "banjo": "Banjo",
            "mandolin": "Bandolim",
            "dj": "DJ",
            "producer": "Produtor(a)",
            "other": "Outro",
        }
        return instrument_labels.get(obj.leader.instrument, obj.leader.instrument)

    def get_has_conflicts(self, obj) -> bool:
        """
        Verifica se há conflitos com eventos existentes.
        Usa cache para evitar query duplicada com conflicting_events_count.
        """
        # Usa cache no objeto para evitar query duplicada
        if not hasattr(obj, "_cached_conflicts_count"):
            obj._cached_conflicts_count = obj.get_conflicting_events().count()
        return obj._cached_conflicts_count > 0

    def get_conflicting_events_count(self, obj) -> int:
        """
        Conta eventos conflitantes.
        Usa cache para evitar query duplicada com has_conflicts.
        """
        if not hasattr(obj, "_cached_conflicts_count"):
            obj._cached_conflicts_count = obj.get_conflicting_events().count()
        return obj._cached_conflicts_count

    def validate(self, data):
        """Validações customizadas"""
        errors = {}

        # Valida horários - permite cruzar meia-noite; apenas bloqueia duração zero
        start_time = data.get("start_time")
        end_time = data.get("end_time")

        if start_time and end_time:
            if end_time == start_time:
                errors["end_time"] = "Horário de término deve ser posterior ao início."

        # Valida data (não pode ser no passado)
        from django.utils import timezone

        date = data.get("date")
        if date and date < timezone.now().date():
            errors["date"] = "Não é possível cadastrar disponibilidades em datas passadas."

        if "notes" in data:
            try:
                data["notes"] = sanitize_string(
                    data.get("notes"), max_length=1000, allow_empty=True
                )
            except serializers.ValidationError as e:
                errors["notes"] = str(e.detail[0])

        if errors:
            raise serializers.ValidationError(errors)

        return data

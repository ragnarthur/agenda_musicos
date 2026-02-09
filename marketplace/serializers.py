from decimal import Decimal, InvalidOperation
from typing import Any

from rest_framework import serializers

from agenda.validators import sanitize_string

from .models import Gig, GigApplication


class GigApplicationSerializer(serializers.ModelSerializer):
    """Candidatura de músico a uma oportunidade."""

    musician_name = serializers.SerializerMethodField()

    class Meta:
        model = GigApplication
        fields = [
            "id",
            "gig",
            "musician",
            "musician_name",
            "cover_letter",
            "expected_fee",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "gig", "musician", "status", "created_at"]

    def get_musician_name(self, obj) -> str:
        return obj.musician.user.get_full_name() or obj.musician.user.username

    def validate_cover_letter(self, value):
        """Limita tamanho da carta de apresentação"""
        return sanitize_string(value, max_length=2000, allow_empty=True)

    def validate_expected_fee(self, value):
        if value in [None, ""]:
            return None
        try:
            amount = Decimal(str(value))
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError("Valor esperado inválido.")
        if amount < 0:
            raise serializers.ValidationError("Valor esperado não pode ser negativo.")
        return amount


class GigSerializer(serializers.ModelSerializer):
    """Oportunidade de show/vaga publicada no marketplace."""

    created_by_name = serializers.SerializerMethodField()
    applications_count = serializers.SerializerMethodField()
    applications = GigApplicationSerializer(many=True, read_only=True)
    my_application = serializers.SerializerMethodField()

    class Meta:
        model = Gig
        fields = [
            "id",
            "title",
            "description",
            "city",
            "location",
            "event_date",
            "start_time",
            "end_time",
            "budget",
            "contact_name",
            "contact_email",
            "contact_phone",
            "genres",
            "status",
            "created_by",
            "created_by_name",
            "applications_count",
            "applications",
            "my_application",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "created_by",
            "created_at",
            "updated_at",
            "applications_count",
            "applications",
            "my_application",
        ]

    def validate(self, data):
        """Validação de tamanhos máximos para prevenir payload abuse"""
        errors = {}
        max_lengths = {
            "title": (200, False),
            "description": (5000, True),
            "city": (100, True),
            "location": (200, True),
            "contact_name": (100, True),
            "genres": (120, True),
            "contact_phone": (30, True),
        }
        for field, (max_len, allow_empty) in max_lengths.items():
            if field in data:
                try:
                    data[field] = sanitize_string(
                        data.get(field), max_length=max_len, allow_empty=allow_empty
                    )
                except serializers.ValidationError as e:
                    errors[field] = str(e.detail[0])

        if "contact_email" in data:
            try:
                data["contact_email"] = sanitize_string(
                    data.get("contact_email"),
                    max_length=255,
                    allow_empty=True,
                    to_lower=True,
                )
            except serializers.ValidationError as e:
                errors["contact_email"] = str(e.detail[0])

        if errors:
            raise serializers.ValidationError(errors)
        return data

    def get_created_by_name(self, obj) -> str:
        if not obj.created_by:
            return "Cliente"
        return obj.created_by.get_full_name() or obj.created_by.username

    def _can_view_contact(self, obj, request) -> bool:
        if not request or not request.user.is_authenticated:
            return False
        if request.user.is_staff or obj.created_by_id == request.user.id:
            return True

        musician = getattr(request.user, "musician_profile", None)
        if not musician:
            return False

        cached_apps = getattr(obj, "_prefetched_objects_cache", {}).get("applications")
        if cached_apps is None:
            cached_apps = list(obj.applications.all())

        return any(
            app.musician_id == musician.id and app.status == "hired"
            for app in cached_apps
        )

    def get_applications_count(self, obj) -> int:
        # Usa anotação se disponível (evita query adicional)
        if hasattr(obj, "applications_total"):
            return obj.applications_total
        return obj.applications.count()

    def get_my_application(self, obj) -> dict[str, Any] | None:
        """Retorna a candidatura do músico logado (se existir)."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None

        musician = getattr(request.user, "musician_profile", None)
        if not musician:
            return None

        try:
            application = obj.applications.get(musician=musician)
        except GigApplication.DoesNotExist:
            return None

        return GigApplicationSerializer(application).data

    def to_representation(self, instance):
        """Oculta candidaturas completas para usuários que não são donos da vaga."""
        data = super().to_representation(instance)
        request = self.context.get("request")
        is_owner = (
            request
            and request.user.is_authenticated
            and instance.created_by_id == request.user.id
        )

        if not is_owner:
            data.pop("applications", None)

        if not self._can_view_contact(instance, request):
            data["contact_name"] = None
            data["contact_email"] = None
            data["contact_phone"] = None

        return data

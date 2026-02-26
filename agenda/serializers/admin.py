from django.contrib.auth.models import User
from rest_framework import serializers

from ..models import (
    City,
    CulturalNotice,
    Instrument,
    Musician,
    MusicianRequest,
    Organization,
)
from ..validators import sanitize_string
from .utils import normalize_genre_value


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer para organizações/patrocinadores"""

    logo_url = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    ALLOWED_LOGO_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")
    ALLOWED_LOGO_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
    MAX_LOGO_SIZE_BYTES = 10 * 1024 * 1024

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "org_type",
            "description",
            "logo",
            "logo_url",
            "website",
            "phone",
            "contact_email",
            "contact_name",
            "city",
            "state",
            "is_sponsor",
            "sponsor_tier",
            "owner",
            "owner_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

    def get_owner_name(self, obj):
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None

    def validate_logo(self, value):
        if not value:
            return value

        if value.size > self.MAX_LOGO_SIZE_BYTES:
            raise serializers.ValidationError("Logo muito grande. Tamanho máximo: 10MB.")

        file_name = (value.name or "").lower()
        if not file_name.endswith(self.ALLOWED_LOGO_EXTENSIONS):
            raise serializers.ValidationError("Formato inválido. Use JPG, PNG ou WEBP.")

        content_type = (getattr(value, "content_type", "") or "").lower()
        if content_type and content_type not in self.ALLOWED_LOGO_CONTENT_TYPES:
            raise serializers.ValidationError("Tipo de arquivo inválido. Use JPG, PNG ou WEBP.")

        return value


class OrganizationPublicSerializer(serializers.ModelSerializer):
    """Serializer público para patrocinadores (sem dados sensíveis)"""

    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "org_type",
            "description",
            "logo_url",
            "website",
            "city",
            "state",
            "sponsor_tier",
        ]

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class MusicianRequestSerializer(serializers.ModelSerializer):
    """Serializer para solicitação de acesso de músicos"""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MusicianRequest
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "instrument",
            "instruments",
            "bio",
            "city",
            "state",
            "instagram",
            "musical_genres",
            "status",
            "status_display",
            "admin_notes",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "admin_notes",
            "reviewed_by",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None

    def validate_email(self, value):
        """Verifica se email já não existe no sistema"""
        from django.contrib.auth.models import User

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Este email já está cadastrado no sistema.")
        if MusicianRequest.objects.filter(email__iexact=value, status="pending").exists():
            raise serializers.ValidationError("Já existe uma solicitação pendente para este email.")
        return value.lower()

    def validate(self, attrs):
        if "full_name" in attrs:
            attrs["full_name"] = sanitize_string(
                attrs["full_name"], max_length=150, allow_empty=False
            )
        if "phone" in attrs:
            attrs["phone"] = sanitize_string(attrs["phone"], max_length=20, allow_empty=False)
        if "instrument" in attrs:
            attrs["instrument"] = sanitize_string(
                attrs["instrument"], max_length=100, allow_empty=False
            )
        if "bio" in attrs:
            attrs["bio"] = sanitize_string(attrs.get("bio"), max_length=500, allow_empty=True)
        if "city" in attrs:
            attrs["city"] = sanitize_string(attrs["city"], max_length=100, allow_empty=False)
        if "state" in attrs:
            attrs["state"] = sanitize_string(
                attrs["state"], max_length=2, allow_empty=False, to_upper=True
            )
        if "instagram" in attrs:
            instagram = sanitize_string(attrs.get("instagram"), max_length=100, allow_empty=True)
            if instagram and not instagram.startswith("@"):
                instagram = f"@{instagram}"
            attrs["instagram"] = instagram
        if "musical_genres" in attrs:
            genres = attrs.get("musical_genres") or []
            if not isinstance(genres, list):
                genres = []
            attrs["musical_genres"] = [
                normalize_genre_value(sanitize_string(g, max_length=50, allow_empty=False))
                for g in genres[:5]
                if g and isinstance(g, str)
            ]
        return attrs


class MusicianRequestPublicStatusSerializer(serializers.ModelSerializer):
    """Serializer público para status de solicitação (sem dados sensíveis)."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = MusicianRequest
        fields = [
            "id",
            "status",
            "status_display",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class MusicianRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de solicitação (público)"""

    class Meta:
        model = MusicianRequest
        fields = [
            "email",
            "full_name",
            "phone",
            "instrument",
            "instruments",
            "bio",
            "city",
            "state",
            "instagram",
            "musical_genres",
        ]

    def validate_email(self, value):
        from django.contrib.auth.models import User

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Este email já está cadastrado no sistema.")
        if MusicianRequest.objects.filter(email__iexact=value, status="pending").exists():
            raise serializers.ValidationError("Já existe uma solicitação pendente para este email.")
        return value.lower()

    def validate(self, attrs):
        if "full_name" in attrs:
            attrs["full_name"] = sanitize_string(
                attrs["full_name"], max_length=150, allow_empty=False
            )
        if "phone" in attrs:
            attrs["phone"] = sanitize_string(attrs["phone"], max_length=20, allow_empty=False)
        if "instrument" in attrs:
            attrs["instrument"] = sanitize_string(
                attrs["instrument"], max_length=100, allow_empty=False
            )
        if "bio" in attrs:
            attrs["bio"] = sanitize_string(attrs.get("bio"), max_length=500, allow_empty=True)
        if "city" in attrs:
            attrs["city"] = sanitize_string(attrs["city"], max_length=100, allow_empty=False)
        if "state" in attrs:
            attrs["state"] = sanitize_string(
                attrs["state"], max_length=2, allow_empty=False, to_upper=True
            )
        if "instagram" in attrs:
            instagram = sanitize_string(attrs.get("instagram"), max_length=100, allow_empty=True)
            if instagram and not instagram.startswith("@"):
                instagram = f"@{instagram}"
            attrs["instagram"] = instagram
        if "musical_genres" in attrs:
            genres = attrs.get("musical_genres") or []
            if not isinstance(genres, list):
                genres = []
            attrs["musical_genres"] = [
                normalize_genre_value(sanitize_string(g, max_length=50, allow_empty=False))
                for g in genres[:5]
                if g and isinstance(g, str)
            ]
        return attrs


class MusicianRequestAdminSerializer(serializers.ModelSerializer):
    """Serializer para admin gerenciar solicitações"""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MusicianRequest
        fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "instrument",
            "instruments",
            "bio",
            "city",
            "state",
            "instagram",
            "musical_genres",
            "status",
            "status_display",
            "admin_notes",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "invite_token",
            "invite_expires_at",
            "invite_used",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "full_name",
            "phone",
            "instrument",
            "instruments",
            "bio",
            "city",
            "state",
            "instagram",
            "reviewed_by",
            "reviewed_at",
            "invite_token",
            "invite_expires_at",
            "invite_used",
            "created_at",
            "updated_at",
        ]

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None


class InstrumentSerializer(serializers.ModelSerializer):
    """Serializer para listar instrumentos."""

    class Meta:
        model = Instrument
        fields = ["id", "name", "display_name", "type", "usage_count"]
        read_only_fields = ["id", "usage_count"]


class InstrumentCreateSerializer(serializers.Serializer):
    """Serializer para criar novo instrumento customizado."""

    display_name = serializers.CharField(
        max_length=50, min_length=3, help_text="Nome do instrumento (ex: 'Cavaquinho')"
    )

    def validate_display_name(self, value):
        """Valida e normaliza nome do instrumento."""
        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError("Nome muito curto (mínimo 3 caracteres)")

        if len(value) > 50:
            raise serializers.ValidationError("Nome muito longo (máximo 50 caracteres)")

        # Normaliza para verificar duplicata
        normalized = Instrument.normalize_name(value)

        # Verifica se já existe (case-insensitive)
        if Instrument.objects.filter(name=normalized).exists():
            existing = Instrument.objects.get(name=normalized)
            raise serializers.ValidationError(f"Instrumento já existe: '{existing.display_name}'")

        return value

    def create(self, validated_data):
        display_name = validated_data["display_name"]
        normalized = Instrument.normalize_name(display_name)

        instrument = Instrument.objects.create(
            name=normalized,
            display_name=display_name,
            type="community",
            created_by=self.context["request"].user,
            is_approved=True,  # Auto-aprovar por enquanto
        )

        return instrument


class CitySerializer(serializers.ModelSerializer):
    """Serializer de cidade com contagens de músicos e solicitações"""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    musicians_count = serializers.SerializerMethodField()
    requests_count = serializers.SerializerMethodField()
    pending_requests_count = serializers.SerializerMethodField()

    class Meta:
        model = City
        fields = [
            "id",
            "name",
            "state",
            "slug",
            "status",
            "status_display",
            "description",
            "is_active",
            "priority",
            "musicians_count",
            "requests_count",
            "pending_requests_count",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_by", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_musicians_count(self, obj):
        """Conta músicos ativos na cidade"""
        return Musician.objects.filter(
            city__iexact=obj.name, state__iexact=obj.state, is_active=True
        ).count()

    def get_requests_count(self, obj):
        """Conta total de solicitações da cidade"""
        return MusicianRequest.objects.filter(
            city__iexact=obj.name, state__iexact=obj.state
        ).count()

    def get_pending_requests_count(self, obj):
        """Conta solicitações pendentes da cidade"""
        return MusicianRequest.objects.filter(
            city__iexact=obj.name, state__iexact=obj.state, status="pending"
        ).count()


class CityCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação/atualização de cidade"""

    class Meta:
        model = City
        fields = [
            "name",
            "state",
            "status",
            "description",
            "is_active",
            "priority",
        ]

    def validate_name(self, value):
        return sanitize_string(value, max_length=100, allow_empty=False)

    def validate_state(self, value):
        return sanitize_string(value, max_length=2, allow_empty=False, to_upper=True)

    def validate_description(self, value):
        if value:
            return sanitize_string(value, max_length=1000, allow_empty=True)
        return value

    def validate(self, attrs):
        """Valida unicidade de nome+estado"""
        name = attrs.get("name")
        state = attrs.get("state")

        if name and state:
            existing = City.objects.filter(name__iexact=name, state__iexact=state)
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    {"name": f"Já existe uma cidade {name}, {state} cadastrada."}
                )

        return attrs


class CityStatsSerializer(serializers.Serializer):
    """Serializer para estatísticas de cidade (agrupamento por cidade/estado)"""

    city = serializers.CharField()
    state = serializers.CharField()
    total_requests = serializers.IntegerField()
    pending_requests = serializers.IntegerField()
    approved_requests = serializers.IntegerField()
    rejected_requests = serializers.IntegerField()
    active_musicians = serializers.IntegerField()
    city_obj = serializers.SerializerMethodField()

    def get_city_obj(self, obj):
        """Retorna dados da cidade cadastrada, se existir"""
        try:
            city = City.objects.get(name__iexact=obj["city"], state__iexact=obj["state"])
            return {
                "id": city.id,
                "status": city.status,
                "status_display": city.get_status_display(),
                "is_active": city.is_active,
            }
        except City.DoesNotExist:
            return None


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer para gerenciar usuários admin"""

    musician_is_premium = serializers.SerializerMethodField()
    has_musician_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_superuser",
            "is_active",
            "date_joined",
            "musician_is_premium",
            "has_musician_profile",
        ]
        read_only_fields = ["id", "date_joined"]

    def get_musician_is_premium(self, obj) -> bool | None:
        try:
            return bool(obj.musician_profile.is_premium)
        except Exception:
            return None

    def get_has_musician_profile(self, obj) -> bool:
        return hasattr(obj, "musician_profile")


class AdminCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar novo admin (apenas owners)"""

    password = serializers.CharField(write_only=True, required=True, min_length=8)
    is_superuser = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name", "is_superuser"]

    def create(self, validated_data):
        request = self.context.get("request")
        allow_superuser = bool(request and getattr(request.user, "is_superuser", False))
        make_superuser = validated_data.pop("is_superuser", False) and allow_superuser
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = make_superuser
        user.save()
        return user


class AdminUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualizar admin (apenas owners)"""

    password = serializers.CharField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "password", "is_active"]
        read_only_fields = ["id", "username"]

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        if password:
            instance.set_password(password)
        return super().update(instance, validated_data)


class CulturalNoticeSerializer(serializers.ModelSerializer):
    """Serializer completo para CRUD administrativo do conteúdo premium."""

    BR_UF_CODES = {
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
    }

    class Meta:
        model = CulturalNotice
        fields = [
            "id",
            "title",
            "summary",
            "category",
            "state",
            "city",
            "source_name",
            "source_url",
            "thumbnail_url",
            "deadline_at",
            "event_date",
            "published_at",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def validate_state(self, value: str) -> str:
        normalized = (value or "").strip().upper()
        if normalized not in self.BR_UF_CODES:
            raise serializers.ValidationError("UF inválida. Use uma sigla oficial com 2 letras.")
        return normalized


class PremiumPortalItemSerializer(serializers.Serializer):
    """
    Serializer de saída do portal premium.
    Mantém contrato estável consumido pelo frontend.
    """

    source = serializers.CharField()
    external_id = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True, required=False)
    category = serializers.ChoiceField(
        choices=["rouanet", "aldir_blanc", "festival", "edital", "premio", "noticia", "other"]
    )
    scope = serializers.ChoiceField(choices=["nacional", "estadual", "municipal"])
    state = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    city = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    external_url = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    thumbnail_url = serializers.URLField(allow_blank=True, allow_null=True, required=False)
    deadline = serializers.DateField(allow_null=True, required=False)
    event_date = serializers.DateField(allow_null=True, required=False)
    published_at = serializers.DateField()

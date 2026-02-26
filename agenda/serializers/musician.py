from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from ..models import Instrument, Musician
from ..validators import sanitize_string
from .utils import normalize_genre_value
from .user import UserSerializer


class MusicianSerializer(serializers.ModelSerializer):
    """Serializer de músico com dados do usuário"""

    user = UserSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    public_email = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Musician
        fields = [
            "id",
            "user",
            "full_name",
            "instrument",
            "instruments",
            "bio",
            "phone",
            "instagram",
            "whatsapp",
            "city",
            "state",
            "avatar_url",
            "cover_image_url",
            "base_fee",
            "travel_fee_per_km",
            "equipment_items",
            "public_email",
            "is_active",
            "is_premium",
            "average_rating",
            "total_ratings",
            "created_at",
            "musical_genres",
        ]
        read_only_fields = ["id", "is_premium", "average_rating", "total_ratings", "created_at"]

    def get_full_name(self, obj) -> str:
        return obj.user.get_full_name() or obj.user.username

    def get_public_email(self, obj) -> str | None:
        """Retorna email apenas para o próprio usuário (privacidade)"""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            if request.user.id == obj.user.id:
                return obj.user.email
        return None

    def get_avatar_url(self, obj) -> str | None:
        """Retorna URL completa do avatar"""
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_cover_image_url(self, obj) -> str | None:
        """Retorna URL completa da imagem de capa"""
        if obj.cover_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        return None


class MusicianUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualização do próprio perfil de músico"""

    first_name = serializers.CharField(required=False, allow_blank=False, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=False, max_length=150)

    class Meta:
        model = Musician
        fields = [
            "first_name",
            "last_name",
            "instrument",
            "instruments",
            "bio",
            "phone",
            "instagram",
            "whatsapp",
            "city",
            "state",
            "base_fee",
            "travel_fee_per_km",
            "equipment_items",
            "musical_genres",
        ]

    def validate_base_fee(self, value):
        if value is None:
            return value
        try:
            decimal_value = Decimal(str(value))
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError("Valor do cachê inválido.")
        if decimal_value < 0:
            raise serializers.ValidationError("Valor do cachê não pode ser negativo.")
        return decimal_value

    def validate_travel_fee_per_km(self, value):
        if value is None:
            return value
        try:
            decimal_value = Decimal(str(value))
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError("Valor por km inválido.")
        if decimal_value < 0:
            raise serializers.ValidationError("Valor por km não pode ser negativo.")
        return decimal_value

    def validate_equipment_items(self, value):
        if value in [None, ""]:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Equipamentos devem ser enviados como lista.")
        if len(value) > 30:
            raise serializers.ValidationError("Máximo de 30 equipamentos/serviços.")

        cleaned_items = []
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    "Cada equipamento deve ser um objeto com nome e valor."
                )

            name = str(item.get("name", "")).strip()
            if not name:
                # Ignora itens vazios
                continue
            if len(name) > 80:
                raise serializers.ValidationError(
                    "Nome de equipamento deve ter no máximo 80 caracteres."
                )

            raw_price = item.get("price")
            if raw_price in [None, ""]:
                price_decimal = None
            else:
                try:
                    price_decimal = Decimal(str(raw_price))
                except (InvalidOperation, TypeError):
                    raise serializers.ValidationError(f"Valor inválido para o equipamento {name}.")

                if price_decimal < 0:
                    raise serializers.ValidationError(f"O valor de {name} não pode ser negativo.")

            cleaned_items.append(
                {
                    "name": name,
                    "price": (
                        price_decimal
                        if price_decimal is None
                        else float(price_decimal.quantize(Decimal("0.01")))
                    ),
                }
            )

        return cleaned_items

    def validate(self, attrs):
        if "first_name" in attrs:
            attrs["first_name"] = sanitize_string(
                attrs.get("first_name"), max_length=150, allow_empty=False
            )

        if "last_name" in attrs:
            attrs["last_name"] = sanitize_string(
                attrs.get("last_name"), max_length=150, allow_empty=False
            )

        if "instrument" in attrs:
            attrs["instrument"] = sanitize_string(
                attrs.get("instrument"), max_length=50, allow_empty=False, to_lower=True
            )

        if "instruments" in attrs:
            instruments_raw = attrs.get("instruments") or []
            if not isinstance(instruments_raw, list):
                raise serializers.ValidationError(
                    {"instruments": "Instrumentos devem ser enviados como lista."}
                )
            if len(instruments_raw) > 10:
                raise serializers.ValidationError(
                    {"instruments": "Máximo de 10 instrumentos permitidos."}
                )
            cleaned = []
            for item in instruments_raw:
                cleaned_item = sanitize_string(
                    item, max_length=50, allow_empty=False, to_lower=True
                )
                if cleaned_item:
                    cleaned.append(cleaned_item)
            # Remove duplicados usando dict.fromkeys
            cleaned = list(dict.fromkeys(cleaned))
            attrs["instruments"] = cleaned
            # Adiciona instrumento principal no início se fornecido e não estiver na lista
            if attrs.get("instrument"):
                if attrs["instrument"] not in cleaned:
                    attrs["instruments"] = [attrs["instrument"], *cleaned]
                else:
                    # Instrumento já está na lista, mantém ele como primeiro
                    cleaned_without_main = [inst for inst in cleaned if inst != attrs["instrument"]]
                    attrs["instruments"] = [attrs["instrument"], *cleaned_without_main]

        if "bio" in attrs:
            attrs["bio"] = sanitize_string(attrs.get("bio"), max_length=350, allow_empty=True)

        if "phone" in attrs:
            attrs["phone"] = sanitize_string(attrs.get("phone"), max_length=20, allow_empty=True)

        if "whatsapp" in attrs:
            attrs["whatsapp"] = sanitize_string(
                attrs.get("whatsapp"), max_length=20, allow_empty=True
            )

        if "instagram" in attrs:
            instagram = sanitize_string(attrs.get("instagram"), max_length=100, allow_empty=True)
            if instagram and not instagram.startswith("@"):
                instagram = f"@{instagram}"
            attrs["instagram"] = instagram

        if "city" in attrs:
            attrs["city"] = sanitize_string(attrs.get("city"), max_length=100, allow_empty=True)

        if "state" in attrs:
            attrs["state"] = sanitize_string(
                attrs.get("state"), max_length=2, allow_empty=True, to_upper=True
            )

        if "musical_genres" in attrs:
            genres = attrs.get("musical_genres") or []
            if not isinstance(genres, list):
                genres = []
            # Limitar a 5 gêneros e sanitizar
            attrs["musical_genres"] = [
                normalize_genre_value(sanitize_string(g, max_length=50, allow_empty=False))
                for g in genres[:5]
                if g and isinstance(g, str)
            ]

        return attrs

    def update(self, instance, validated_data):
        """Atualiza perfil do músico e gerencia contadores de uso de instrumentos."""
        from django.utils import timezone

        # Campos de nome do usuario (User)
        user = instance.user
        first_name = validated_data.pop("first_name", None)
        last_name = validated_data.pop("last_name", None)

        name_changed = False
        if first_name is not None or last_name is not None:
            new_first = first_name if first_name is not None else user.first_name
            new_last = last_name if last_name is not None else user.last_name
            name_changed = new_first != user.first_name or new_last != user.last_name

            if name_changed:
                today = timezone.now().date()
                month_start = today.replace(day=1)

                if instance.name_changes_month != month_start:
                    instance.name_changes_month = month_start
                    instance.name_changes_count = 0

                if instance.name_changes_count >= 2:
                    raise serializers.ValidationError(
                        {
                            "detail": "Limite mensal de alteracoes de nome atingido (2 por mes). Tente novamente no proximo mes."
                        }
                    )

                user.first_name = new_first
                user.last_name = new_last
                user.save(update_fields=["first_name", "last_name"])

                instance.name_changes_count += 1

        # Guarda instrumentos antigos antes de atualizar
        old_instruments = set(instance.instruments) if instance.instruments else set()

        # Atualiza o músico com os novos dados
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Atualiza contadores de uso de instrumentos
        new_instruments = set(instance.instruments) if instance.instruments else set()

        # Instrumentos removidos: decrementar
        removed = old_instruments - new_instruments
        for inst_name in removed:
            try:
                instrument = Instrument.objects.get(name=Instrument.normalize_name(inst_name))
                instrument.usage_count = max(0, instrument.usage_count - 1)
                instrument.save(update_fields=["usage_count"])
            except Instrument.DoesNotExist:
                pass

        # Instrumentos adicionados: incrementar
        added = new_instruments - old_instruments
        for inst_name in added:
            try:
                instrument = Instrument.objects.get(name=Instrument.normalize_name(inst_name))
                instrument.increment_usage()
            except Instrument.DoesNotExist:
                # Criar se não existir
                Instrument.objects.get_or_create(
                    name=Instrument.normalize_name(inst_name),
                    defaults={
                        "display_name": inst_name.capitalize(),
                        "type": "community",
                        "is_approved": True,
                        "usage_count": 1,
                    },
                )

        return instance


class MusicianPublicSerializer(serializers.ModelSerializer):
    """Serializer público de músico (para contratantes e landing pages)"""

    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Musician
        fields = [
            "id",
            "full_name",
            "instrument",
            "instruments",
            "bio",
            "city",
            "state",
            "avatar_url",
            "cover_image_url",
            "average_rating",
            "total_ratings",
            "musical_genres",
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def get_cover_image_url(self, obj):
        if obj.cover_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.cover_image.url)
            return obj.cover_image.url
        return None

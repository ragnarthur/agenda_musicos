from rest_framework import serializers

from ..models import Connection, Musician, MusicianBadge, MusicianRating
from ..validators import sanitize_string
from .musician import MusicianSerializer


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
            "id",
            "event",
            "event_title",
            "musician",
            "musician_name",
            "rating",
            "comment",
            "rated_by",
            "rated_by_name",
            "rated_by_avatar",
            "time_ago",
            "created_at",
        ]
        read_only_fields = ["id", "rated_by", "created_at"]

    def get_musician_name(self, obj):
        return obj.musician.user.get_full_name() or obj.musician.user.username

    def get_rated_by_name(self, obj):
        return obj.rated_by.get_full_name() or obj.rated_by.username

    def get_rated_by_avatar(self, obj):
        """Retorna avatar do avaliador se ele tiver perfil de músico"""
        if hasattr(obj.rated_by, "musician_profile") and obj.rated_by.musician_profile.avatar:
            request = self.context.get("request")
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
        help_text="Lista de avaliações [{musician_id, rating, comment}]",
    )

    def validate_ratings(self, value):
        """Valida lista de ratings"""
        if not value:
            raise serializers.ValidationError("Lista de avaliações não pode estar vazia.")

        for item in value:
            if "musician_id" not in item:
                raise serializers.ValidationError("Cada avaliação deve conter musician_id.")
            if "rating" not in item:
                raise serializers.ValidationError("Cada avaliação deve conter rating.")
            try:
                musician_id = int(item["musician_id"])
            except (TypeError, ValueError):
                raise serializers.ValidationError("musician_id inválido.")
            if musician_id <= 0:
                raise serializers.ValidationError("musician_id inválido.")
            item["musician_id"] = musician_id

            try:
                rating = int(item["rating"])
            except (TypeError, ValueError):
                raise serializers.ValidationError("Rating inválido.")
            if not 1 <= rating <= 5:
                raise serializers.ValidationError("Rating deve ser entre 1 e 5.")
            item["rating"] = rating
            if "comment" in item:
                try:
                    item["comment"] = sanitize_string(
                        item.get("comment"), max_length=1000, allow_empty=True
                    )
                except serializers.ValidationError as e:
                    raise serializers.ValidationError(str(e.detail[0])) from e

        return value


class ConnectionSerializer(serializers.ModelSerializer):
    follower = MusicianSerializer(read_only=True)
    target = MusicianSerializer(read_only=True)
    target_id = serializers.PrimaryKeyRelatedField(
        source="target",
        queryset=Musician.objects.filter(is_active=True),
        write_only=True,
    )

    class Meta:
        model = Connection
        fields = [
            "id",
            "follower",
            "target",
            "target_id",
            "connection_type",
            "verified",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "follower", "created_at"]

    def validate(self, attrs):
        target = attrs.get("target") or getattr(self.instance, "target", None)
        request = self.context.get("request")
        if request and hasattr(request.user, "musician_profile") and target:
            follower = request.user.musician_profile
            if follower == target:
                raise serializers.ValidationError("Você não pode criar conexão consigo mesmo.")
        if "notes" in attrs:
            attrs["notes"] = sanitize_string(attrs.get("notes"), max_length=255, allow_empty=True)
        return attrs


class MusicianBadgeSerializer(serializers.ModelSerializer):
    musician = MusicianSerializer(read_only=True)

    class Meta:
        model = MusicianBadge
        fields = ["id", "musician", "slug", "name", "description", "icon", "awarded_at"]
        read_only_fields = fields

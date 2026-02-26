from django.contrib.auth.models import User
from rest_framework import serializers

from ..models import ContractorProfile
from ..validators import sanitize_string


class UserSerializer(serializers.ModelSerializer):
    """Serializer básico de usuário para uso nested"""

    full_name = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "full_name",
            "is_staff",
        ]
        read_only_fields = ["id"]

    def get_full_name(self, obj) -> str:
        return obj.get_full_name() or obj.username

    def get_email(self, obj) -> str | None:
        """Retorna email apenas para o próprio usuário"""
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            # Mostra email apenas para o próprio usuário
            if request.user.id == obj.id:
                return obj.email
        return None


class ContractorProfileSerializer(serializers.ModelSerializer):
    """Serializer do perfil de contratante."""

    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ContractorProfile
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "city",
            "state",
            "accepted_terms_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "accepted_terms_at",
            "is_active",
            "created_at",
            "updated_at",
        ]


class ContractorRegisterSerializer(serializers.Serializer):
    """Serializer para registro de contratante."""

    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=2)

    def validate_email(self, value):
        from django.contrib.auth.models import User

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Este email já está cadastrado.")
        return value.lower()

    def validate(self, attrs):
        attrs["name"] = sanitize_string(attrs["name"], max_length=150, allow_empty=False)
        if "phone" in attrs:
            attrs["phone"] = sanitize_string(attrs.get("phone"), max_length=20, allow_empty=True)
        attrs["city"] = sanitize_string(attrs["city"], max_length=100, allow_empty=False)
        attrs["state"] = sanitize_string(
            attrs["state"], max_length=2, allow_empty=False, to_upper=True
        )
        return attrs

"""
Serializers customizados para autenticação.
"""

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer que permite autenticação por email OU username.
    """

    def validate(self, attrs):
        # Pega o valor inserido (pode ser email ou username)
        login_field = attrs.get("username", "")
        password = attrs.get("password", "")

        # Tenta encontrar o usuário
        user = None

        # Primeiro tenta como username
        try:
            user = User.objects.get(username=login_field)
        except User.DoesNotExist:
            # Se não encontrou, tenta como email
            try:
                user = User.objects.get(email=login_field)
                # Se encontrou por email, atualiza o username para validação
                attrs["username"] = user.username
            except User.DoesNotExist:
                pass

        # Continua com a validação normal
        return super().validate(attrs)

"""
Views para gerenciamento de administradores.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.contrib.auth import get_user_model

from .permissions import IsAppOwner
from .serializers import (
    AdminUserSerializer,
    AdminCreateSerializer,
    AdminUpdateSerializer,
)

User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAppOwner])
def list_admin_users(request):
    """Lista todos os usuários admin (apenas owners)"""
    admins = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).order_by(
        "-date_joined"
    )

    serializer = AdminUserSerializer(admins, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAppOwner])
def get_admin_user(request, pk):
    """Detalhes de um admin específico (apenas owners)"""
    try:
        user = User.objects.get(pk=pk)
        if not (user.is_staff or user.is_superuser):
            return Response(
                {"error": "Usuário não é administrador"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AdminUserSerializer(user)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response(
            {"error": "Usuário não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAppOwner])
def create_admin_user(request):
    """Cria novo admin (apenas owners)"""
    serializer = AdminCreateSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated, IsAppOwner])
def update_admin_user(request, pk):
    """Atualiza admin (apenas owners)"""
    try:
        user = User.objects.get(pk=pk)

        # Protege admin_1 e admin_2 de alteração de senha
        if user.username in ["admin_1", "admin_2"]:
            # Só permite atualizar email e is_active
            if request.data.get("password"):
                return Response(
                    {"error": "Não é permitido alterar a senha de admin_1 ou admin_2"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            # Remove campos bloqueados
            request_data = request.data.copy()
            request_data.pop("username", None)
            request_data.pop("password", None)
            serializer = AdminUpdateSerializer(user, data=request_data, partial=True)
        else:
            # Outros admins podem ser alterados normalmente
            serializer = AdminUpdateSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            user = serializer.save()
            return Response(AdminUserSerializer(user).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except User.DoesNotExist:
        return Response(
            {"error": "Usuário não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsAppOwner])
def delete_admin_user(request, pk):
    """Deleta admin (apenas owners)"""
    try:
        user = User.objects.get(pk=pk)

        # Protege admin_1 e admin_2 de deleção
        if user.username in ["admin_1", "admin_2"]:
            return Response(
                {"error": "Não é permitido deletar admin_1 ou admin_2"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not (user.is_staff or user.is_superuser):
            return Response(
                {"error": "Usuário não é administrador"},
                status=status.HTTP_404_NOT_FOUND,
            )

        username = user.username
        user.delete()
        return Response(
            {"message": f"Admin {username} deletado com sucesso"},
            status=status.HTTP_200_OK,
        )

    except User.DoesNotExist:
        return Response(
            {"error": "Usuário não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAppOwner])
def reset_admin_password(request, pk):
    """Reseta senha de admin (apenas owners)"""
    try:
        user = User.objects.get(pk=pk)

        if not (user.is_staff or user.is_superuser):
            return Response(
                {"error": "Usuário não é administrador"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Para admin_1 e admin_2, senha fixa
        if user.username in ["admin_1", "admin_2"]:
            new_password = "Teste123@"
        else:
            # Para outros admins, gera senha aleatória
            import secrets

            new_password = secrets.token_urlsafe(12)

        user.set_password(new_password)
        user.save()

        return Response(
            {
                "message": "Senha resetada com sucesso",
                "password": new_password if request.user.is_superuser else None,
            },
            status=status.HTTP_200_OK,
        )

    except User.DoesNotExist:
        return Response(
            {"error": "Usuário não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )

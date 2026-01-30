# agenda/permissions.py
from rest_framework import permissions

from .models import Musician


class IsLeaderOrReadOnly(permissions.BasePermission):
    """
    Compat: liderança foi descontinuada na plataforma.
    Mantenha apenas para cenários legados.
    """

    def has_permission(self, request, view):
        # Leitura permitida para todos autenticados
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # Escrita sempre negada fora de métodos seguros
        if request.user and request.user.is_authenticated:
            try:
                return request.user.musician_profile.is_leader()
            except Musician.DoesNotExist:
                return False
        return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permissão: apenas o criador pode editar/deletar.
    """

    def has_object_permission(self, request, view, obj):
        # Leitura permitida
        if request.method in permissions.SAFE_METHODS:
            return True

        # Escrita apenas para o criador
        return obj.created_by == request.user

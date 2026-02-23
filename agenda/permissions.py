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
        if not getattr(obj, "created_by", None):
            return False
        return obj.created_by == request.user


class IsAppOwner(permissions.BasePermission):
    """
    Permissão que verifica se o usuário é um dono do app.
    Considera donos:
    - Proprietários de Organization (role=owner)
    - Superusers (apenas para verificação)
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers sempre têm acesso
        if request.user.is_superuser:
            return True

        # Verifica se é owner de alguma organização
        from .models import Membership

        has_owner_membership = Membership.objects.filter(
            user=request.user, role="owner", status="active"
        ).exists()

        return has_owner_membership

    def has_object_permission(self, request, view, obj):
        # Donos podem modificar qualquer User
        return self.has_permission(request, view)


class IsPremiumMusician(permissions.BasePermission):
    """
    Acesso restrito a músicos com is_premium=True.
    Retorna 403 se autenticado mas não-premium; 401 se não autenticado.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            return request.user.musician_profile.is_premium
        except Exception:
            return False

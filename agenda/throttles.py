# agenda/throttles.py
"""
Throttles customizados para rate limiting de endpoints específicos.
"""

from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para endpoint de login.
    Previne brute force attacks.
    """

    scope = "login"

    def get_cache_key(self, request, view):
        # Usa IP + username para identificar tentativas
        ident = self.get_ident(request)
        username = request.data.get("username", "")
        return f"throttle_login_{ident}_{username}"


class CreateEventRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para criação de eventos.
    Previne spam de criação de eventos.
    """

    scope = "create_event"

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f"throttle_create_event_{request.user.pk}"
        return self.get_ident(request)


class PreviewConflictsRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para preview de conflitos.
    Endpoint chamado frequentemente durante criação de eventos.
    """

    scope = "preview_conflicts"

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f"throttle_preview_{request.user.pk}"
        return self.get_ident(request)


class BurstRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para prevenir burst requests.
    Mais restritivo que o padrão para ações sensíveis.
    """

    scope = "burst"

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f"throttle_burst_{request.user.pk}"
        return self.get_ident(request)


class RegisterRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para registro de usuários.
    Previne spam de criação de contas.
    """

    scope = "register"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        email = request.data.get("email", "")
        return f"throttle_register_{ident}_{email}"


class PasswordResetRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para reset de senha.
    Previne abuso de endpoint de reset.
    """

    scope = "password_reset"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        email = request.data.get("email", "")
        return f"throttle_password_reset_{ident}_{email}"


class ContactRequestRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para solicitações de contato.
    Previne spam entre músicos.
    """

    scope = "contact_request"

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f"throttle_contact_{request.user.pk}"
        return self.get_ident(request)


class MusicianRequestRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para solicitações de entrada na plataforma.
    Previne spam de cadastros.
    """

    scope = "musician_request"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        email = request.data.get("email", "")
        return f"throttle_musician_request_{ident}_{email}"


class ProfileUpdateRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para atualização de perfil.
    Previne atualizações excessivas.
    """

    scope = "profile_update"

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f"throttle_profile_update_{request.user.pk}"
        return self.get_ident(request)


class PublicRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para endpoints públicos.
    Previne abuso de APIs públicas.
    """

    scope = "public"

    def get_cache_key(self, request, view):
        return self.get_ident(request)


class PreviewConflictsRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para preview de conflitos.
    Endpoint chamado frequentemente durante criação de eventos.
    """

    scope = "preview_conflicts"

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f"throttle_preview_{request.user.pk}"
        return self.get_ident(request)


class BurstRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para prevenir burst requests.
    Mais restritivo que o padrão para ações sensíveis.
    """

    scope = "burst"

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f"throttle_burst_{request.user.pk}"
        return self.get_ident(request)

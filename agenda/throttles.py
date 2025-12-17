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
    scope = 'login'

    def get_cache_key(self, request, view):
        # Usa IP + username para identificar tentativas
        ident = self.get_ident(request)
        username = request.data.get('username', '')
        return f'throttle_login_{ident}_{username}'


class CreateEventRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para criação de eventos.
    Previne spam de criação de eventos.
    """
    scope = 'create_event'

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f'throttle_create_event_{request.user.pk}'
        return self.get_ident(request)


class PreviewConflictsRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para preview de conflitos.
    Endpoint chamado frequentemente durante criação de eventos.
    """
    scope = 'preview_conflicts'

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f'throttle_preview_{request.user.pk}'
        return self.get_ident(request)


class BurstRateThrottle(SimpleRateThrottle):
    """
    Rate limiting para prevenir burst requests.
    Mais restritivo que o padrão para ações sensíveis.
    """
    scope = 'burst'

    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return f'throttle_burst_{request.user.pk}'
        return self.get_ident(request)

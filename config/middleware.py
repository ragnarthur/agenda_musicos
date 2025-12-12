# config/middleware.py
from decouple import config


class CSPMiddleware:
    """
    Adiciona header Content-Security-Policy configurável via .env (CSP_HEADER).
    Padrão seguro para backend/API, permitindo somente recursos próprios,
    imagens data/https e conexões para self.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        default_csp = (
            "default-src 'self'; "
            "img-src 'self' data: https:; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "connect-src 'self'"
        )
        self.csp_header = config('CSP_HEADER', default=default_csp)

    def __call__(self, request):
        response = self.get_response(request)
        # Não sobrescreve se já definido por algum proxy
        if 'Content-Security-Policy' not in response:
            response['Content-Security-Policy'] = self.csp_header
        return response

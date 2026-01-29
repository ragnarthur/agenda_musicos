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
        self.csp_header = config("CSP_HEADER", default=default_csp)

    def __call__(self, request):
        response = self.get_response(request)
        # Não sobrescreve se já definido por algum proxy
        if "Content-Security-Policy" not in response:
            response["Content-Security-Policy"] = self.csp_header
        return response


class JWTAuthCookieMiddleware:
    """
    Permite que clientes usem cookies HttpOnly (access_token) em vez de expor o JWT no localStorage.
    Se o header Authorization não vier, injeta o token do cookie para que o SimpleJWT processe normalmente.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if "HTTP_AUTHORIZATION" not in request.META:
            access_token = request.COOKIES.get("access_token")
            if access_token:
                request.META["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"
        response = self.get_response(request)
        return response


class SecurityHeadersMiddleware:
    """
    Adiciona headers de segurança HTTP para proteção contra ataques comuns.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # X-Content-Type-Options: previne MIME-sniffing
        response["X-Content-Type-Options"] = "nosniff"

        # X-Frame-Options: previne clickjacking
        response["X-Frame-Options"] = "DENY"

        # X-XSS-Protection: ativa filtro XSS do browser
        response["X-XSS-Protection"] = "1; mode=block"

        # Referrer-Policy: limita informações de referrer
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy: desativa recursos desnecessários
        response["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        return response


class MaxRequestSizeMiddleware:
    """
    Limita tamanho máximo de requisição para prevenir DoS.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.max_size = 10 * 1024 * 1024  # 10MB

    def __call__(self, request):
        content_length = request.META.get("CONTENT_LENGTH")
        if content_length:
            try:
                content_length = int(content_length)
            except (TypeError, ValueError):
                content_length = None
        if content_length and content_length > self.max_size:
            from rest_framework.response import Response
            from rest_framework import status

            return Response(
                {"detail": "Payload muito grande. Máximo: 10MB."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        return self.get_response(request)

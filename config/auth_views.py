# config/auth_views.py
from datetime import timedelta
from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from agenda.throttles import LoginRateThrottle

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


def _cookie_settings():
    # ✅ respeita uma flag do settings (pra não depender de HTTPS)
    secure = getattr(settings, "COOKIE_SECURE", (not settings.DEBUG))
    return {"secure": secure, "httponly": True, "samesite": "Lax", "path": "/"}


def _max_age(delta: timedelta) -> int:
    return int(delta.total_seconds())


class CookieTokenMixin:
    def set_auth_cookies(self, response, tokens: dict):
        access = tokens.get("access")
        refresh = tokens.get("refresh")
        cookie_opts = _cookie_settings()

        if access:
            response.set_cookie(
                ACCESS_COOKIE,
                access,
                max_age=_max_age(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]),
                **cookie_opts,
            )

        if refresh:
            response.set_cookie(
                REFRESH_COOKIE,
                refresh,
                max_age=_max_age(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]),
                **cookie_opts,
            )

    @staticmethod
    def clear_auth_cookies(response):
        response.delete_cookie(ACCESS_COOKIE, path="/")
        response.delete_cookie(REFRESH_COOKIE, path="/")


class CookieTokenObtainPairView(CookieTokenMixin, TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # tokens padrão do SimpleJWT
        tokens = dict(response.data)  # {"refresh": "...", "access": "..."}

        # seta cookies (opcional)
        self.set_auth_cookies(response, tokens)

        # ✅ NÃO mata o payload — o frontend precisa disso
        response.data = {
            "detail": "Autenticado com sucesso.",
            **tokens,
        }
        return response


class CookieTokenRefreshView(CookieTokenMixin, TokenRefreshView):
    def post(self, request, *args, **kwargs):
        data = request.data.copy()

        if "refresh" not in data:
            refresh_cookie = request.COOKIES.get(REFRESH_COOKIE)
            if not refresh_cookie:
                return Response(
                    {"detail": "Refresh token ausente."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            data["refresh"] = refresh_cookie

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        # ✅ devolve access/refresh também (muitos frontends esperam)
        payload = dict(serializer.validated_data)
        response = Response(
            {"detail": "Tokens renovados com sucesso.", **payload},
            status=status.HTTP_200_OK,
        )
        self.set_auth_cookies(response, payload)
        return response


class CookieTokenLogoutView(CookieTokenMixin, APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        response = Response({"detail": "Logout realizado com sucesso."}, status=status.HTTP_200_OK)
        self.clear_auth_cookies(response)
        return response

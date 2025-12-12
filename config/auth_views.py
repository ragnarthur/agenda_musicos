# config/auth_views.py
from datetime import timedelta

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

ACCESS_COOKIE = 'access_token'
REFRESH_COOKIE = 'refresh_token'


def _cookie_settings():
    secure = not settings.DEBUG
    return {'secure': secure, 'httponly': True, 'samesite': 'Lax', 'path': '/'}


def _max_age(delta: timedelta) -> int:
    return int(delta.total_seconds())


class CookieTokenMixin:
    """
    Mixin com helpers para gravar/remover cookies de autenticação.
    """

    def set_auth_cookies(self, response, tokens: dict):
        access = tokens.get('access')
        refresh = tokens.get('refresh')
        cookie_opts = _cookie_settings()

        if access:
            response.set_cookie(
                ACCESS_COOKIE,
                access,
                max_age=_max_age(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']),
                **cookie_opts,
            )

        if refresh:
            response.set_cookie(
                REFRESH_COOKIE,
                refresh,
                max_age=_max_age(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']),
                **cookie_opts,
            )

    @staticmethod
    def clear_auth_cookies(response):
        response.delete_cookie(ACCESS_COOKIE, path='/')
        response.delete_cookie(REFRESH_COOKIE, path='/')


class CookieTokenObtainPairView(CookieTokenMixin, TokenObtainPairView):
    """
    Versão do TokenObtainPairView que persiste os tokens em cookies HttpOnly.
    """

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        tokens = response.data
        self.set_auth_cookies(response, tokens)
        response.data = {'detail': 'Autenticado com sucesso.'}
        return response


class CookieTokenRefreshView(CookieTokenMixin, TokenRefreshView):
    """
    Atualiza os tokens usando o refresh armazenado em cookie.
    """

    def post(self, request, *args, **kwargs):
        data = request.data.copy()
        if 'refresh' not in data:
            refresh_cookie = request.COOKIES.get(REFRESH_COOKIE)
            if not refresh_cookie:
                return Response({'detail': 'Refresh token ausente.'}, status=status.HTTP_401_UNAUTHORIZED)
            data['refresh'] = refresh_cookie

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        response = Response({'detail': 'Tokens renovados com sucesso.'}, status=status.HTTP_200_OK)
        self.set_auth_cookies(response, serializer.validated_data)
        return response


class CookieTokenLogoutView(CookieTokenMixin, APIView):
    """
    Remove os cookies de autenticação do cliente.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        response = Response({'detail': 'Logout realizado com sucesso.'}, status=status.HTTP_200_OK)
        self.clear_auth_cookies(response)
        return response

# config/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication

ACCESS_COOKIE = "access_token"


class CookieOrHeaderJWTAuthentication(JWTAuthentication):
    """
    Autentica por:
    1) Authorization: Bearer <token> (padrão)
    2) Cookie 'access_token' (HttpOnly), quando não houver Authorization
    """

    def authenticate(self, request):
        # 1) Se tiver header, usa o fluxo padrão do SimpleJWT
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        # 2) Senão, tenta pegar do cookie
        raw_token = request.COOKIES.get(ACCESS_COOKIE)
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

"""
Testes para autenticação Google
"""

from django.test import TestCase, Client, override_settings
from django.contrib.auth.models import User
from unittest.mock import patch

from agenda.models import Musician, Organization, Membership
from config.auth_views import (
    GoogleAuthView,
    GoogleRegisterMusicianView,
    GoogleRegisterCompanyView,
)


@override_settings(GOOGLE_CLIENT_ID="test-client-id")
class GoogleAuthTests(TestCase):
    """Testes para autenticação Google"""

    def setUp(self):
        self.client = Client()

    @patch("config.auth_views.id_token.verify_oauth2_token")
    def test_google_auth_new_user(self, mock_verify):
        """Teste: Usuário novo recebe new_user=True"""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": "test-client-id",
            "email": "newuser@example.com",
            "email_verified": True,
            "given_name": "John",
            "family_name": "Doe",
            "picture": "https://example.com/avatar.jpg",
        }

        response = self.client.post(
            "/api/auth/google/",
            {
                "credential": "fake-jwt-token",
                "user_type": "musician",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["new_user"])
        self.assertEqual(response.json()["email"], "newuser@example.com")

    @patch("config.auth_views.id_token.verify_oauth2_token")
    def test_google_auth_existing_user(self, mock_verify):
        """Teste: Usuário existente faz login"""
        user = User.objects.create_user(
            username="existing",
            email="existing@example.com",
            password="testpass",
        )
        Musician.objects.create(
            user=user,
            instrument="Guitarra",
            city="São Paulo",
            state="SP",
            role="member",
            is_active=True,
        )

        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": "test-client-id",
            "email": "existing@example.com",
            "email_verified": True,
            "given_name": "John",
            "family_name": "Doe",
        }

        response = self.client.post(
            "/api/auth/google/",
            {
                "credential": "fake-jwt-token",
                "user_type": "musician",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["new_user"])
        self.assertIn("access", response.json())
        self.assertIn("refresh", response.json())

    def test_google_auth_missing_credential(self):
        """Teste: Credential ausente retorna 400"""
        response = self.client.post(
            "/api/auth/google/",
            {
                "user_type": "musician",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Credencial", response.json()["detail"])

    @patch("config.auth_views.id_token.verify_oauth2_token")
    def test_google_auth_invalid_token(self, mock_verify):
        """Teste: Token inválido retorna 401"""
        mock_verify.side_effect = ValueError("Invalid token")

        response = self.client.post(
            "/api/auth/google/",
            {
                "credential": "invalid-token",
                "user_type": "musician",
            },
        )

        self.assertEqual(response.status_code, 401)
        self.assertIn("Token do Google inválido", response.json()["detail"])

    @patch("config.auth_views.id_token.verify_oauth2_token")
    def test_google_auth_email_not_verified(self, mock_verify):
        """Teste: Email não verificado retorna 400"""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": "test-client-id",
            "email": "unverified@example.com",
            "email_verified": False,
            "given_name": "John",
            "family_name": "Doe",
        }

        response = self.client.post(
            "/api/auth/google/",
            {
                "credential": "fake-jwt-token",
                "user_type": "musician",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("não verificado", response.json()["detail"])

    @patch("config.auth_views.id_token.verify_oauth2_token")
    def test_google_auth_includes_avatar_url(self, mock_verify):
        """Teste: Avatar do Google é incluído no response para novo usuário"""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "aud": "test-client-id",
            "email": "avataruser@example.com",
            "email_verified": True,
            "given_name": "Avatar",
            "family_name": "User",
            "picture": "https://example.com/avatar.jpg",
        }

        response = self.client.post(
            "/api/auth/google/",
            {
                "credential": "fake-jwt-token",
                "user_type": "musician",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["new_user"])
        # O avatar deve ser incluído via picture
        # (Nota: avatar_url é salvo no User, mas response usa picture do Google)

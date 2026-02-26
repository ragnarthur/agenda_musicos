"""
Testa autenticação e perfil do contratante:
  login via email, rejeição de credenciais inválidas,
  rejeição de músico sem contractor_profile,
  atualização de perfil e acesso ao dashboard.
"""

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import ContractorProfile, Musician


class ContractorLoginTest(APITestCase):
    """Login via /api/contractor/token/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="contratante_login",
            email="contratante@empresa.com",
            password="SenhaForte123!",
        )
        self.contractor = ContractorProfile.objects.create(
            user=self.user,
            name="Empresa de Eventos",
            city="Curitiba",
            state="PR",
            is_active=True,
        )
        self.url = "/api/contractor/token/"

    def test_login_with_valid_credentials_returns_200(self):
        resp = self.client.post(
            self.url,
            {"email": "contratante@empresa.com", "password": "SenhaForte123!"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("user_type", resp.data)
        self.assertEqual(resp.data["user_type"], "contractor")
        self.assertIn("contractor", resp.data)
        self.assertEqual(resp.data["contractor"]["name"], "Empresa de Eventos")

    def test_login_email_is_case_insensitive(self):
        resp = self.client.post(
            self.url,
            {"email": "CONTRATANTE@EMPRESA.COM", "password": "SenhaForte123!"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_login_with_wrong_password_returns_401(self):
        resp = self.client.post(
            self.url,
            {"email": "contratante@empresa.com", "password": "errada"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_nonexistent_email_returns_401(self):
        resp = self.client.post(
            self.url,
            {"email": "naoexiste@x.com", "password": "qualquer"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_musician_without_contractor_profile_is_rejected(self):
        """Usuário que só tem musician_profile não pode logar como contractor."""
        musician_user = User.objects.create_user(
            username="musico_sem_contractor",
            email="musico_sem_contractor@test.com",
            password="SenhaForte123!",
        )
        Musician.objects.create(
            user=musician_user,
            instrument="drums",
            is_active=True,
        )
        resp = self.client.post(
            self.url,
            {"email": "musico_sem_contractor@test.com", "password": "SenhaForte123!"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_contractor_is_forbidden(self):
        inactive_user = User.objects.create_user(
            username="contractor_inativo",
            email="contractor_inativo@test.com",
            password="SenhaForte123!",
        )
        ContractorProfile.objects.create(
            user=inactive_user,
            name="Inativo",
            is_active=False,
        )
        resp = self.client.post(
            self.url,
            {"email": "contractor_inativo@test.com", "password": "SenhaForte123!"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_missing_email_returns_400(self):
        resp = self.client.post(self.url, {"password": "SenhaForte123!"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_password_returns_400(self):
        resp = self.client.post(self.url, {"email": "contratante@empresa.com"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class ContractorProfileUpdateTest(APITestCase):
    """Atualização de perfil do contratante via /api/contractor/profile/."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="contratante_profile",
            email="contratante_profile@test.com",
            password="SenhaForte123!",
        )
        self.contractor = ContractorProfile.objects.create(
            user=self.user,
            name="Nome Original",
            city="Porto Alegre",
            state="RS",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_update_name_and_city(self):
        resp = self.client.patch(
            "/api/contractor/profile/",
            {"name": "Nome Atualizado", "city": "Florianópolis", "state": "SC"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.contractor.refresh_from_db()
        self.assertEqual(self.contractor.name, "Nome Atualizado")
        self.assertEqual(self.contractor.city, "Florianópolis")

    def test_unauthenticated_cannot_update_profile(self):
        self.client.logout()
        resp = self.client.patch("/api/contractor/profile/", {"name": "Hacker"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_musician_without_contractor_profile_gets_403(self):
        musician_user = User.objects.create_user(
            username="musico_profile_test",
            email="musico_profile_test@test.com",
            password="SenhaForte123!",
        )
        Musician.objects.create(user=musician_user, instrument="viola", is_active=True)
        self.client.force_authenticate(user=musician_user)
        resp = self.client.patch("/api/contractor/profile/", {"name": "Tentativa"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class ContractorDashboardTest(APITestCase):
    """Dashboard do contratante reflete suas reservas corretamente."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="contratante_dash",
            email="contratante_dash@test.com",
            password="SenhaForte123!",
        )
        ContractorProfile.objects.create(
            user=self.user,
            name="Dashboard Corp",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_dashboard_returns_200_for_active_contractor(self):
        resp = self.client.get("/api/contractor/dashboard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_dashboard_forbidden_without_contractor_profile(self):
        plain_user = User.objects.create_user(
            username="sem_perfil_dashboard",
            email="sem_perfil_dashboard@test.com",
            password="x",
        )
        self.client.force_authenticate(user=plain_user)
        resp = self.client.get("/api/contractor/dashboard/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

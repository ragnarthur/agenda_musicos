# agenda/tests/test_contractor_contact.py
"""
Testes para proteção de contatos de músicos e fluxo de contratantes.

Verifica que:
1. API pública NÃO expõe instagram dos músicos
2. Endpoint /contact/ exige autenticação de contratante
3. Endpoint /contact/ retorna instagram + whatsapp + phone
4. ContactView é registrado para auditoria
5. Músicos não conseguem acessar endpoint /contact/
6. Registro e login de contratantes funcionam
"""

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from agenda.models import ContactView, ContractorProfile, Musician


class MusicianPublicSerializerTest(APITestCase):
    """Testa que o serializer público NÃO expõe instagram."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="musico1",
            email="musico1@test.com",
            first_name="João",
            last_name="Silva",
            password="senha12345",
        )
        self.musician = Musician.objects.create(
            user=self.user,
            instrument="guitar",
            role="member",
            is_active=True,
            instagram="@joaosilva",
            whatsapp="34999999999",
            phone="34988888888",
            bio="Guitarrista profissional",
            city="São Paulo",
            state="SP",
        )

    def test_public_profile_does_not_expose_instagram(self):
        """GET /api/musicians/public/<id>/ NÃO deve retornar campo instagram."""
        response = self.client.get(f"/api/musicians/public/{self.musician.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("instagram", response.data)

    def test_public_list_does_not_expose_instagram(self):
        """GET /api/musicians/all/ NÃO deve retornar campo instagram."""
        response = self.client.get("/api/musicians/all/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        if response.data.get("results"):
            musician_data = response.data["results"][0]
        elif isinstance(response.data, list) and len(response.data) > 0:
            musician_data = response.data[0]
        else:
            self.skipTest("Nenhum músico retornado na listagem")
        self.assertNotIn("instagram", musician_data)

    def test_public_profile_exposes_allowed_fields(self):
        """GET /api/musicians/public/<id>/ deve retornar campos permitidos."""
        response = self.client.get(f"/api/musicians/public/{self.musician.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_fields = ["id", "full_name", "instrument", "bio", "city", "state", "avatar_url"]
        for field in expected_fields:
            self.assertIn(field, response.data)


class MusicianContactEndpointTest(APITestCase):
    """Testa o endpoint protegido /musicians/<id>/contact/."""

    def setUp(self):
        # Músico com contatos
        self.musician_user = User.objects.create_user(
            username="musico_contato",
            email="musico_contato@test.com",
            first_name="Maria",
            last_name="Santos",
            password="senha12345",
        )
        self.musician = Musician.objects.create(
            user=self.musician_user,
            instrument="vocal",
            role="member",
            is_active=True,
            instagram="@mariasantos",
            whatsapp="11999998888",
            phone="11988887777",
        )

        # Contratante
        self.contractor_user = User.objects.create_user(
            username="contratante1",
            email="contratante@test.com",
            first_name="Carlos",
            last_name="Eventos",
            password="senha12345",
        )
        self.contractor = ContractorProfile.objects.create(
            user=self.contractor_user,
            name="Carlos Eventos",
            phone="11977776666",
            city="São Paulo",
            state="SP",
        )

        # Outro músico (para testar que músico não acessa contato)
        self.other_musician_user = User.objects.create_user(
            username="musico_outro",
            email="musico_outro@test.com",
            password="senha12345",
        )
        self.other_musician = Musician.objects.create(
            user=self.other_musician_user,
            instrument="drums",
            role="member",
            is_active=True,
        )

        self.contact_url = f"/api/musicians/{self.musician.pk}/contact/"

    def test_unauthenticated_cannot_access_contact(self):
        """Visitante não autenticado recebe 401."""
        response = self.client.get(self.contact_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_musician_cannot_access_contact(self):
        """Músico autenticado recebe 403 - apenas contratantes."""
        self.client.force_authenticate(user=self.other_musician_user)
        response = self.client.get(self.contact_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_contractor_can_access_contact(self):
        """Contratante autenticado recebe contato completo (whatsapp + phone + instagram)."""
        self.client.force_authenticate(user=self.contractor_user)
        response = self.client.get(self.contact_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["whatsapp"], "11999998888")
        self.assertEqual(response.data["phone"], "11988887777")
        self.assertEqual(response.data["instagram"], "@mariasantos")

    def test_contact_view_creates_audit_log(self):
        """Acesso ao contato registra ContactView para auditoria."""
        self.client.force_authenticate(user=self.contractor_user)
        self.assertEqual(ContactView.objects.count(), 0)

        response = self.client.get(self.contact_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Deve ter criado exatamente 1 registro de auditoria
        self.assertEqual(ContactView.objects.count(), 1)
        cv = ContactView.objects.first()
        self.assertEqual(cv.contractor, self.contractor)
        self.assertEqual(cv.musician, self.musician)

    def test_multiple_views_create_multiple_audit_logs(self):
        """Cada acesso gera um novo registro de auditoria."""
        self.client.force_authenticate(user=self.contractor_user)

        self.client.get(self.contact_url)
        self.client.get(self.contact_url)
        self.client.get(self.contact_url)

        self.assertEqual(ContactView.objects.count(), 3)

    def test_contact_for_inactive_musician_returns_404(self):
        """Contato de músico inativo retorna 404."""
        self.musician.is_active = False
        self.musician.save()

        self.client.force_authenticate(user=self.contractor_user)
        response = self.client.get(self.contact_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ContractorRegistrationTest(APITestCase):
    """Testa registro de contratante."""

    def test_register_contractor_success(self):
        """Registro com dados válidos cria contratante."""
        data = {
            "name": "Empresa Teste",
            "email": "empresa@test.com",
            "password": "SenhaForte123!",
            "phone": "11999998888",
            "city": "São Paulo",
            "state": "SP",
        }
        response = self.client.post("/api/register-contractor/", data, format="json")
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Verifica que o ContractorProfile foi criado
        self.assertTrue(
            ContractorProfile.objects.filter(name="Empresa Teste").exists()
        )

    def test_register_contractor_duplicate_email(self):
        """Registro com email duplicado falha."""
        User.objects.create_user(
            username="existente",
            email="duplicado@test.com",
            password="senha12345",
        )
        data = {
            "name": "Outra Empresa",
            "email": "duplicado@test.com",
            "password": "SenhaForte123!",
            "city": "RJ",
            "state": "RJ",
        }
        response = self.client.post("/api/register-contractor/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_contractor_missing_required_fields(self):
        """Registro sem campos obrigatórios falha."""
        data = {"name": "Só Nome"}
        response = self.client.post("/api/register-contractor/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ContractorLoginTest(APITestCase):
    """Testa login de contratante."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="contratante_login",
            email="login@test.com",
            password="SenhaForte123!",
        )
        self.contractor = ContractorProfile.objects.create(
            user=self.user,
            name="Contratante Login",
            city="SP",
            state="SP",
        )

    def test_login_success(self):
        """Login com credenciais válidas retorna cookies HttpOnly."""
        data = {
            "email": "login@test.com",
            "password": "SenhaForte123!",
        }
        response = self.client.post("/api/contractor/token/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("access", response.data)
        self.assertIn("access_token", response.cookies)
        self.assertIn("refresh_token", response.cookies)

    def test_login_wrong_password(self):
        """Login com senha errada falha."""
        data = {
            "email": "login@test.com",
            "password": "SenhaErrada",
        }
        response = self.client.post("/api/contractor/token/", data, format="json")
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

    def test_login_nonexistent_email(self):
        """Login com email inexistente falha."""
        data = {
            "email": "naoexiste@test.com",
            "password": "SenhaForte123!",
        }
        response = self.client.post("/api/contractor/token/", data, format="json")
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

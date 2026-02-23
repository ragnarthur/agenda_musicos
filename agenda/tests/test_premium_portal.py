from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import CulturalNotice, Musician


class PremiumPortalAPITest(APITestCase):
    def setUp(self):
        self.premium_user = User.objects.create_user(
            username="premium_user",
            email="premium@test.com",
            password="senha12345",
        )
        self.non_premium_user = User.objects.create_user(
            username="free_user",
            email="free@test.com",
            password="senha12345",
        )

        self.premium_musician = Musician.objects.create(
            user=self.premium_user,
            instrument="guitar",
            city="Belo Horizonte",
            state="MG",
            is_premium=True,
            is_active=True,
        )
        self.non_premium_musician = Musician.objects.create(
            user=self.non_premium_user,
            instrument="drums",
            city="Belo Horizonte",
            state="MG",
            is_premium=False,
            is_active=True,
        )

        CulturalNotice.objects.create(
            title="Edital Municipal BH",
            category="edital",
            state="MG",
            city="Belo Horizonte",
            is_active=True,
        )
        CulturalNotice.objects.create(
            title="Festival Estadual MG",
            category="festival",
            state="MG",
            city=None,
            is_active=True,
        )
        CulturalNotice.objects.create(
            title="Conteúdo de Outra Cidade",
            category="noticia",
            state="MG",
            city="Uberlandia",
            is_active=True,
        )
        CulturalNotice.objects.create(
            title="Conteúdo de Outro Estado",
            category="edital",
            state="SP",
            city=None,
            is_active=True,
        )
        CulturalNotice.objects.create(
            title="Conteúdo Inativo",
            category="edital",
            state="MG",
            city=None,
            is_active=False,
        )

    def test_premium_user_receives_city_and_state_content_only(self):
        self.client.force_authenticate(user=self.premium_user)
        response = self.client.get("/api/premium/portal/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = {item["title"] for item in response.data}

        self.assertIn("Edital Municipal BH", titles)
        self.assertIn("Festival Estadual MG", titles)
        self.assertNotIn("Conteúdo de Outra Cidade", titles)
        self.assertNotIn("Conteúdo de Outro Estado", titles)
        self.assertNotIn("Conteúdo Inativo", titles)

    def test_non_premium_user_is_forbidden(self):
        self.client.force_authenticate(user=self.non_premium_user)
        response = self.client.get("/api/premium/portal/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_category_filter(self):
        self.client.force_authenticate(user=self.premium_user)
        response = self.client.get("/api/premium/portal/?category=festival")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Festival Estadual MG")

    def test_category_filter_falls_back_to_same_state_other_cities(self):
        self.client.force_authenticate(user=self.premium_user)
        response = self.client.get("/api/premium/portal/?category=noticia")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Conteúdo de Outra Cidade")

    def test_city_with_suffix_still_matches_local_content(self):
        self.premium_musician.city = "Belo Horizonte, MG"
        self.premium_musician.save(update_fields=["city"])

        self.client.force_authenticate(user=self.premium_user)
        response = self.client.get("/api/premium/portal/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = {item["title"] for item in response.data}
        self.assertIn("Edital Municipal BH", titles)

    def test_full_state_name_is_normalized_to_uf(self):
        self.premium_musician.state = "Minas Gerais"
        self.premium_musician.save(update_fields=["state"])

        self.client.force_authenticate(user=self.premium_user)
        response = self.client.get("/api/premium/portal/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = {item["title"] for item in response.data}
        self.assertIn("Festival Estadual MG", titles)

    @patch("agenda.premium_views.fetch_portal_content")
    def test_uses_external_sources_when_admin_curated_content_is_empty(self, mock_fetch_portal):
        CulturalNotice.objects.filter(state="MG").delete()
        mock_fetch_portal.return_value = [
            {
                "source": "mapas_culturais",
                "external_id": "opp_42",
                "title": "Edital Externo MG",
                "description": "Fonte pública",
                "category": "edital",
                "scope": "estadual",
                "state": "MG",
                "city": None,
                "external_url": "https://example.com/oportunidade/42",
                "deadline": None,
                "event_date": None,
                "published_at": "2026-02-01",
            }
        ]

        self.client.force_authenticate(user=self.premium_user)
        response = self.client.get("/api/premium/portal/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Edital Externo MG")
        mock_fetch_portal.assert_called_once_with(state="MG", city="Belo Horizonte")

    @patch("agenda.premium_views.fetch_portal_content")
    def test_invalid_external_items_do_not_break_endpoint(self, mock_fetch_portal):
        CulturalNotice.objects.filter(state="MG").delete()
        mock_fetch_portal.return_value = [
            {
                # inválido: external_id em branco
                "source": "salic",
                "external_id": "",
                "title": "Item inválido",
                "description": "",
                "category": "edital",
                "scope": "estadual",
                "state": "MG",
                "city": None,
                "external_url": None,
                "deadline": None,
                "event_date": None,
                "published_at": "2026-02-01",
            },
            {
                # válido
                "source": "mapas_culturais",
                "external_id": "opp_77",
                "title": "Item válido",
                "description": "ok",
                "category": "edital",
                "scope": "estadual",
                "state": "MG",
                "city": None,
                "external_url": "https://example.com/oportunidade/77",
                "deadline": None,
                "event_date": None,
                "published_at": "2026-02-02",
            },
        ]

        self.client.force_authenticate(user=self.premium_user)
        response = self.client.get("/api/premium/portal/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Item válido")


class AdminSetPremiumAPITest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="root_admin",
            email="root@test.com",
            password="senha12345",
        )
        self.target_user = User.objects.create_user(
            username="musician_target",
            email="target@test.com",
            password="senha12345",
        )
        self.target_musician = Musician.objects.create(
            user=self.target_user,
            instrument="vocal",
            state="MG",
            city="Belo Horizonte",
            is_premium=False,
            is_active=True,
        )

    def test_set_premium_true_and_false(self):
        self.client.force_authenticate(user=self.admin)

        activate_response = self.client.patch(
            f"/api/admin/users/{self.target_user.id}/set-premium/",
            {"is_premium": True},
            format="json",
        )
        self.assertEqual(activate_response.status_code, status.HTTP_200_OK)
        self.target_musician.refresh_from_db()
        self.assertTrue(self.target_musician.is_premium)

        revoke_response = self.client.patch(
            f"/api/admin/users/{self.target_user.id}/set-premium/",
            {"is_premium": False},
            format="json",
        )
        self.assertEqual(revoke_response.status_code, status.HTTP_200_OK)
        self.target_musician.refresh_from_db()
        self.assertFalse(self.target_musician.is_premium)

    def test_list_all_users_exposes_premium_fields(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/admin/users/all/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        target_payload = next(item for item in response.data if item["id"] == self.target_user.id)
        self.assertIn("musician_is_premium", target_payload)
        self.assertIn("has_musician_profile", target_payload)
        self.assertEqual(target_payload["musician_is_premium"], False)
        self.assertEqual(target_payload["has_musician_profile"], True)

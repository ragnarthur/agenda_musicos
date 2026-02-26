"""
Testa os endpoints públicos (sem autenticação) de músicos:
  listagem por cidade, perfil público, listagem geral e gêneros disponíveis.
"""

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import Musician


def _make_musician(
    username, city="Belo Horizonte", state="MG", instrument="guitar", is_active=True, genres=None
):
    user = User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="x",
        first_name=username.capitalize(),
    )
    m = Musician.objects.create(
        user=user,
        instrument=instrument,
        city=city,
        state=state,
        is_active=is_active,
    )
    if genres:
        m.musical_genres = genres
        m.save(update_fields=["musical_genres"])
    return m


class MusicianPublicProfileTest(APITestCase):
    """GET /api/musicians/public/<id>/"""

    def setUp(self):
        self.musician = _make_musician("musico_pub_profile", city="Recife", state="PE")

    def test_active_musician_profile_is_public(self):
        resp = self.client.get(f"/api/musicians/public/{self.musician.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["id"], self.musician.id)

    def test_inactive_musician_returns_404(self):
        inactive = _make_musician("musico_pub_inativo", is_active=False)
        resp = self.client.get(f"/api/musicians/public/{inactive.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_nonexistent_musician_returns_404(self):
        resp = self.client.get("/api/musicians/public/99999/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class MusicianListByCityTest(APITestCase):
    """GET /api/musicians/public-by-city/?city=&state="""

    def setUp(self):
        _make_musician("musico_bh_1", city="Belo Horizonte", state="MG", instrument="guitar")
        _make_musician("musico_bh_2", city="Belo Horizonte", state="MG", instrument="drums")
        _make_musician("musico_sp_1", city="São Paulo", state="SP", instrument="guitar")
        _make_musician("musico_bh_inativo", city="Belo Horizonte", state="MG", is_active=False)

    def test_list_by_city_returns_only_active(self):
        resp = self.client.get("/api/musicians/public-by-city/?city=Belo Horizonte&state=MG")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get("results", resp.data)
        # Inativo não aparece
        usernames = [r["user"]["username"] for r in results]
        self.assertNotIn("musico_bh_inativo", usernames)
        # Ativos de BH aparecem
        self.assertIn("musico_bh_1", usernames)
        self.assertIn("musico_bh_2", usernames)

    def test_list_by_city_does_not_include_other_state(self):
        resp = self.client.get("/api/musicians/public-by-city/?city=Belo Horizonte&state=MG")
        results = resp.data.get("results", resp.data)
        usernames = [r["user"]["username"] for r in results]
        self.assertNotIn("musico_sp_1", usernames)

    def test_missing_city_param_returns_400(self):
        resp = self.client.get("/api/musicians/public-by-city/?state=MG")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_state_param_returns_400(self):
        resp = self.client.get("/api/musicians/public-by-city/?city=Belo Horizonte")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_instrument(self):
        resp = self.client.get(
            "/api/musicians/public-by-city/?city=Belo Horizonte&state=MG&instrument=drums"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get("results", resp.data)
        usernames = [r["user"]["username"] for r in results]
        self.assertIn("musico_bh_2", usernames)
        self.assertNotIn("musico_bh_1", usernames)


class MusicianListAllPublicTest(APITestCase):
    """GET /api/musicians/all/"""

    def setUp(self):
        _make_musician("musico_all_1", city="Fortaleza", state="CE")
        _make_musician("musico_all_2", city="Salvador", state="BA")
        _make_musician("musico_all_inativo", is_active=False)

    def test_returns_200_without_auth(self):
        resp = self.client.get("/api/musicians/all/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_inactive_musicians_excluded(self):
        resp = self.client.get("/api/musicians/all/")
        data = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        usernames = [r["user"]["username"] for r in data]
        self.assertNotIn("musico_all_inativo", usernames)

    def test_search_by_city(self):
        resp = self.client.get("/api/musicians/all/?city=Fortaleza&state=CE")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        usernames = [r["user"]["username"] for r in data]
        self.assertIn("musico_all_1", usernames)
        self.assertNotIn("musico_all_2", usernames)


class MusicianGenresEndpointTest(APITestCase):
    """GET /api/musicians/genres/"""

    def setUp(self):
        m1 = _make_musician("musico_genres_1", state="MG")
        m1.musical_genres = ["mpb", "samba"]
        m1.save(update_fields=["musical_genres"])

        m2 = _make_musician("musico_genres_2", state="MG")
        m2.musical_genres = ["rock", "blues"]
        m2.save(update_fields=["musical_genres"])

    def test_genres_endpoint_returns_list(self):
        resp = self.client.get("/api/musicians/genres/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_genres_contains_expected_values(self):
        resp = self.client.get("/api/musicians/genres/")
        genres = set(resp.data)
        # Pelo menos um dos gêneros cadastrados deve aparecer
        self.assertTrue(
            genres & {"mpb", "samba", "rock", "blues"},
            f"Nenhum gênero esperado encontrado em: {genres}",
        )

    def test_no_auth_required(self):
        """Endpoint é público — sem autenticação deve funcionar."""
        self.client.logout()
        resp = self.client.get("/api/musicians/genres/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

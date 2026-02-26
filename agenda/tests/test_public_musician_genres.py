# agenda/tests/test_public_musician_genres.py
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import Musician


class PublicMusicianGenresTest(APITestCase):
    def setUp(self):
        cache.clear()
        u1 = User.objects.create_user(username="m1", email="m1@test.com", password="senha12345")
        u2 = User.objects.create_user(username="m2", email="m2@test.com", password="senha12345")
        self.m1 = Musician.objects.create(
            user=u1,
            instrument="guitar",
            is_active=True,
            musical_genres=["mpb", "pop_rock"],
            city="Sao Paulo",
            state="SP",
        )
        self.m2 = Musician.objects.create(
            user=u2,
            instrument="vocal",
            is_active=True,
            musical_genres=["sertanejo"],
            city="Sao Paulo",
            state="SP",
        )

    def _unwrap_results(self, data):
        if isinstance(data, dict) and "results" in data:
            return data["results"]
        return data

    def test_list_available_genres(self):
        resp = self.client.get("/api/musicians/genres/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        genres = resp.data
        self.assertIsInstance(genres, list)
        self.assertTrue(set(["mpb", "pop_rock", "sertanejo"]).issubset(set(genres)))

    def test_filter_all_musicians_by_genre(self):
        resp = self.client.get("/api/musicians/all/?genre=mpb")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = self._unwrap_results(resp.data)
        self.assertGreaterEqual(len(results), 1)
        ids = {item["id"] for item in results}
        self.assertIn(self.m1.id, ids)
        self.assertNotIn(self.m2.id, ids)

    def test_filter_all_musicians_by_search_includes_musical_genres(self):
        resp = self.client.get("/api/musicians/all/?search=pop")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = self._unwrap_results(resp.data)
        ids = {item["id"] for item in results}
        self.assertIn(self.m1.id, ids)
        self.assertNotIn(self.m2.id, ids)

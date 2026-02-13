from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import Musician


class MusicianSearchTest(APITestCase):
    def setUp(self):
        genre_user = User.objects.create_user(
            username="arthur_pop", email="arthur@test.com", password="senha12345"
        )
        bio_user = User.objects.create_user(
            username="sara_bio", email="sara@test.com", password="senha12345"
        )
        other_user = User.objects.create_user(
            username="joao_outro", email="joao@test.com", password="senha12345"
        )

        self.genre_musician = Musician.objects.create(
            user=genre_user,
            instrument="guitar",
            bio="Violão e voz para eventos",
            musical_genres=["pop_rock"],
            is_active=True,
        )
        self.bio_musician = Musician.objects.create(
            user=bio_user,
            instrument="vocal",
            bio="Cantora de pop internacional",
            musical_genres=["mpb"],
            is_active=True,
        )
        self.other_musician = Musician.objects.create(
            user=other_user,
            instrument="drums",
            bio="Baterista de forró",
            musical_genres=["forro"],
            is_active=True,
        )

    def test_search_includes_musical_genres(self):
        response = self.client.get("/api/musicians/?search=pop")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payload = response.data.get("results", response.data)
        ids = {item["id"] for item in payload}

        self.assertIn(self.genre_musician.id, ids)
        self.assertIn(self.bio_musician.id, ids)
        self.assertNotIn(self.other_musician.id, ids)

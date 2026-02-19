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

    def test_instrument_filter_supports_aliases(self):
        alias_user = User.objects.create_user(
            username="baixista_alias", email="baixo@test.com", password="senha12345"
        )
        alias_musician = Musician.objects.create(
            user=alias_user,
            instrument="baixo",
            bio="Baixista de estúdio",
            musical_genres=["pop"],
            is_active=True,
        )

        response = self.client.get("/api/musicians/?instrument=bass")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payload = response.data.get("results", response.data)
        ids = {item["id"] for item in payload}

        self.assertIn(alias_musician.id, ids)
        self.assertNotIn(self.genre_musician.id, ids)
        self.assertNotIn(self.bio_musician.id, ids)
        self.assertNotIn(self.other_musician.id, ids)

    def test_instrument_filter_supports_acoustic_guitar_aliases(self):
        alias_user = User.objects.create_user(
            username="violonista_alias", email="violao@test.com", password="senha12345"
        )
        alias_musician = Musician.objects.create(
            user=alias_user,
            instrument="violonista",
            bio="Voz e violão",
            musical_genres=["mpb"],
            is_active=True,
        )

        response = self.client.get("/api/musicians/?instrument=acoustic%20guitar")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payload = response.data.get("results", response.data)
        ids = {item["id"] for item in payload}

        self.assertIn(alias_musician.id, ids)
        self.assertNotIn(self.genre_musician.id, ids)
        self.assertNotIn(self.bio_musician.id, ids)
        self.assertNotIn(self.other_musician.id, ids)

    def test_invalid_instrument_filter_does_not_return_all(self):
        response = self.client.get("/api/musicians/?instrument=instrumento_que_nao_existe")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payload = response.data.get("results", response.data)
        self.assertEqual(len(payload), 0)

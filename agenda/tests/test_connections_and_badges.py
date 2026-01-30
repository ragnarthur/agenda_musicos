# agenda/tests/test_connections_and_badges.py
"""Testes das APIs de conexões e badges."""

from datetime import date, time, timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import (
    Availability,
    Connection,
    Event,
    Membership,
    Musician,
    Organization,
)


class ConnectionAndBadgeAPITest(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Org Teste")

        # Usuário logado
        self.user = User.objects.create_user(
            username="arthur", email="arthur@test.com", password="senha123", first_name="Arthur"
        )
        self.target_user = User.objects.create_user(
            username="sara", email="sara@test.com", password="senha123", first_name="Sara"
        )

        Membership.objects.create(user=self.user, organization=self.org, role="member")
        Membership.objects.create(user=self.target_user, organization=self.org, role="member")

        self.musician = Musician.objects.create(
            user=self.user, instrument="guitar", organization=self.org
        )
        self.target = Musician.objects.create(
            user=self.target_user, instrument="vocal", organization=self.org
        )

        self.client.force_authenticate(user=self.user)

    def test_create_connection_and_list(self):
        """Cria conexão do tipo follow e lista."""
        url = reverse("connection-list")
        payload = {"target_id": self.target.id, "connection_type": "follow"}

        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

        list_resp = self.client.get(url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 1)
        self.assertEqual(list_resp.data[0]["connection_type"], "follow")
        self.assertEqual(list_resp.data[0]["target"]["id"], self.target.id)

    def test_prevent_self_connection(self):
        """Impede conexões consigo mesmo."""
        url = reverse("connection-list")
        payload = {"target_id": self.musician.id, "connection_type": "follow"}

        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Connection.objects.count(), 0)

    def test_badges_awarded_on_request(self):
        """Recalcula e retorna badges do músico logado."""
        # Evento passado tocado pelo músico para liberar "Primeiro Show"
        past_event = Event.objects.create(
            title="Show Passado",
            location="Bar",
            event_date=date.today() - timedelta(days=2),
            start_time=time(20, 0),
            end_time=time(22, 0),
            status="confirmed",
            created_by=self.user,
            organization=self.org,
        )
        Availability.objects.create(
            musician=self.musician,
            event=past_event,
            response="available",
        )
        # Força média 5 com total >=5 para habilitar badge de 5 estrelas
        self.musician.average_rating = 5
        self.musician.total_ratings = 5
        self.musician.save()

        url = reverse("badge-list")
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        payload = resp.data.get("earned", resp.data) if isinstance(resp.data, dict) else resp.data
        slugs = [item["slug"] for item in payload]
        self.assertIn("first_show", slugs)

        # Requisição repetida não duplica badges
        second = self.client.get(url)
        second_payload = (
            second.data.get("earned", second.data) if isinstance(second.data, dict) else second.data
        )
        self.assertEqual(len(second_payload), len(payload))

# agenda/tests/test_public_calendar.py
"""
Testes do endpoint public_calendar do MusicianViewSet.
"""

from datetime import date, time, timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from agenda.models import Availability, Event, Musician


class PublicCalendarTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.future_date = date.today() + timedelta(days=7)

        self.user_owner = User.objects.create_user(
            username="owner",
            email="owner@test.com",
            password="owner2026@",
            first_name="Owner",
            last_name="User",
        )
        self.musician_owner = Musician.objects.create(
            user=self.user_owner,
            instrument="guitar",
            role="member",
            is_active=True,
        )

        self.user_other = User.objects.create_user(
            username="other",
            email="other@test.com",
            password="other2026@",
            first_name="Other",
            last_name="User",
        )
        self.musician_other = Musician.objects.create(
            user=self.user_other,
            instrument="drums",
            role="member",
            is_active=True,
        )

    def _create_event(
        self, created_by, status, musician=None, title="Show Teste", is_private=False
    ):
        event = Event.objects.create(
            title=title,
            location="Local Teste",
            event_date=self.future_date,
            start_time=time(20, 0),
            end_time=time(22, 0),
            status=status,
            created_by=created_by,
            is_private=is_private,
        )

        if musician:
            Availability.objects.create(
                musician=musician,
                event=event,
                response="pending",
            )

        return event

    def test_owner_sees_event_with_availability_even_if_proposed(self):
        """Dono do perfil deve ver eventos onde tem disponibilidade, mesmo em proposed."""
        event = self._create_event(
            created_by=self.user_other,
            status="proposed",
            musician=self.musician_owner,
        )

        self.client.force_authenticate(user=self.user_owner)
        url = reverse("musician-public-calendar", args=[self.musician_owner.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event_ids = [item["id"] for item in response.data["events"]]
        self.assertIn(event.id, event_ids)

        event_data = next(item for item in response.data["events"] if item["id"] == event.id)
        self.assertEqual(event_data["status"], "proposed")

    def test_visitor_sees_only_confirmed_or_approved(self):
        """Visitante deve ver apenas eventos confirmados/aprovados do músico do perfil."""
        event_confirmed = self._create_event(
            created_by=self.user_owner,
            status="confirmed",
            title="Show Confirmado",
        )
        event_proposed = self._create_event(
            created_by=self.user_owner,
            status="proposed",
            title="Show Proposto",
        )

        self.client.force_authenticate(user=self.user_other)
        url = reverse("musician-public-calendar", args=[self.musician_owner.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event_ids = [item["id"] for item in response.data["events"]]
        self.assertIn(event_confirmed.id, event_ids)
        self.assertNotIn(event_proposed.id, event_ids)

    def test_logged_in_user_sees_profile_musician_events_not_theirs(self):
        """Calendário deve refletir o músico do perfil visitado, não o usuário logado."""
        event_owner = self._create_event(
            created_by=self.user_owner,
            status="confirmed",
            title="Evento do Owner",
        )
        event_other = self._create_event(
            created_by=self.user_other,
            status="confirmed",
            title="Evento do Other",
        )

        self.client.force_authenticate(user=self.user_owner)
        url = reverse("musician-public-calendar", args=[self.musician_other.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event_ids = [item["id"] for item in response.data["events"]]
        self.assertIn(event_other.id, event_ids)
        self.assertNotIn(event_owner.id, event_ids)

    def test_visitor_sees_private_event_as_occupied_even_if_proposed(self):
        """Visitante deve ver evento privado como ocupado, mesmo em proposed."""
        event_private = self._create_event(
            created_by=self.user_owner,
            status="proposed",
            title="Evento Privado",
            is_private=True,
        )

        self.client.force_authenticate(user=self.user_other)
        url = reverse("musician-public-calendar", args=[self.musician_owner.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event_ids = [item["id"] for item in response.data["events"]]
        self.assertIn(event_private.id, event_ids)

        event_data = next(
            item for item in response.data["events"] if item["id"] == event_private.id
        )
        self.assertEqual(event_data["status"], "confirmed")
        self.assertEqual(event_data["status_display"], "Ocupado")
        self.assertNotIn("title", event_data)

    def test_owner_sees_private_event_details(self):
        """Dono do perfil deve ver detalhes e status real do evento privado."""
        event_private = self._create_event(
            created_by=self.user_owner,
            status="proposed",
            title="Evento Privado",
            is_private=True,
        )

        self.client.force_authenticate(user=self.user_owner)
        url = reverse("musician-public-calendar", args=[self.musician_owner.id])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        event_data = next(
            item for item in response.data["events"] if item["id"] == event_private.id
        )
        self.assertEqual(event_data["status"], "proposed")
        self.assertEqual(event_data["title"], "Evento Privado")

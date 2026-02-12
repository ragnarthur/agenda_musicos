# agenda/tests/test_events_filters.py
"""
Testes de filtros da listagem de eventos.
"""

from datetime import date, time, timedelta

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import Availability, Event, Membership, Musician, Organization


class PastEventsFilterTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="luis",
            email="luis@test.com",
            password="luis2026@",
            first_name="Luis",
            last_name="Pereira",
        )
        self.org = Organization.objects.create(
            name="Banda Teste",
            owner=self.user,
        )
        Membership.objects.create(
            user=self.user, organization=self.org, role="owner", status="active"
        )
        Musician.objects.create(
            user=self.user,
            instrument="guitar",
            role="member",
            organization=self.org,
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    def _create_event(self, days_offset: int) -> Event:
        event_date = date.today() + timedelta(days=days_offset)
        return Event.objects.create(
            title="Evento Teste",
            location="Local Teste",
            event_date=event_date,
            start_time=time(20, 0),
            end_time=time(22, 0),
            status="confirmed",
            created_by=self.user,
            organization=self.org,
        )

    def test_past_events_days_back_filter(self):
        within_range = self._create_event(-10)
        out_of_range = self._create_event(-40)
        _future = self._create_event(5)

        url = reverse("event-list")
        response = self.client.get(
            f"{url}?past=true&days_back=30&status=confirmed,approved"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data.get("results", [])}

        self.assertIn(within_range.id, returned_ids)
        self.assertNotIn(out_of_range.id, returned_ids)
        self.assertNotIn(_future.id, returned_ids)


class PendingResponsesFilterTest(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner_events",
            email="owner-events@test.com",
            password="owner2026@",
            first_name="Owner",
        )
        self.org = Organization.objects.create(name="Org Eventos", owner=self.owner)
        Membership.objects.create(
            user=self.owner, organization=self.org, role="owner", status="active"
        )
        self.owner_musician = Musician.objects.create(
            user=self.owner,
            instrument="guitar",
            role="member",
            organization=self.org,
            is_active=True,
        )

        self.invited_user = User.objects.create_user(
            username="invitee_events",
            email="invitee-events@test.com",
            password="invitee2026@",
        )
        self.invited_musician = Musician.objects.create(
            user=self.invited_user,
            instrument="bass",
            role="member",
            organization=self.org,
            is_active=True,
        )
        self.client.force_authenticate(user=self.owner)

    def _create_event(self, *, days_offset: int, title: str) -> Event:
        event_date = date.today() + timedelta(days=days_offset)
        return Event.objects.create(
            title=title,
            location="Local Teste",
            event_date=event_date,
            start_time=time(20, 0),
            end_time=time(22, 0),
            status="confirmed",
            created_by=self.owner,
            organization=self.org,
        )

    def test_pending_responses_only_counts_future_events(self):
        past_event = self._create_event(days_offset=-3, title="Passado")
        future_event = self._create_event(days_offset=4, title="Futuro")

        Availability.objects.create(
            musician=self.invited_musician, event=past_event, response="pending"
        )
        Availability.objects.create(
            musician=self.invited_musician, event=future_event, response="pending"
        )

        url = reverse("event-list")
        response = self.client.get(f"{url}?pending_responses=true&my_proposals=true")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data.get("results", [])}
        self.assertIn(future_event.id, returned_ids)
        self.assertNotIn(past_event.id, returned_ids)

    def test_pending_responses_excludes_events_without_pending(self):
        future_event = self._create_event(days_offset=2, title="Sem Pendencia")
        Availability.objects.create(
            musician=self.invited_musician, event=future_event, response="available"
        )

        url = reverse("event-list")
        response = self.client.get(f"{url}?pending_responses=true&my_proposals=true")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("count"), 0)

    def test_pending_my_response_only_returns_future_events(self):
        past_event = self._create_event(days_offset=-2, title="Passado Convite")
        future_event = self._create_event(days_offset=3, title="Futuro Convite")

        Availability.objects.create(
            musician=self.invited_musician, event=past_event, response="pending"
        )
        Availability.objects.create(
            musician=self.invited_musician, event=future_event, response="pending"
        )

        self.client.force_authenticate(user=self.invited_user)
        url = reverse("event-pending-my-response")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {item["id"] for item in response.data}
        self.assertIn(future_event.id, returned_ids)
        self.assertNotIn(past_event.id, returned_ids)

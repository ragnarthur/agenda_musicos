from datetime import date

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import Membership, Musician, Organization


class MusicianNameChangeLimitTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="lucas",
            email="lucas@test.com",
            password="lucas2026@",
            first_name="Lucas",
            last_name="Silva",
        )
        self.org = Organization.objects.create(name="Banda Teste", owner=self.user)
        Membership.objects.create(
            user=self.user, organization=self.org, role="owner", status="active"
        )
        self.musician = Musician.objects.create(
            user=self.user,
            instrument="guitar",
            role="member",
            organization=self.org,
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_name_change_limit_blocks_third_update_in_month(self):
        url = "/api/musicians/me/"

        response1 = self.client.patch(
            url, {"first_name": "Lucas A", "last_name": "Silva"}, format="json"
        )
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        response2 = self.client.patch(
            url, {"first_name": "Lucas B", "last_name": "Silva"}, format="json"
        )
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        response3 = self.client.patch(
            url, {"first_name": "Lucas C", "last_name": "Silva"}, format="json"
        )
        self.assertEqual(response3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response3.data)
        self.assertIn("Limite mensal", response3.data["detail"])

    def test_name_change_limit_resets_each_month(self):
        url = "/api/musicians/me/"

        past_month = (timezone.now().date().replace(day=1) - timezone.timedelta(days=1)).replace(
            day=1
        )
        self.musician.name_changes_month = past_month
        self.musician.name_changes_count = 2
        self.musician.save(update_fields=["name_changes_month", "name_changes_count"])

        response = self.client.patch(
            url, {"first_name": "Lucas Novo", "last_name": "Silva"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from agenda.models import PwaAnalyticsEvent


class PwaAnalyticsTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/analytics/pwa/"

    def test_accepts_public_event_for_anonymous_user(self):
        payload = {
            "event": "pwa_install_click",
            "data": {"ios": False},
            "path": "/login",
            "release": "2026.02.19",
            "ts": "2026-02-19T01:00:00Z",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(PwaAnalyticsEvent.objects.count(), 1)

        event = PwaAnalyticsEvent.objects.first()
        assert event is not None
        self.assertEqual(event.event_name, "pwa_install_click")
        self.assertEqual(event.metadata.get("ios"), False)
        self.assertEqual(event.path, "/login")
        self.assertEqual(event.release_label, "2026.02.19")
        self.assertFalse(event.is_authenticated)
        self.assertIsNone(event.user)

    def test_rejects_unknown_event(self):
        payload = {"event": "anything_else"}

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(PwaAnalyticsEvent.objects.count(), 0)

    def test_sanitizes_metadata_and_links_authenticated_user(self):
        user = User.objects.create_user(username="ana", email="ana@test.com", password="123456")
        self.client.force_authenticate(user=user)

        payload = {
            "event": "pwa_update_apply_failed",
            "data": {
                "text": "x" * 600,
                "array": [1, 2, 3],
                123: "invalid-key-type",
            },
            "path": "/dashboard" + "a" * 500,
            "release": "release-" + "b" * 120,
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        event = PwaAnalyticsEvent.objects.first()
        assert event is not None
        self.assertEqual(event.user_id, user.id)
        self.assertTrue(event.is_authenticated)
        self.assertLessEqual(len(event.path), 255)
        self.assertLessEqual(len(event.release_label), 80)
        self.assertLessEqual(len(event.metadata.get("text", "")), 300)
        self.assertEqual(event.metadata.get("array"), "[1, 2, 3]")

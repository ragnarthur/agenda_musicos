from rest_framework import status
from rest_framework.test import APIClient, APITestCase


class WebVitalsTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/vitals/"

    def test_accepts_known_metric_payload(self):
        payload = {
            "name": "LCP",
            "value": 2530.4,
            "rating": "needs-improvement",
            "path": "/musicos?instrument=bass",
            "release": "2026.02.19",
            "ts": "2026-02-19T19:35:20Z",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data.get("status"), "accepted")

    def test_rejects_unknown_metric(self):
        payload = {"name": "XYZ", "value": 100, "rating": "good"}

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get("detail"), "invalid_metric")

    def test_rejects_invalid_value(self):
        payload = {"name": "CLS", "value": "not-a-number", "rating": "good"}

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get("detail"), "invalid_value")

    def test_rejects_invalid_rating(self):
        payload = {"name": "INP", "value": 120, "rating": "bad"}

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get("detail"), "invalid_rating")

from django.test import Client, TestCase


class HealthEndpointsTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_healthz_returns_ok(self):
        response = self.client.get("/healthz/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("status"), "ok")

    def test_readyz_returns_ok_with_database_and_cache(self):
        response = self.client.get("/api/readyz/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get("status"), "ok")
        self.assertEqual(payload.get("checks", {}).get("database"), "ok")
        self.assertEqual(payload.get("checks", {}).get("cache"), "ok")

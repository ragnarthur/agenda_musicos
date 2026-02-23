from django.test import SimpleTestCase

from agenda.external_integrations import _ensure_scope_coverage


class ExternalIntegrationsFallbackTest(SimpleTestCase):
    def test_empty_feed_gets_national_state_and_city_fallback(self):
        result = _ensure_scope_coverage([], "MG", "Monte Carmelo")
        scopes = {item.get("scope") for item in result}

        self.assertIn("nacional", scopes)
        self.assertIn("estadual", scopes)
        self.assertIn("municipal", scopes)

    def test_partial_feed_gets_missing_scopes(self):
        current_items = [
            {
                "source": "mapas_culturais",
                "external_id": "opp_existing",
                "title": "Edital estadual existente",
                "description": "Conteúdo atual",
                "category": "edital",
                "scope": "estadual",
                "state": "MG",
                "city": None,
                "external_url": "https://example.com/estado",
                "deadline": None,
                "event_date": None,
                "published_at": "2026-02-23",
            }
        ]

        result = _ensure_scope_coverage(current_items, "MG", "Monte Carmelo")
        scopes = {item.get("scope") for item in result}

        self.assertIn("estadual", scopes)
        self.assertIn("nacional", scopes)
        self.assertIn("municipal", scopes)

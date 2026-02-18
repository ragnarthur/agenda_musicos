"""Perfil de usuario contratante para carga."""

from __future__ import annotations

from locust import HttpUser, between, task

from load_tests import config
from load_tests.tasks import auth_tasks, event_tasks, musician_tasks, quote_tasks


class ContractorUser(HttpUser):
    host = config.HOST
    wait_time = between(config.WAIT_MIN_SECONDS, config.WAIT_MAX_SECONDS)
    # Evita spawn deste perfil quando credenciais de contratante nao foram configuradas.
    weight = 3 if (config.CONTRACTOR_EMAIL and config.CONTRACTOR_PASSWORD) else 0

    def on_start(self):
        self.cached_event_ids = []
        self.cached_musician_ids = []
        self.cached_gig_ids = []
        self.authenticated = False
        self.enabled = self.weight > 0
        self.client.headers.update({"X-Requested-With": "XMLHttpRequest"})

        if self.enabled:
            auth_tasks.login_contractor(self, force=True)
            if self.authenticated:
                event_tasks.list_events(self, name="GET /api/events/ (warmup contractor)")
                musician_tasks.list_public_musicians(
                    self, name="GET /api/musicians/all/ (warmup contractor)"
                )

    @task(10)
    def reauthenticate(self):
        if not self.enabled:
            return
        auth_tasks.login_contractor(self, force=True)

    @task(35)
    def list_public_musicians(self):
        if not self.enabled:
            return
        musician_tasks.list_public_musicians(self)

    @task(25)
    def list_events(self):
        if not self.enabled:
            return
        event_tasks.list_events(self)

    @task(30)
    def list_quotes(self):
        if not self.enabled:
            return
        quote_tasks.list_quotes_contractor(self)

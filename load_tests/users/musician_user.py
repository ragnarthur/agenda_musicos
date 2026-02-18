"""Perfil de usuario musico para carga."""

from __future__ import annotations

from locust import HttpUser, between, task

from load_tests import config
from load_tests.tasks import (
    auth_tasks,
    event_tasks,
    marketplace_tasks,
    musician_tasks,
    quote_tasks,
    upload_tasks,
)


class MusicianUser(HttpUser):
    host = config.HOST
    wait_time = between(config.WAIT_MIN_SECONDS, config.WAIT_MAX_SECONDS)

    def on_start(self):
        self.cached_event_ids = []
        self.cached_musician_ids = []
        self.cached_gig_ids = []
        self.authenticated = False
        self.client.headers.update({"X-Requested-With": "XMLHttpRequest"})

        auth_tasks.login_musician(self, force=True)
        if self.authenticated:
            event_tasks.list_events(self, name="GET /api/events/ (warmup)")
            musician_tasks.list_musicians(self, name="GET /api/musicians/ (warmup)")
            marketplace_tasks.list_gigs(self, name="GET /api/marketplace/gigs/ (warmup)")

    @task(config.WEIGHT_AUTH)
    def reauthenticate(self):
        auth_tasks.login_musician(self, force=True)

    @task(config.WEIGHT_LIST_EVENTS)
    def list_events(self):
        if not self.authenticated:
            auth_tasks.login_musician(self, force=True)
            return
        event_tasks.list_events(self)

    @task(config.WEIGHT_LIST_MUSICIANS)
    def list_musicians(self):
        if not self.authenticated:
            auth_tasks.login_musician(self, force=True)
            return
        musician_tasks.list_musicians(self)

    @task(config.WEIGHT_CREATE_EVENT)
    def create_event(self):
        if not self.authenticated:
            auth_tasks.login_musician(self, force=True)
            return
        event_tasks.create_event(self)

    @task(config.WEIGHT_EVENT_DETAIL)
    def event_detail(self):
        if not self.authenticated:
            auth_tasks.login_musician(self, force=True)
            return
        event_tasks.event_detail(self)

    @task(config.WEIGHT_SET_AVAILABILITY)
    def set_availability(self):
        if not self.authenticated:
            auth_tasks.login_musician(self, force=True)
            return
        event_tasks.set_availability(self)

    @task(config.WEIGHT_LIST_QUOTES)
    def list_quotes(self):
        if not self.authenticated:
            auth_tasks.login_musician(self, force=True)
            return
        quote_tasks.list_quotes_musician(self)

    @task(config.WEIGHT_LIST_GIGS)
    def list_gigs(self):
        if not self.authenticated:
            auth_tasks.login_musician(self, force=True)
            return
        marketplace_tasks.list_gigs(self)

    @task(config.WEIGHT_UPLOAD_AVATAR)
    def upload_avatar(self):
        if not self.authenticated:
            auth_tasks.login_musician(self, force=True)
            return
        upload_tasks.upload_avatar(self)

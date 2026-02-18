"""Tasks de orçamentos (quote requests) para Locust."""

from __future__ import annotations

import random
from datetime import date, timedelta
from uuid import uuid4

from load_tests import config

_EVENT_TYPES = ["Casamento", "Aniversário", "Show", "Corporativo", "Formatura", "Bar/Restaurante"]
_LOCATIONS = [
    ("São Paulo", "SP"),
    ("Rio de Janeiro", "RJ"),
    ("Belo Horizonte", "MG"),
    ("Curitiba", "PR"),
    ("Porto Alegre", "RS"),
    ("Salvador", "BA"),
]


def _pick_musician_id(user) -> int | None:
    if user.cached_musician_ids:
        return random.choice(user.cached_musician_ids)
    if config.QUOTE_MUSICIAN_ID:
        return config.QUOTE_MUSICIAN_ID
    return None


def list_quotes_musician(user) -> None:
    with user.client.get(
        "/api/quotes/musician/",
        name="GET /api/quotes/musician/",
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code != 200:
            response.failure(f"listar quotes (músico) falhou: HTTP {response.status_code}")
            return
        response.success()


def list_quotes_contractor(user) -> None:
    with user.client.get(
        "/api/quotes/contractor/",
        name="GET /api/quotes/contractor/",
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code != 200:
            response.failure(f"listar quotes (contratante) falhou: HTTP {response.status_code}")
            return
        response.success()


def create_quote_request(user) -> None:
    if not config.WRITE_TASKS_ENABLED:
        return

    musician_id = _pick_musician_id(user)
    if musician_id is None:
        return

    city, state = random.choice(_LOCATIONS)
    future_day = date.today() + timedelta(days=random.randint(14, 90))

    payload = {
        "musician": musician_id,
        "event_date": future_day.isoformat(),
        "event_type": random.choice(_EVENT_TYPES),
        "location_city": city,
        "location_state": state,
        "duration_hours": random.choice([2, 3, 4]),
        "notes": f"[LOAD] Orçamento de teste {uuid4().hex[:8]}",
    }

    with user.client.post(
        "/api/quotes/",
        json=payload,
        name="POST /api/quotes/",
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code not in (200, 201):
            response.failure(f"criar quote falhou: HTTP {response.status_code}")
            return
        response.success()

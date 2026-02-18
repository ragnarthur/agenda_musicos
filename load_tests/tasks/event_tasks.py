"""Tasks de eventos para Locust."""

from __future__ import annotations

import random
from datetime import date, timedelta
from uuid import uuid4

from load_tests import config


def _extract_results(payload):
    if isinstance(payload, dict) and "results" in payload and isinstance(payload["results"], list):
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return []


def _pick_event_id(user):
    if user.cached_event_ids:
        return random.choice(user.cached_event_ids)
    return None


def list_events(user, *, name: str = "GET /api/events/") -> None:
    params = {"upcoming": "true", "page_size": 20}
    with user.client.get(
        "/api/events/",
        params=params,
        name=name,
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code != 200:
            response.failure(f"listar eventos falhou: HTTP {response.status_code}")
            return

        try:
            payload = response.json()
            results = _extract_results(payload)
            for item in results:
                event_id = item.get("id") if isinstance(item, dict) else None
                if isinstance(event_id, int) and event_id not in user.cached_event_ids:
                    user.cached_event_ids.append(event_id)
            user.cached_event_ids = user.cached_event_ids[-100:]
            response.success()
        except Exception as exc:
            response.failure(f"json invalido em /api/events/: {exc}")


def event_detail(user) -> None:
    event_id = _pick_event_id(user)
    if event_id is None:
        list_events(user, name="GET /api/events/ (for detail)")
        event_id = _pick_event_id(user)
        if event_id is None:
            return

    with user.client.get(
        f"/api/events/{event_id}/",
        name="GET /api/events/{id}/",
        timeout=config.REQUEST_TIMEOUT_SECONDS,
    ):
        pass


def create_event(user) -> None:
    if not config.WRITE_TASKS_ENABLED:
        return

    future_day = date.today() + timedelta(days=random.randint(7, 45))
    invited = random.sample(user.cached_musician_ids, k=min(2, len(user.cached_musician_ids)))

    payload = {
        "title": f"[LOAD] Evento {uuid4().hex[:8]}",
        "description": "Carga automatizada Locust",
        "location": "Local de teste",
        "venue_contact": "(11) 90000-0000",
        "payment_amount": "500.00",
        "event_date": future_day.isoformat(),
        "start_time": "19:00",
        "end_time": "22:00",
        "is_solo": False if invited else True,
        "is_private": False,
        "invited_musicians": invited,
        "required_instruments": [{"instrument": "vocal", "quantity": 1}],
    }

    with user.client.post(
        "/api/events/",
        json=payload,
        name="POST /api/events/",
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code not in (200, 201):
            response.failure(f"criar evento falhou: HTTP {response.status_code}")
            return

        try:
            body = response.json()
            event_id = body.get("id") if isinstance(body, dict) else None
            if isinstance(event_id, int) and event_id not in user.cached_event_ids:
                user.cached_event_ids.append(event_id)
            response.success()
        except Exception as exc:
            response.failure(f"json invalido em criacao de evento: {exc}")


def set_availability(user) -> None:
    if not config.WRITE_TASKS_ENABLED:
        return

    with user.client.get(
        "/api/events/",
        params={"pending_approval": "true", "page_size": 20},
        name="GET /api/events/?pending_approval=true",
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code != 200:
            response.failure(f"buscar pendentes falhou: HTTP {response.status_code}")
            return

        try:
            payload = response.json()
            pending = _extract_results(payload)
            if not pending:
                response.success()
                return
            event = random.choice(pending)
            event_id = event.get("id") if isinstance(event, dict) else None
            if not isinstance(event_id, int):
                response.failure("id de evento pendente invalido")
                return
            response.success()
        except Exception as exc:
            response.failure(f"json invalido em pendentes: {exc}")
            return

    payload = {
        "response": random.choice(["available", "unavailable"]),
        "notes": "load test",
    }
    with user.client.post(
        f"/api/events/{event_id}/set_availability/",
        json=payload,
        name="POST /api/events/{id}/set_availability/",
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code != 200:
            response.failure(f"set_availability falhou: HTTP {response.status_code}")
            return
        response.success()

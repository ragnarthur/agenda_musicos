"""Tasks de marketplace (gigs) para Locust."""

from __future__ import annotations

import random
from datetime import date, timedelta
from uuid import uuid4

from load_tests import config

_GENRES = ["samba", "jazz", "MPB", "rock", "clássico", "sertanejo", "pop"]
_CITIES = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba", "Salvador"]


def _extract_results(payload):
    if isinstance(payload, dict) and "results" in payload and isinstance(payload["results"], list):
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return []


def _pick_gig_id(user) -> int | None:
    if user.cached_gig_ids:
        return random.choice(user.cached_gig_ids)
    return None


def list_gigs(user, *, name: str = "GET /api/marketplace/gigs/") -> None:
    with user.client.get(
        "/api/marketplace/gigs/",
        params={"page_size": 20},
        name=name,
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code != 200:
            response.failure(f"listar gigs falhou: HTTP {response.status_code}")
            return

        try:
            payload = response.json()
            results = _extract_results(payload)
            for item in results:
                gig_id = item.get("id") if isinstance(item, dict) else None
                if isinstance(gig_id, int) and gig_id not in user.cached_gig_ids:
                    user.cached_gig_ids.append(gig_id)
            user.cached_gig_ids = user.cached_gig_ids[-50:]
            response.success()
        except Exception as exc:
            response.failure(f"json inválido em /api/marketplace/gigs/: {exc}")


def gig_detail(user) -> None:
    gig_id = _pick_gig_id(user)
    if gig_id is None:
        list_gigs(user, name="GET /api/marketplace/gigs/ (for detail)")
        gig_id = _pick_gig_id(user)
        if gig_id is None:
            return

    with user.client.get(
        f"/api/marketplace/gigs/{gig_id}/",
        name="GET /api/marketplace/gigs/{id}/",
        timeout=config.REQUEST_TIMEOUT_SECONDS,
    ):
        pass


def apply_to_gig(user) -> None:
    if not config.WRITE_TASKS_ENABLED:
        return

    gig_id = _pick_gig_id(user)
    if gig_id is None:
        list_gigs(user, name="GET /api/marketplace/gigs/ (for apply)")
        gig_id = _pick_gig_id(user)
        if gig_id is None:
            return

    payload = {
        "cover_letter": f"[LOAD] Candidatura de teste {uuid4().hex[:8]}",
        "expected_fee": f"{random.randint(300, 2000)}.00",
    }

    with user.client.post(
        f"/api/marketplace/gigs/{gig_id}/apply/",
        json=payload,
        name="POST /api/marketplace/gigs/{id}/apply/",
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code not in (200, 201):
            response.failure(f"candidatura ao gig falhou: HTTP {response.status_code}")
            return
        response.success()

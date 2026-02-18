"""Tasks de listagem/busca de musicos."""

from __future__ import annotations

import random

from load_tests import config


def _extract_results(payload):
    if isinstance(payload, dict) and "results" in payload and isinstance(payload["results"], list):
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return []


def list_musicians(user, *, name: str = "GET /api/musicians/") -> None:
    term = random.choice(config.SEARCH_TERMS)
    params = {"search": term, "page_size": 20}

    with user.client.get(
        "/api/musicians/",
        params=params,
        name=name,
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code != 200:
            response.failure(f"listar musicos falhou: HTTP {response.status_code}")
            return

        try:
            payload = response.json()
            results = _extract_results(payload)
            for item in results:
                musician_id = item.get("id") if isinstance(item, dict) else None
                if isinstance(musician_id, int) and musician_id not in user.cached_musician_ids:
                    user.cached_musician_ids.append(musician_id)
            user.cached_musician_ids = user.cached_musician_ids[-100:]
            response.success()
        except Exception as exc:
            response.failure(f"json invalido em /api/musicians/: {exc}")


def list_public_musicians(user, *, name: str = "GET /api/musicians/all/") -> None:
    term = random.choice(config.SEARCH_TERMS)
    params = {"search": term}
    with user.client.get(
        "/api/musicians/all/",
        params=params,
        name=name,
        timeout=config.REQUEST_TIMEOUT_SECONDS,
    ):
        pass

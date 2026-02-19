"""Configuracoes de execucao para testes de carga."""

from __future__ import annotations

import os
from typing import Final


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


HOST: Final[str] = os.getenv("LOCUST_HOST", "http://127.0.0.1:8000")
REQUEST_TIMEOUT_SECONDS: Final[float] = _env_float("LOCUST_REQUEST_TIMEOUT", 15.0)

MUSICIAN_USERNAME: Final[str] = os.getenv("LOCUST_MUSICIAN_USERNAME", "livia_vocal")
MUSICIAN_PASSWORD: Final[str] = os.getenv("LOCUST_MUSICIAN_PASSWORD", "livia_vocal2026@")

CONTRACTOR_EMAIL: Final[str] = os.getenv("LOCUST_CONTRACTOR_EMAIL", "")
CONTRACTOR_PASSWORD: Final[str] = os.getenv("LOCUST_CONTRACTOR_PASSWORD", "")

WAIT_MIN_SECONDS: Final[int] = _env_int("LOCUST_WAIT_MIN", 1)
WAIT_MAX_SECONDS: Final[int] = _env_int("LOCUST_WAIT_MAX", 4)

WRITE_TASKS_ENABLED: Final[bool] = _env_bool("LOCUST_ENABLE_WRITE_TASKS", False)

# Pesos alvo (total 100) alinhados ao plano.
WEIGHT_AUTH: Final[int] = _env_int("LOCUST_WEIGHT_AUTH", 8)
WEIGHT_LIST_EVENTS: Final[int] = _env_int("LOCUST_WEIGHT_LIST_EVENTS", 25)
WEIGHT_LIST_MUSICIANS: Final[int] = _env_int("LOCUST_WEIGHT_LIST_MUSICIANS", 20)
WEIGHT_CREATE_EVENT: Final[int] = _env_int("LOCUST_WEIGHT_CREATE_EVENT", 10)
WEIGHT_EVENT_DETAIL: Final[int] = _env_int("LOCUST_WEIGHT_EVENT_DETAIL", 10)
WEIGHT_SET_AVAILABILITY: Final[int] = _env_int("LOCUST_WEIGHT_SET_AVAILABILITY", 7)
WEIGHT_LIST_QUOTES: Final[int] = _env_int("LOCUST_WEIGHT_LIST_QUOTES", 10)
WEIGHT_LIST_GIGS: Final[int] = _env_int("LOCUST_WEIGHT_LIST_GIGS", 10)
# Upload de avatar: desabilitado por padrao (write task); ativar com LOCUST_WEIGHT_UPLOAD_AVATAR=100
WEIGHT_UPLOAD_AVATAR: Final[int] = _env_int("LOCUST_WEIGHT_UPLOAD_AVATAR", 0)

# ID de músico usado como fallback para criação de quote quando cached_musician_ids está vazio.
# Deve corresponder a um músico ativo no ambiente de teste.
QUOTE_MUSICIAN_ID: Final[int] = _env_int("LOCUST_QUOTE_MUSICIAN_ID", 0)

SEARCH_TERMS: Final[list[str]] = ["vocal", "guitar", "drums", "keyboard", "samba", "jazz"]

# Gates para CI e relatorio headless.
MAX_FAIL_RATIO: Final[float] = _env_float("LOCUST_MAX_FAIL_RATIO", 0.05)
MAX_P95_MS: Final[float] = _env_float("LOCUST_MAX_P95_MS", 2000.0)

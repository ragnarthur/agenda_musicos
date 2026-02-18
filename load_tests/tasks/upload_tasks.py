"""Tarefas de upload de arquivo para testes de carga."""

from __future__ import annotations

import io
import os

from load_tests import config

# Fixture JPEG pre-gerado (100x100px, ~1.3 KB) — evita dependencia de Pillow
# no container locustio/locust em runtime.
_FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "../fixtures/test_avatar.jpg")

try:
    with open(_FIXTURE_PATH, "rb") as _f:
        _TEST_JPEG = _f.read()
except FileNotFoundError:
    # Fallback: JPEG minimo valido (1x1 pixel branco) para ambientes sem fixture
    import base64

    _TEST_JPEG = base64.b64decode(
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDB"
        "kSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAR"
        "CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAA"
        "AAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAA"
        "AAAAAAAA/9oADAMBAAIRAxEAPwCwABmX/9k="
    )


def upload_avatar(user, name: str = "POST /api/musicians/upload-avatar/") -> None:
    """Envia uma foto de avatar para o musico autenticado.

    Protegido por WRITE_TASKS_ENABLED para nao poluir dados de producao
    em execucoes de leitura.
    """
    if not config.WRITE_TASKS_ENABLED:
        return

    user.client.post(
        "/api/musicians/upload-avatar/",
        files={"avatar": ("test_avatar.jpg", io.BytesIO(_TEST_JPEG), "image/jpeg")},
        name=name,
    )

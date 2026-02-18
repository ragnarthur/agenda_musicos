"""Tasks e helpers de autenticacao para Locust."""

from __future__ import annotations

from load_tests import config


def login_musician(user, *, force: bool = False) -> bool:
    if user.authenticated and not force:
        return True

    payload = {
        "username": config.MUSICIAN_USERNAME,
        "password": config.MUSICIAN_PASSWORD,
    }
    with user.client.post(
        "/api/token/",
        json=payload,
        name="POST /api/token/",
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code != 200:
            response.failure(f"login musico falhou: HTTP {response.status_code}")
            user.authenticated = False
            return False

        if "access_token" not in response.cookies and "access_token" not in user.client.cookies:
            response.failure("cookie access_token ausente no login")
            user.authenticated = False
            return False

        response.success()

    user.authenticated = True
    return True


def login_contractor(user, *, force: bool = False) -> bool:
    if user.authenticated and not force:
        return True

    if not config.CONTRACTOR_EMAIL or not config.CONTRACTOR_PASSWORD:
        user.authenticated = False
        return False

    payload = {
        "email": config.CONTRACTOR_EMAIL,
        "password": config.CONTRACTOR_PASSWORD,
    }
    with user.client.post(
        "/api/contractor/token/",
        json=payload,
        name="POST /api/contractor/token/",
        timeout=config.REQUEST_TIMEOUT_SECONDS,
        catch_response=True,
    ) as response:
        if response.status_code != 200:
            response.failure(f"login contratante falhou: HTTP {response.status_code}")
            user.authenticated = False
            return False

        if "access_token" not in response.cookies and "access_token" not in user.client.cookies:
            response.failure("cookie access_token ausente no login de contratante")
            user.authenticated = False
            return False

        response.success()

    user.authenticated = True
    return True

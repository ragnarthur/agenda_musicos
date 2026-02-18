"""Entrada principal do Locust para testes de carga."""

from __future__ import annotations

from locust import events

from load_tests import config
from load_tests.users.contractor_user import ContractorUser
from load_tests.users.musician_user import MusicianUser

user_classes = [MusicianUser]
if config.CONTRACTOR_EMAIL and config.CONTRACTOR_PASSWORD:
    user_classes.append(ContractorUser)


@events.init.add_listener
def on_locust_init(environment, **_kwargs):
    users = ", ".join(cls.__name__ for cls in user_classes)
    print("[locust] host:", config.HOST)
    print("[locust] users:", users)
    print("[locust] write_tasks:", config.WRITE_TASKS_ENABLED)
    print(
        "[locust] target weights:",
        {
            "auth": config.WEIGHT_AUTH,
            "events_list": config.WEIGHT_LIST_EVENTS,
            "musicians_list": config.WEIGHT_LIST_MUSICIANS,
            "create_event": config.WEIGHT_CREATE_EVENT,
            "event_detail": config.WEIGHT_EVENT_DETAIL,
            "set_availability": config.WEIGHT_SET_AVAILABILITY,
            "list_quotes": config.WEIGHT_LIST_QUOTES,
            "list_gigs": config.WEIGHT_LIST_GIGS,
        },
    )
    print(
        "[locust] quality gates:",
        {"max_fail_ratio": config.MAX_FAIL_RATIO, "max_p95_ms": config.MAX_P95_MS},
    )


@events.quitting.add_listener
def on_locust_quitting(environment, **_kwargs):
    stats = environment.stats.total

    if stats.num_requests == 0:
        print("[locust] nenhuma requisicao executada.")
        environment.process_exit_code = 2
        return

    fail_ratio = stats.fail_ratio or 0.0
    p95_ms = stats.get_response_time_percentile(0.95) or 0.0

    print(
        "[locust] resumo final:",
        {
            "requests": stats.num_requests,
            "fail_ratio": round(fail_ratio, 4),
            "avg_ms": round(stats.avg_response_time or 0.0, 2),
            "p95_ms": round(p95_ms, 2),
            "rps": round(stats.total_rps or 0.0, 2),
        },
    )

    failed_gate = fail_ratio > config.MAX_FAIL_RATIO or p95_ms > config.MAX_P95_MS
    environment.process_exit_code = 1 if failed_gate else 0

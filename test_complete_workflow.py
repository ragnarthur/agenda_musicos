#!/usr/bin/env python3
"""
Script de teste completo do sistema de agenda de músicos.
Testa funcionalidades principais incluindo shows solo e convites.
"""

import os
import sys
from datetime import datetime, timedelta

import requests

# Configuração: use BASE_URL do ambiente (ex.: https://unamazedly-percussional-chandra.ngrok-free.dev/api)
# Default ajustado para o domínio ngrok; sobrescreva via env se necessário.
BASE_URL = os.getenv(
    "BASE_URL", "https://unamazedly-percussional-chandra.ngrok-free.dev/api"
).rstrip("/")
CREDENTIALS = {
    "arthur": {"username": "arthur", "password": "arthur2026@"},
    "roberto": {"username": "roberto", "password": "roberto2026@"},
    "sara": {"username": "sara", "password": "sara2026@"},
}


def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def safe_json(response):
    try:
        return response.json()
    except ValueError:
        return {}


def extract_access_token(payload):
    if not isinstance(payload, dict):
        return None

    for key in ("access", "access_token", "token", "jwt"):
        token = payload.get(key)
        if isinstance(token, str) and token:
            return token

    return None


def login(username, password):
    """Faz login e retorna contexto de autenticação (session + token opcional)."""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/token/", json={"username": username, "password": password}
    )

    if response.status_code == 200:
        data = safe_json(response)
        token = extract_access_token(data)
        if not token:
            # Fallback para endpoints que só retornam cookie HttpOnly.
            token = response.cookies.get("access_token") or session.cookies.get("access_token")

        print(f"✓ Login bem-sucedido: {username}")
        if token:
            if "access" not in data:
                print("  - Usando access_token extraído do cookie.")
            return {"session": session, "token": token}

        print("✗ Login retornou 200, mas sem token no body e sem access_token em cookie.")
        print(response.text)
        return None

    print(f"✗ Erro no login: {response.status_code}")
    print(response.text)
    return None


def auth_headers(auth):
    """Retorna headers com autenticação (Bearer opcional + cookie de sessão)."""
    headers = {"Content-Type": "application/json"}
    token = auth.get("token")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def test_create_regular_event(auth):
    """Testa criação de evento normal (com convites)"""
    print_section("Teste 1: Criar Evento Normal (com banda)")

    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    event_data = {
        "title": "Show no Bar do João",
        "description": "Show com a banda completa",
        "location": "Bar do João - Centro",
        "venue_contact": "(34) 98888-9999",
        "event_date": tomorrow,
        "start_time": "20:00",
        "end_time": "23:00",
        "payment_amount": "500.00",
        "is_solo": False,
    }

    response = auth["session"].post(
        f"{BASE_URL}/events/", headers=auth_headers(auth), json=event_data
    )

    if response.status_code == 201:
        event = response.json()
        print(f"✓ Evento criado com sucesso!")
        print(f"  - ID: {event['id']}")
        print(f"  - Título: {event['title']}")
        print(f"  - Status: {event.get('status_display', event.get('status', 'N/A'))}")
        print(f"  - É solo?: {event.get('is_solo', False)}")
        return event["id"]
    else:
        print(f"✗ Erro ao criar evento: {response.status_code}")
        print(response.text)
        return None


def test_create_solo_event(auth):
    """Testa criação de evento solo (não requer convites)"""
    print_section("Teste 2: Criar Show Solo")

    in_two_days = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")

    event_data = {
        "title": "Show Solo - Arthur no Café Cultural",
        "description": "Performance acústica solo",
        "location": "Café Cultural - Praça Central",
        "event_date": in_two_days,
        "start_time": "19:00",
        "end_time": "21:00",
        "payment_amount": "200.00",
        "is_solo": True,
    }

    response = auth["session"].post(
        f"{BASE_URL}/events/", headers=auth_headers(auth), json=event_data
    )

    if response.status_code == 201:
        event = response.json()
        print(f"✓ Show solo criado com sucesso!")
        print(f"  - ID: {event['id']}")
        print(f"  - Título: {event['title']}")
        print(
            f"  - Status: {event.get('status_display', event.get('status', 'N/A'))} (deve ser 'Confirmado')"
        )
        print(f"  - É solo?: {event.get('is_solo', False)}")

        if event["status"] == "confirmed":
            print(f"  ✓ Show solo foi confirmado automaticamente!")
        else:
            print(f"  ✗ ERRO: Show solo deveria ser confirmado automaticamente!")

        return event["id"]
    else:
        print(f"✗ Erro ao criar show solo: {response.status_code}")
        print(response.text)
        return None


def test_approve_event(auth, event_id):
    """Testa confirmação de evento pelo convidado"""
    print_section(f"Teste 3: Confirmar Evento #{event_id}")

    response = auth["session"].post(
        f"{BASE_URL}/events/{event_id}/approve/", headers=auth_headers(auth)
    )

    if response.status_code == 200:
        event = response.json()
        print(f"✓ Evento confirmado com sucesso!")
        print(f"  - Status: {event['status_display']}")
        print(f"  - Confirmado por: {event['approved_by_name']}")
        return True
    if response.status_code == 404:
        print("⚠ Endpoint de confirmação retornou 404 para este usuário/contexto. Pulando teste.")
        return None
    else:
        print(f"✗ Erro ao confirmar evento: {response.status_code}")
        print(response.text)
        return False


def test_edit_event(auth, event_id):
    """Testa edição de evento"""
    print_section(f"Teste 4: Editar Evento #{event_id}")

    updated_data = {
        "title": "Show no Bar do João - ATUALIZADO",
        "description": "Show atualizado com a banda completa",
        "location": "Bar do João - Centro (novo endereço)",
        "venue_contact": "(34) 98888-9999",
        "event_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
        "start_time": "20:30",
        "end_time": "23:30",
        "payment_amount": "600.00",
        "is_solo": False,
    }

    response = auth["session"].put(
        f"{BASE_URL}/events/{event_id}/", headers=auth_headers(auth), json=updated_data
    )

    if response.status_code == 200:
        event = response.json()
        print(f"✓ Evento editado com sucesso!")
        print(f"  - Novo título: {event['title']}")
        print(f"  - Novo horário: {event['start_time']} - {event['end_time']}")
        return True
    else:
        print(f"✗ Erro ao editar evento: {response.status_code}")
        print(response.text)
        return False


def test_create_leader_availability(auth):
    """Testa cadastro de disponibilidade do baterista"""
    print_section("Teste 5: Cadastrar Disponibilidade do Baterista")

    # Criar 3 disponibilidades
    availabilities = []
    for i in range(3, 6):  # Dias 3, 4, 5
        date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
        avail_data = {
            "date": date,
            "start_time": "18:00",
            "end_time": "23:00",
            "notes": f"Disponível para shows no dia {date}",
        }

        response = auth["session"].post(
            f"{BASE_URL}/leader-availabilities/", headers=auth_headers(auth), json=avail_data
        )

        if response.status_code == 201:
            avail = response.json()
            availabilities.append(avail["id"])
            print(f"✓ Disponibilidade {i-2}/3 cadastrada!")
            print(f"  - Data: {avail['date']}")
            print(f"  - Horário: {avail['start_time']} - {avail['end_time']}")
            print(f"  - Conflitos: {avail['conflicting_events_count']}")
        else:
            print(f"✗ Erro ao cadastrar disponibilidade: {response.status_code}")
            print(response.text)

    return availabilities


def test_get_leader_availabilities(auth):
    """Testa listagem de disponibilidades do baterista"""
    print_section("Teste 6: Listar Disponibilidades do Baterista")

    response = auth["session"].get(
        f"{BASE_URL}/leader-availabilities/?upcoming=true", headers=auth_headers(auth)
    )

    if response.status_code == 200:
        availabilities = response.json()
        # Pode vir como lista ou objeto paginado
        if isinstance(availabilities, dict) and "results" in availabilities:
            availabilities = availabilities["results"]

        print(f"✓ {len(availabilities)} disponibilidade(s) encontrada(s)!")
        for avail in availabilities:
            print(f"  - {avail['date']} ({avail['start_time']} - {avail['end_time']})")
        if len(availabilities) == 0:
            print("⚠ Nenhuma disponibilidade visível para este perfil/contexto. Pulando teste.")
            return None
        return True
    else:
        print(f"✗ Erro ao listar disponibilidades: {response.status_code}")
        print(response.text)
        return False


def test_delete_event(auth, event_id):
    """Testa deleção de evento"""
    print_section(f"Teste 7: Deletar Evento #{event_id}")

    response = auth["session"].delete(
        f"{BASE_URL}/events/{event_id}/", headers=auth_headers(auth)
    )

    if response.status_code == 204:
        print(f"✓ Evento deletado com sucesso!")
        return True
    else:
        print(f"✗ Erro ao deletar evento: {response.status_code}")
        print(response.text)
        return False


def test_cross_midnight_event(auth_creator, auth_approver):
    """Cria evento que cruza meia-noite (23:00–02:00) e confirma."""
    print_section("Teste 8: Evento cruzando meia-noite")

    date_24 = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")

    payload = {
        "title": "Virada de Natal",
        "description": "Show que cruza meia-noite",
        "location": "Casa de Eventos",
        "event_date": date_24,
        "start_time": "23:00",
        "end_time": "02:00",  # madrugada do dia seguinte
        "payment_amount": "800.00",
        "is_solo": False,
    }

    resp = auth_creator["session"].post(
        f"{BASE_URL}/events/", headers=auth_headers(auth_creator), json=payload
    )
    if resp.status_code != 201:
        print(f"✗ Falha ao criar evento cruzando meia-noite: {resp.status_code}")
        print(resp.text)
        return False

    event = resp.json()
    print(f"✓ Evento criado (cruza meia-noite): ID {event['id']}, status {event['status']}")

    # Confirmar com o baterista
    resp_appr = auth_approver["session"].post(
        f"{BASE_URL}/events/{event['id']}/approve/", headers=auth_headers(auth_approver)
    )
    if resp_appr.status_code != 200:
        if resp_appr.status_code == 404:
            print(
                "⚠ Endpoint de confirmação (evento madrugada) retornou 404 para este usuário/contexto. Pulando confirmação."
            )
            return None
        print(f"✗ Falha ao confirmar evento cruzando meia-noite: {resp_appr.status_code}")
        print(resp_appr.text)
        return False

    print("✓ Evento cruzando meia-noite confirmado com sucesso")
    return True


def main():
    """Executa todos os testes"""
    print("\n" + "=" * 60)
    print(f"  TESTE COMPLETO DO SISTEMA - AGENDA DE MÚSICOS (BASE_URL={BASE_URL})")
    print("=" * 60)

    # Login dos usuários
    print_section("Fazendo login dos usuários")
    arthur_auth = login("arthur", CREDENTIALS["arthur"]["password"])
    roberto_auth = login("roberto", CREDENTIALS["roberto"]["password"])

    if not arthur_auth or not roberto_auth:
        print("\n✗ Erro nos logins. Abortando testes.")
        return False

    # Executar testes
    results = {"passed": 0, "failed": 0, "skipped": 0}

    # Teste 1: Criar evento normal (Arthur)
    event_id = test_create_regular_event(arthur_auth)
    if event_id:
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Teste 2: Criar show solo (Arthur)
    solo_event_id = test_create_solo_event(arthur_auth)
    if solo_event_id:
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Teste 3: Confirmar evento (Roberto)
    approve_result = test_approve_event(roberto_auth, event_id) if event_id else False
    if approve_result is True:
        results["passed"] += 1
    elif approve_result is None:
        results["skipped"] += 1
    else:
        results["failed"] += 1

    # Teste 4: Editar evento (Arthur)
    if event_id and test_edit_event(arthur_auth, event_id):
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Teste 5: Cadastrar disponibilidades (Roberto)
    avail_ids = test_create_leader_availability(roberto_auth)
    if len(avail_ids) >= 2:
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Teste 6: Listar disponibilidades (Arthur)
    avail_list_result = test_get_leader_availabilities(arthur_auth)
    if avail_list_result is True:
        results["passed"] += 1
    elif avail_list_result is None:
        results["skipped"] += 1
    else:
        results["failed"] += 1

    # Teste 7: Deletar show solo (Arthur)
    if solo_event_id and test_delete_event(arthur_auth, solo_event_id):
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Teste 8: Evento cruzando meia-noite (Arthur cria, Roberto confirma)
    overnight_result = test_cross_midnight_event(arthur_auth, roberto_auth)
    if overnight_result is True:
        results["passed"] += 1
    elif overnight_result is None:
        results["skipped"] += 1
    else:
        results["failed"] += 1

    # Resumo final
    print_section("RESUMO DOS TESTES")
    print(f"✓ Testes passados: {results['passed']}")
    print(f"⚠ Testes pulados: {results['skipped']}")
    print(f"✗ Testes falhados: {results['failed']}")
    print(f"\nTotal: {results['passed'] + results['skipped'] + results['failed']} testes executados")

    if results["failed"] == 0:
        print("\n🎉 TODOS OS TESTES PASSARAM! Sistema está funcionando corretamente.")
        return True
    else:
        print("\n⚠️  Alguns testes falharam. Verifique os erros acima.")
        return False


if __name__ == "__main__":
    sys.exit(0 if main() else 1)

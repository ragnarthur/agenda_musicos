#!/usr/bin/env python3
"""
Script de teste completo do sistema de agenda de músicos.
Testa todas as funcionalidades principais incluindo shows solo e disponibilidades do líder.
"""

import requests
import json
from datetime import datetime, timedelta

# Configuração
BASE_URL = "http://localhost:8000/api"
CREDENTIALS = {
    "arthur": {"username": "arthur", "password": "arthur123"},
    "roberto": {"username": "roberto", "password": "roberto123"},
    "sara": {"username": "sara", "password": "sara123"},
}

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def login(username, password):
    """Faz login e retorna o token"""
    response = requests.post(f"{BASE_URL}/token/", json={
        "username": username,
        "password": password
    })
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Login bem-sucedido: {username}")
        return data['access']
    else:
        print(f"✗ Erro no login: {response.status_code}")
        print(response.text)
        return None

def get_headers(token):
    """Retorna headers com autenticação"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_create_regular_event(token):
    """Testa criação de evento normal (requer aprovação)"""
    print_section("Teste 1: Criar Evento Normal (com banda)")

    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

    event_data = {
        "title": "Show no Bar do João",
        "description": "Show com a banda completa",
        "location": "Bar do João - Centro",
        "venue_contact": "(34) 98888-9999",
        "event_date": tomorrow,
        "start_time": "20:00",
        "end_time": "23:00",
        "payment_amount": "500.00",
        "is_solo": False
    }

    response = requests.post(
        f"{BASE_URL}/events/",
        headers=get_headers(token),
        json=event_data
    )

    if response.status_code == 201:
        event = response.json()
        print(f"✓ Evento criado com sucesso!")
        print(f"  - ID: {event['id']}")
        print(f"  - Título: {event['title']}")
        print(f"  - Status: {event.get('status_display', event.get('status', 'N/A'))}")
        print(f"  - É solo?: {event.get('is_solo', False)}")
        return event['id']
    else:
        print(f"✗ Erro ao criar evento: {response.status_code}")
        print(response.text)
        return None

def test_create_solo_event(token):
    """Testa criação de evento solo (não requer aprovação)"""
    print_section("Teste 2: Criar Show Solo")

    in_two_days = (datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d')

    event_data = {
        "title": "Show Solo - Arthur no Café Cultural",
        "description": "Performance acústica solo",
        "location": "Café Cultural - Praça Central",
        "event_date": in_two_days,
        "start_time": "19:00",
        "end_time": "21:00",
        "payment_amount": "200.00",
        "is_solo": True
    }

    response = requests.post(
        f"{BASE_URL}/events/",
        headers=get_headers(token),
        json=event_data
    )

    if response.status_code == 201:
        event = response.json()
        print(f"✓ Show solo criado com sucesso!")
        print(f"  - ID: {event['id']}")
        print(f"  - Título: {event['title']}")
        print(f"  - Status: {event.get('status_display', event.get('status', 'N/A'))} (deve ser 'Aprovada pelo Líder')")
        print(f"  - É solo?: {event.get('is_solo', False)}")

        if event['status'] == 'approved':
            print(f"  ✓ Show solo foi aprovado automaticamente!")
        else:
            print(f"  ✗ ERRO: Show solo deveria ser aprovado automaticamente!")

        return event['id']
    else:
        print(f"✗ Erro ao criar show solo: {response.status_code}")
        print(response.text)
        return None

def test_approve_event(token, event_id):
    """Testa aprovação de evento pelo líder"""
    print_section(f"Teste 3: Aprovar Evento #{event_id}")

    response = requests.post(
        f"{BASE_URL}/events/{event_id}/approve/",
        headers=get_headers(token)
    )

    if response.status_code == 200:
        event = response.json()
        print(f"✓ Evento aprovado com sucesso!")
        print(f"  - Status: {event['status_display']}")
        print(f"  - Aprovado por: {event['approved_by_name']}")
        return True
    else:
        print(f"✗ Erro ao aprovar evento: {response.status_code}")
        print(response.text)
        return False

def test_edit_event(token, event_id):
    """Testa edição de evento"""
    print_section(f"Teste 4: Editar Evento #{event_id}")

    updated_data = {
        "title": "Show no Bar do João - ATUALIZADO",
        "description": "Show atualizado com a banda completa",
        "location": "Bar do João - Centro (novo endereço)",
        "venue_contact": "(34) 98888-9999",
        "event_date": (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
        "start_time": "20:30",
        "end_time": "23:30",
        "payment_amount": "600.00",
        "is_solo": False
    }

    response = requests.put(
        f"{BASE_URL}/events/{event_id}/",
        headers=get_headers(token),
        json=updated_data
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

def test_create_leader_availability(token):
    """Testa cadastro de disponibilidade do líder"""
    print_section("Teste 5: Cadastrar Disponibilidade do Líder")

    # Criar 3 disponibilidades
    availabilities = []
    for i in range(3, 6):  # Dias 3, 4, 5
        date = (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
        avail_data = {
            "date": date,
            "start_time": "18:00",
            "end_time": "23:00",
            "notes": f"Disponível para shows no dia {date}"
        }

        response = requests.post(
            f"{BASE_URL}/leader-availabilities/",
            headers=get_headers(token),
            json=avail_data
        )

        if response.status_code == 201:
            avail = response.json()
            availabilities.append(avail['id'])
            print(f"✓ Disponibilidade {i-2}/3 cadastrada!")
            print(f"  - Data: {avail['date']}")
            print(f"  - Horário: {avail['start_time']} - {avail['end_time']}")
            print(f"  - Conflitos: {avail['conflicting_events_count']}")
        else:
            print(f"✗ Erro ao cadastrar disponibilidade: {response.status_code}")
            print(response.text)

    return availabilities

def test_get_leader_availabilities(token):
    """Testa listagem de disponibilidades do líder"""
    print_section("Teste 6: Listar Disponibilidades do Líder")

    response = requests.get(
        f"{BASE_URL}/leader-availabilities/?upcoming=true",
        headers=get_headers(token)
    )

    if response.status_code == 200:
        availabilities = response.json()
        # Pode vir como lista ou objeto paginado
        if isinstance(availabilities, dict) and 'results' in availabilities:
            availabilities = availabilities['results']

        print(f"✓ {len(availabilities)} disponibilidade(s) encontrada(s)!")
        for avail in availabilities:
            print(f"  - {avail['date']} ({avail['start_time']} - {avail['end_time']})")
        return len(availabilities) > 0
    else:
        print(f"✗ Erro ao listar disponibilidades: {response.status_code}")
        print(response.text)
        return False

def test_delete_event(token, event_id):
    """Testa deleção de evento"""
    print_section(f"Teste 7: Deletar Evento #{event_id}")

    response = requests.delete(
        f"{BASE_URL}/events/{event_id}/",
        headers=get_headers(token)
    )

    if response.status_code == 204:
        print(f"✓ Evento deletado com sucesso!")
        return True
    else:
        print(f"✗ Erro ao deletar evento: {response.status_code}")
        print(response.text)
        return False

def main():
    """Executa todos os testes"""
    print("\n" + "="*60)
    print("  TESTE COMPLETO DO SISTEMA - AGENDA DE MÚSICOS")
    print("="*60)

    # Login dos usuários
    print_section("Fazendo login dos usuários")
    arthur_token = login("arthur", "arthur123")
    roberto_token = login("roberto", "roberto123")

    if not arthur_token or not roberto_token:
        print("\n✗ Erro nos logins. Abortando testes.")
        return

    # Executar testes
    results = {
        "passed": 0,
        "failed": 0
    }

    # Teste 1: Criar evento normal (Arthur)
    event_id = test_create_regular_event(arthur_token)
    if event_id:
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Teste 2: Criar show solo (Arthur)
    solo_event_id = test_create_solo_event(arthur_token)
    if solo_event_id:
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Teste 3: Aprovar evento (Roberto)
    if event_id and test_approve_event(roberto_token, event_id):
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Teste 4: Editar evento (Arthur)
    if event_id and test_edit_event(arthur_token, event_id):
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Teste 5: Cadastrar disponibilidades (Roberto)
    avail_ids = test_create_leader_availability(roberto_token)
    if len(avail_ids) >= 2:
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Teste 6: Listar disponibilidades (Arthur)
    if test_get_leader_availabilities(arthur_token):
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Teste 7: Deletar show solo (Arthur)
    if solo_event_id and test_delete_event(arthur_token, solo_event_id):
        results["passed"] += 1
    else:
        results["failed"] += 1

    # Resumo final
    print_section("RESUMO DOS TESTES")
    print(f"✓ Testes passados: {results['passed']}")
    print(f"✗ Testes falhados: {results['failed']}")
    print(f"\nTotal: {results['passed'] + results['failed']} testes executados")

    if results['failed'] == 0:
        print("\n🎉 TODOS OS TESTES PASSARAM! Sistema está funcionando corretamente.")
    else:
        print("\n⚠️  Alguns testes falharam. Verifique os erros acima.")

if __name__ == "__main__":
    main()

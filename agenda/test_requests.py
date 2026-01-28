#!/usr/bin/env python3
# Test script for musician requests
import requests
import json

# Configuração
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"

# Dados de teste para solicitação
test_request_data = {
    "email": "teste.musicista@example.com",
    "full_name": "Músico Teste",
    "phone": "(34) 98765-4321",
    "instrument": "Violão",
    "instruments": ["Violão", "Guitarra", "Canto"],
    "bio": "Músico profissional com 10 anos de experiência em shows ao vivo e estúdio.",
    "city": "Monte Carmelo",
    "state": "MG",
    "instagram": "@musico_teste",
}


def test_create_musician_request():
    """Testa criação de solicitação de músico"""
    print("\n🎯 Testando criação de solicitação de músico...")

    try:
        response = requests.post(
            f"{API_URL}/musician-request/",
            json=test_request_data,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 201:
            print("✅ Solicitação criada com sucesso!")
            data = response.json()
            print(f"ID: {data['id']}")
            print(f"Message: {data['message']}")
            return data["id"]
        else:
            print(f"❌ Erro na criação: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return None


def test_get_admin_requests():
    """Testa listagem de solicitações (requer autenticação)"""
    print("\n📋 Testando listagem de solicitações...")

    try:
        response = requests.get(f"{API_URL}/admin/musician-requests/")

        if response.status_code == 200:
            print("✅ Lista obtida com sucesso!")
            requests = response.json()
            print(f"Total de solicitações: {len(requests)}")

            if requests:
                print("\n📋 Solicitações encontradas:")
                for req in requests[:5]:  # Apenas as 5 primeiras
                    print(f"  • ID: {req['id']} | Status: {req['status']}")
            else:
                print("Nenhuma solicitação encontrada")
            return requests
        else:
            print(f"❌ Erro ao obter lista: {response.status_code}")
            print(f"Response: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return None


def test_approval_flow(request_id):
    """Testa fluxo completo de aprovação"""
    print(f"\n🚀 Testando fluxo de aprovação para solicitação #{request_id}...")

    try:
        # Teste 2: Aprovar solicitação
        approval_data = {"admin_notes": "Teste de aprovação automática"}
        response = requests.post(
            f"{API_URL}/admin/musician-requests/{request_id}/approve/",
            json=approval_data,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            print("✅ Solicitação aprovada com sucesso!")
            data = response.json()
            print(f"Expires at: {data['invite_expires_at']}")

            # Teste 3: Validar token
            if data.get("invite_token"):
                token = data["invite_token"]
                validation_response = requests.get(
                    f"{API_URL}/validate-invite/?token={token}"
                )

                if validation_response.status_code == 200:
                    print("✅ Token validado!")
                    validation_data = validation_response.json()
                    print(f"Email: {validation_data['email']}")
                    print(f"Nome: {validation_data['full_name']}")
                    print(f"Cidade: {validation_data['city']}")
                    print(
                        f"Token: {token[:20]}..."
                    )  # Mostra apenas primeiros 20 caracteres
                    validation_response.json()
                    print(f"Permissão: {validation_data['can_register']}")
                    return token
                else:
                    print(f"❌ Token inválido")
            else:
                print("🔑 Sem invite token no retorno")
        else:
            print(f"❌ Erro na aprovação: {response.status_code}")
            print(f"Response: {response.text}")
        return None

    except Exception as e:
        print(f"❌ Erro no fluxo de aprovação: {e}")
        return None


def test_invite_validation(token):
    """Testa validação de token de convite"""
    print(f"🔑 Testando validação do token: {token[:20]}...")

    try:
        response = requests.get(f"{BASE_URL}/validate-invite/?token={token}")

        if response.status_code == 200:
            print("✅ Token validado com sucesso!")
            data = response.json()
            print(f"Token: {token[:20]}...")  # Mostra apenas primeiros 20 caracteres
            print(f"Email: {data['email']}")
            print(f"Nome: {data['full_name']}")
            print(f"Cidade: {data['city']}")
            print(f"Pode criar conta: {data['can_register']}")
            return data["can_register"]
        else:
            print(f"❌ Token inválido ou expirado")
            return False

    except Exception as e:
        print(f"❌ Erro na validação: {e}")
        return False


def test_complete_flow():
    """Testa o fluxo completo"""
    print("\n🚀 Teste 1: Criar solicitação")
    request_id = test_create_musician_request()

    if not request_id:
        print("❌ Falhou ao criar solicitação")
        return False

    print("\n🚀 Teste 2: Listar solicitações")
    requests = test_get_admin_requests()

    if requests and len(requests) > 0:
        last_request_id = requests[0]["id"]
        print(f"\n🚀 Teste 3: Fluxo completo para solicitação #{last_request_id}")
        success = test_complete_flow(last_request_id)

        if success:
            print("✅ ✅ Teste 4: Validar token")
            token = success
            valid = test_invite_validation(token)

            if valid:
                print(f"✅ Token válido para criar conta!")
            else:
                print("❌ Token inválido")
        else:
            print("❌ Falhou na validação")
    else:
        print("❌ Nenhuma solicitação para testar")

    print("\n🎉 Testes finalizados!")
    return True


if __name__ == "__main__":
    print("=== 🧪 Testes Automatizados - Sistema de Solicitações GigFlow ===")

    print("\nExecutando testes...")
    print()

    success = test_complete_flow()

    if success:
        print("\n🎉 Todos os testes passaram com sucesso!")
    else:
        print("\n❌ Alguns testes falharam")

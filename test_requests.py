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
    "instruments": ["Violão", "Guitarra"],
    "bio": "Músico profissional com 10 anos de experiência em shows ao vivo e estúdio.",
    "city": "Monte Carmelo",
    "state": "MG",
    "instagram": "@musicista_teste",
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
    """Testa listagem de solicitações (requer autenticação admin)"""
    print("\n📋 Testando listagem de solicitações...")

    try:
        response = requests.get(f"{API_URL}/admin/musician-requests/")

        if response.status_code == 200:
            print("✅ Lista obtida com sucesso!")
            requests = response.json()
            print(f"Total de solicitações: {len(requests)}")
            return requests
        else:
            print(f"❌ Erro ao obter lista: {response.status_code}")
            return None

    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
        return None


def test_approval_flow(request_id):
    """Testa fluxo completo de aprovação"""
    print(f"\n🚀 Testando fluxo de aprovação para solicitação #{request_id}...")

    # Teste 2: Aprovar solicitação
    approval_data = {"admin_notes": "Teste de aprovação manual"}
    response = requests.post(
        f"{API_URL}/admin/musician-requests/{request_id}/approve/",
        json=approval_data,
        headers={"Content-Type": "application/json"},
    )

    if response.status_code == 200:
        print("✅ Solicitação aprovada com sucesso!")
        data = response.json()

        # Teste 3: Validar token
        if data.get("invite_token"):
            token = data.get("invite_token")
            validation_response = requests.get(
                f"{API_URL}/validate-invite/?token={token}"
            )

            if validation_response.status_code == 200:
                print("✅ Token validado com sucesso!")
                validation_data = validation_response.json()
                print(f"Email: {validation_data['email']}")
                print(f"Nome: {validation_data['full_name']}")
                print(
                    f"Token: {token[:20]}..."
                )  # Mostra apenas primeiros 20 caracteres
                return token
            else:
                print(f"❌ Token inválido: {validation_response.status_code}")
                return None
        else:
            return None
    else:
        print(f"❌ Erro na aprovação: {response.status_code}")
        return None


def test_complete_flow():
    """Testa o fluxo completo de solicitação → aprovação → credenciais"""
    print("\n🚀 Teste completo do fluxo de solicitação → aprovação")

    # Teste 1: Criar solicitação
    request_id = test_create_musician_request()

    if not request_id:
        print("\n❌ Não foi possível criar solicitação de teste")
        return False

    # Teste 2: Aprovar solicitação
    approval_result = test_approval_flow(request_id)

    if not approval_result:
        print("\n❌ Falhou no fluxo de aprovação")
        return False

    # Teste 3: Validar token e login
    token = approval_result if approval_result else test_approval_flow(request_id)

    if token:
        print(f"\n🎉 Token validado: {token}")
        # Aqui poderia testar login com as credenciais geradas
        print(f"Login URL: {BASE_URL}/login")
        print("Usuário: [username]")
        print("Senha: [password]")

    print("\n🎉 Teste finalizado com sucesso!")
    return True


if __name__ == "__main__":
    print("=== 🧪 Testes do Sistema de Solicitações GigFlow ===")

    # Opções de teste
    test_options = [
        "1. Testar criação de solicitação",
        "2. Listar solicitações (requer admin)",
        "3. Testar fluxo completo",
        "4. Testar apenas validação de token",
        "5. Sair",
    ]

    print("\nSelecione uma opção:")
    for i, option in enumerate(test_options, 1):
        print(f"{i}. {option}")

    choice = input("\nDigite sua escolha (1-5): ")

    if choice == "1":
        test_create_musician_request()
    elif choice == "2":
        test_get_admin_requests()
    elif choice == "3":
        test_complete_flow()
    elif choice == "4":
        # Usar último request_id se existir
        test_approval_flow(1)
    else:
        print("Saindo dos testes...")

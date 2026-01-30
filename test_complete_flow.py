#!/usr/bin/env python
"""
Script de teste completo para validação do fluxo da aplicação.
Testa: Registro, Verificação de Email, Pagamento, Login e funcionalidades principais.
"""

import json
import os
import sys
from datetime import date, timedelta

import django

# Setup Django - usar ambiente de desenvolvimento para ter DEBUG=True
os.environ.setdefault("DJANGO_ENV", "development")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User
from django.test import Client

from agenda.models import (
    Availability,
    Connection,
    Event,
    LeaderAvailability,
    Membership,
    Musician,
    Organization,
    PendingRegistration,
)

# Colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"
BOLD = "\033[1m"


def print_header(text):
    print(f"\n{BOLD}{BLUE}{'='*60}{RESET}")
    print(f"{BOLD}{BLUE}{text}{RESET}")
    print(f"{BOLD}{BLUE}{'='*60}{RESET}\n")


def print_success(text):
    print(f"{GREEN}✓ {text}{RESET}")


def print_error(text):
    print(f"{RED}✗ {text}{RESET}")


def print_warning(text):
    print(f"{YELLOW}⚠ {text}{RESET}")


def print_info(text):
    print(f"{BLUE}ℹ {text}{RESET}")


class FlowTester:
    def __init__(self):
        self.client = Client()
        self.test_email = f"teste_{date.today().isoformat()}@teste.com"
        self.test_username = f"teste_{date.today().isoformat().replace('-', '')}"
        self.test_password = "senha123456"
        self.errors = []
        self.successes = []

    def cleanup(self):
        """Remove dados de teste anteriores"""
        print_info("Limpando dados de teste anteriores...")
        PendingRegistration.objects.filter(email__contains="teste_").delete()
        User.objects.filter(username__startswith="teste_").delete()
        print_success("Dados de teste limpos")

    def test_registration_flow(self):
        """Testa o fluxo completo de registro"""
        print_header("1. TESTE DE REGISTRO")

        # 1.1 Registro com dados inválidos (sem email)
        print_info("Testando validação de campos obrigatórios...")
        response = self.client.post(
            "/api/register/",
            {
                "username": self.test_username,
                "password": self.test_password,
                "first_name": "Teste",
            },
            content_type="application/json",
        )

        if response.status_code == 400:
            print_success("Validação de email obrigatório funcionando")
        else:
            print_error(f"Validação falhou: {response.status_code}")
            self.errors.append("Validação de email obrigatório não funcionou")

        # 1.2 Registro com dados válidos
        print_info("Testando registro com dados válidos...")
        response = self.client.post(
            "/api/register/",
            {
                "email": self.test_email,
                "username": self.test_username,
                "password": self.test_password,
                "first_name": "Usuário",
                "last_name": "Teste",
                "phone": "11999999999",
                "instrument": "guitar",
                "bio": "Músico de teste para validação",
                "city": "Sao Paulo",
                "state": "SP",
            },
            content_type="application/json",
        )

        if response.status_code == 201:
            print_success(f"Registro criado com sucesso para {self.test_email}")
            self.successes.append("Registro criado")
        else:
            print_error(f"Falha no registro: {response.status_code} - {response.content}")
            self.errors.append("Registro falhou")
            return False

        # 1.3 Verificar se PendingRegistration foi criado
        pending = PendingRegistration.objects.filter(email=self.test_email).first()
        if pending:
            print_success(f"PendingRegistration criado com status: {pending.status}")
            self.email_token = pending.email_token
        else:
            print_error("PendingRegistration não foi criado")
            self.errors.append("PendingRegistration não criado")
            return False

        return True

    def test_email_verification(self):
        """Testa verificação de email"""
        print_header("2. TESTE DE VERIFICAÇÃO DE EMAIL")

        if not hasattr(self, "email_token"):
            print_error("Token de email não disponível. Execute test_registration_flow primeiro.")
            return False

        # 2.1 Verificação com token inválido
        print_info("Testando verificação com token inválido...")
        response = self.client.post(
            "/api/verify-email/",
            {
                "token": "token_invalido_12345",
            },
            content_type="application/json",
        )

        if response.status_code == 400:
            print_success("Rejeição de token inválido funcionando")
        else:
            print_error(f"Token inválido não foi rejeitado: {response.status_code}")

        # 2.2 Verificação com token válido
        print_info("Testando verificação com token válido...")
        response = self.client.post(
            "/api/verify-email/",
            {
                "token": self.email_token,
            },
            content_type="application/json",
        )

        if response.status_code == 200:
            data = response.json()
            print_success(f"Email verificado! Status: {data.get('status')}")
            self.payment_token = data.get("payment_token")
            self.successes.append("Email verificado")
        else:
            print_error(f"Verificação falhou: {response.status_code} - {response.content}")
            self.errors.append("Verificação de email falhou")
            return False

        # 2.3 Verificar status atualizado
        pending = PendingRegistration.objects.get(email=self.test_email)
        if pending.status == "email_verified":
            print_success("Status atualizado para 'email_verified'")
        else:
            print_error(f"Status incorreto: {pending.status}")

        return True

    def test_payment_flow(self):
        """Testa o fluxo de pagamento"""
        print_header("3. TESTE DE PAGAMENTO")

        if not hasattr(self, "payment_token"):
            print_error(
                "Token de pagamento não disponível. Execute test_email_verification primeiro."
            )
            return False

        # 3.1 Pagamento com cartão inválido (começa com 0000)
        print_info("Testando pagamento com cartão inválido...")
        response = self.client.post(
            "/api/process-payment/",
            {
                "payment_token": self.payment_token,
                "card_number": "0000111122223333",
                "card_holder": "TESTE INVALIDO",
                "card_expiry": "12/25",
                "card_cvv": "123",
            },
            content_type="application/json",
        )

        if response.status_code == 400:
            print_success("Cartão inválido rejeitado corretamente")
        else:
            print_warning(f"Cartão inválido não foi rejeitado: {response.status_code}")

        # 3.2 Pagamento com cartão válido
        print_info("Testando pagamento com cartão válido...")
        response = self.client.post(
            "/api/process-payment/",
            {
                "payment_token": self.payment_token,
                "card_number": "4111111111111111",
                "card_holder": "USUARIO TESTE",
                "card_expiry": "12/25",
                "card_cvv": "123",
            },
            content_type="application/json",
        )

        if response.status_code == 201:
            data = response.json()
            print_success(f"Pagamento aprovado! Usuário: {data.get('username')}")
            self.successes.append("Pagamento processado")
        else:
            print_error(f"Pagamento falhou: {response.status_code} - {response.content}")
            self.errors.append("Pagamento falhou")
            return False

        # 3.3 Verificar se User e Musician foram criados
        user = User.objects.filter(username=self.test_username).first()
        if user:
            print_success(f"Usuário criado: {user.username} ({user.email})")

            # Verificar músico
            if hasattr(user, "musician_profile"):
                musician = user.musician_profile
                print_success(f"Perfil de músico criado: {musician.instrument}")
            else:
                print_error("Perfil de músico não criado")
                self.errors.append("Perfil de músico não criado")
        else:
            print_error("Usuário não foi criado")
            self.errors.append("Usuário não criado")
            return False

        # 3.4 Verificar Organization e Membership
        org = Organization.objects.filter(owner=user).first()
        if org:
            print_success(f"Organização criada: {org.name}")

            membership = Membership.objects.filter(user=user, organization=org).first()
            if membership:
                print_success(f"Membership criado: {membership.role}")
            else:
                print_error("Membership não criado")
        else:
            print_error("Organização não criada")

        return True

    def test_login(self):
        """Testa login do usuário criado"""
        print_header("4. TESTE DE LOGIN")

        # 4.1 Login com credenciais erradas
        print_info("Testando login com credenciais erradas...")
        response = self.client.post(
            "/api/token/",
            {
                "username": self.test_username,
                "password": "senha_errada",
            },
            content_type="application/json",
        )

        if response.status_code == 401:
            print_success("Credenciais erradas rejeitadas")
        else:
            print_warning(f"Resposta inesperada para credenciais erradas: {response.status_code}")

        # 4.2 Login com credenciais corretas
        print_info("Testando login com credenciais corretas...")
        response = self.client.post(
            "/api/token/",
            {
                "username": self.test_username,
                "password": self.test_password,
            },
            content_type="application/json",
        )

        if response.status_code == 200:
            print_success("Login realizado com sucesso!")
            self.successes.append("Login funcionando")
            # Cookies JWT devem estar setados
        else:
            print_error(f"Login falhou: {response.status_code} - {response.content}")
            self.errors.append("Login falhou")
            return False

        return True

    def test_authenticated_endpoints(self):
        """Testa endpoints autenticados"""
        print_header("5. TESTE DE ENDPOINTS AUTENTICADOS")

        # Primeiro faz login para obter cookies
        self.client.post(
            "/api/token/",
            {
                "username": self.test_username,
                "password": self.test_password,
            },
            content_type="application/json",
        )

        # 5.1 GET /api/musicians/me/
        print_info("Testando GET /api/musicians/me/...")
        response = self.client.get("/api/musicians/me/")

        if response.status_code == 200:
            data = response.json()
            print_success(f"Perfil obtido: {data.get('first_name')} {data.get('last_name')}")
        else:
            print_error(f"Falha ao obter perfil: {response.status_code}")
            self.errors.append("GET /api/musicians/me/ falhou")

        # 5.2 GET /api/events/
        print_info("Testando GET /api/events/...")
        response = self.client.get("/api/events/")

        if response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else data.get("count", 0)
            print_success(f"Lista de eventos obtida: {count} eventos")
        else:
            print_error(f"Falha ao listar eventos: {response.status_code}")
            self.errors.append("GET /api/events/ falhou")

        # 5.3 GET /api/musicians/
        print_info("Testando GET /api/musicians/...")
        response = self.client.get("/api/musicians/")

        if response.status_code == 200:
            print_success("Lista de músicos obtida")
        else:
            print_error(f"Falha ao listar músicos: {response.status_code}")

        # 5.4 GET /api/connections/
        print_info("Testando GET /api/connections/...")
        response = self.client.get("/api/connections/")

        if response.status_code == 200:
            print_success("Lista de conexões obtida")
        else:
            print_error(f"Falha ao listar conexões: {response.status_code}")

        # 5.5 GET /api/marketplace/gigs/
        print_info("Testando GET /api/marketplace/gigs/...")
        response = self.client.get("/api/marketplace/gigs/")

        if response.status_code == 200:
            print_success("Marketplace obtido")
        else:
            print_error(f"Falha ao obter marketplace: {response.status_code}")

        return True

    def test_event_creation(self):
        """Testa criação de evento"""
        print_header("6. TESTE DE CRIAÇÃO DE EVENTO")

        # Login
        self.client.post(
            "/api/token/",
            {
                "username": self.test_username,
                "password": self.test_password,
            },
            content_type="application/json",
        )

        # Criar evento
        future_date = (date.today() + timedelta(days=7)).isoformat()

        print_info(f"Criando evento para {future_date}...")
        response = self.client.post(
            "/api/events/",
            {
                "title": "Evento de Teste",
                "description": "Evento criado pelo script de teste",
                "event_date": future_date,
                "start_time": "20:00",
                "end_time": "23:00",
                "location": "Local de Teste",
                "fee": "500.00",
            },
            content_type="application/json",
        )

        if response.status_code == 201:
            data = response.json()
            print_success(f"Evento criado: {data.get('title')} (ID: {data.get('id')})")
            self.test_event_id = data.get("id")
            self.successes.append("Criação de evento funcionando")
        else:
            print_error(f"Falha ao criar evento: {response.status_code} - {response.content}")
            self.errors.append("Criação de evento falhou")

        return True

    def print_summary(self):
        """Imprime resumo dos testes"""
        print_header("RESUMO DOS TESTES")

        print(f"{BOLD}Sucessos ({len(self.successes)}):{RESET}")
        for s in self.successes:
            print_success(s)

        if self.errors:
            print(f"\n{BOLD}Erros ({len(self.errors)}):{RESET}")
            for e in self.errors:
                print_error(e)

        print()
        if not self.errors:
            print(f"{BOLD}{GREEN}{'='*60}{RESET}")
            print(
                f"{BOLD}{GREEN}  TODOS OS TESTES PASSARAM! APLICAÇÃO PRONTA PARA TESTES REAIS{RESET}"
            )
            print(f"{BOLD}{GREEN}{'='*60}{RESET}")
            return True
        else:
            print(f"{BOLD}{RED}{'='*60}{RESET}")
            print(f"{BOLD}{RED}  ALGUNS TESTES FALHARAM. VERIFIQUE OS ERROS ACIMA.{RESET}")
            print(f"{BOLD}{RED}{'='*60}{RESET}")
            return False


def main():
    print(f"\n{BOLD}{BLUE}TESTE COMPLETO DO FLUXO DA APLICAÇÃO{RESET}")
    print(f"{BLUE}Agenda Músicos - Validação para Testes Reais{RESET}\n")

    tester = FlowTester()

    try:
        # Limpa dados de teste anteriores
        tester.cleanup()

        # Executa testes em sequência
        if not tester.test_registration_flow():
            print_error("Fluxo de registro falhou. Abortando testes.")
            return 1

        if not tester.test_email_verification():
            print_error("Verificação de email falhou. Abortando testes.")
            return 1

        if not tester.test_payment_flow():
            print_error("Fluxo de pagamento falhou. Abortando testes.")
            return 1

        if not tester.test_login():
            print_error("Login falhou. Abortando testes.")
            return 1

        tester.test_authenticated_endpoints()
        tester.test_event_creation()

        # Resumo
        success = tester.print_summary()

        return 0 if success else 1

    except Exception as e:
        print_error(f"Erro inesperado: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

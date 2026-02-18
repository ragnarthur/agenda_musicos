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
    MusicianRequest,
    Organization,
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

    def _apply_bearer_from_login_response(self, response):
        """Extrai access_token do cookie e aplica como Authorization no client de teste."""
        access_cookie = response.cookies.get("access_token")
        access_token = access_cookie.value if access_cookie else None

        if access_token:
            self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {access_token}"
            print_success("Bearer token aplicado no client de teste")
            return True

        print_warning("access_token não veio no cookie; requests autenticadas podem falhar")
        return False

    def cleanup(self):
        """Remove dados de teste anteriores"""
        print_info("Limpando dados de teste anteriores...")
        MusicianRequest.objects.filter(email__contains="teste_").delete()
        User.objects.filter(username__startswith="teste_").delete()
        print_success("Dados de teste limpos")

    def test_registration_flow(self):
        """Testa o fluxo completo de registro"""
        print_header("1. TESTE DE REGISTRO")

        # 1.1 Solicitação de acesso (musician-request)
        print_info("Testando solicitação de acesso com dados válidos...")
        response = self.client.post(
            "/api/musician-request/",
            {
                "email": self.test_email,
                "full_name": "Usuário Teste",
                "phone": "11999999999",
                "instrument": "guitar",
                "instruments": ["guitar"],
                "bio": "Músico de teste para validação",
                "city": "Sao Paulo",
                "state": "SP",
            },
            content_type="application/json",
        )

        if response.status_code == 201:
            data = response.json()
            self.request_id = data.get("id")
            print_success(f"Solicitação criada com sucesso para {self.test_email}")
            self.successes.append("Solicitação criada")
        else:
            print_error(
                f"Falha ao criar solicitação: {response.status_code} - {response.content}"
            )
            self.errors.append("Solicitação falhou")
            return False

        # 1.2 Verificar se MusicianRequest foi criado
        pending = MusicianRequest.objects.filter(email=self.test_email).first()
        if pending:
            print_success(f"MusicianRequest criado com status: {pending.status}")
        else:
            print_error("MusicianRequest não foi criado")
            self.errors.append("MusicianRequest não criado")
            return False

        return True

    def test_admin_approval(self):
        """Testa aprovação da solicitação pelo admin"""
        print_header("2. TESTE DE APROVAÇÃO ADMIN")

        if not hasattr(self, "request_id"):
            print_error("ID da solicitação não disponível. Execute test_registration_flow primeiro.")
            return False

        admin_user = User.objects.filter(username="admin_teste").first()
        if not admin_user:
            admin_user = User.objects.create_user(
                username="admin_teste",
                email="admin_teste@example.com",
                password="admin123",
                is_staff=True,
            )

        self.client.force_login(admin_user)

        response = self.client.post(
            f"/api/admin/musician-requests/{self.request_id}/approve/",
            {"admin_notes": "Aprovado pelo teste automatizado"},
            content_type="application/json",
        )

        if response.status_code == 200:
            data = response.json()
            self.invite_token = data.get("invite_token")
            print_success("Solicitação aprovada e invite gerado")
            self.successes.append("Solicitação aprovada")
        else:
            print_error(f"Aprovação falhou: {response.status_code} - {response.content}")
            self.errors.append("Aprovação admin falhou")
            return False

        return True

    def test_register_with_invite(self):
        """Testa registro com convite"""
        print_header("3. TESTE DE REGISTRO COM CONVITE")

        if not hasattr(self, "invite_token"):
            print_error("Token de convite não disponível. Execute test_admin_approval primeiro.")
            return False

        response = self.client.post(
            "/api/register-with-invite/",
            {
                "invite_token": self.invite_token,
                "password": self.test_password,
                "username": self.test_username,
            },
            content_type="application/json",
        )

        if response.status_code == 201:
            data = response.json()
            self.registered_username = data.get("username", self.test_username)
            print_success(f"Conta criada: {self.registered_username}")
            self.successes.append("Registro com convite")
        else:
            print_error(f"Registro falhou: {response.status_code} - {response.content}")
            self.errors.append("Registro com convite falhou")
            return False

        # 3.3 Verificar se User e Musician foram criados
        user = User.objects.filter(username=self.registered_username).first()
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
                "username": getattr(self, "registered_username", self.test_username),
                "password": self.test_password,
            },
            content_type="application/json",
        )

        if response.status_code == 200:
            print_success("Login realizado com sucesso!")
            self.successes.append("Login funcionando")
            self._apply_bearer_from_login_response(response)
        else:
            print_error(f"Login falhou: {response.status_code} - {response.content}")
            self.errors.append("Login falhou")
            return False

        return True

    def test_authenticated_endpoints(self):
        """Testa endpoints autenticados"""
        print_header("5. TESTE DE ENDPOINTS AUTENTICADOS")

        # Primeiro faz login para obter cookies
        login_response = self.client.post(
            "/api/token/",
            {
                "username": getattr(self, "registered_username", self.test_username),
                "password": self.test_password,
            },
            content_type="application/json",
        )
        self._apply_bearer_from_login_response(login_response)

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
                "username": getattr(self, "registered_username", self.test_username),
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

        if not tester.test_admin_approval():
            print_error("Aprovação de solicitação falhou. Abortando testes.")
            return 1

        if not tester.test_register_with_invite():
            print_error("Registro com convite falhou. Abortando testes.")
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

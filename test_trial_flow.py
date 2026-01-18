#!/usr/bin/env python
"""
Teste do fluxo de trial de 7 dias.
"""
import os
import sys
import django
import requests
import random
import string

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ.setdefault('DJANGO_ENV', 'development')
django.setup()

from agenda.models import PendingRegistration, Musician, User

BASE_URL = 'http://localhost:8000/api'

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def test_trial_flow():
    print("\n=== TESTE DO FLUXO DE TRIAL ===\n")

    # Gera dados únicos
    suffix = random_string()
    email = f"trial_test_{suffix}@teste.com"
    username = f"trial_{suffix}"

    # 1. Registro inicial
    print("1. Registrando novo usuário...")
    response = requests.post(f'{BASE_URL}/register/', json={
        'email': email,
        'username': username,
        'password': 'Test123!@#',
        'first_name': 'Trial',
        'last_name': 'Test',
        'instrument': 'guitar',
        'bio': 'Musico de teste para validacao.',
        'city': 'Sao Paulo',
        'state': 'SP',
    })

    if response.status_code != 201:
        print(f"   ERRO: {response.status_code} - {response.text}")
        return False

    print(f"   OK - Usuário registrado: {email}")

    # 2. Obtém token de email do banco
    pending = PendingRegistration.objects.get(email=email)
    email_token = pending.email_token
    print(f"   Token de email: {email_token[:20]}...")

    # 3. Verifica email
    print("\n2. Verificando email...")
    response = requests.post(f'{BASE_URL}/verify-email/', json={
        'token': email_token
    })

    if response.status_code != 200:
        print(f"   ERRO: {response.status_code} - {response.text}")
        return False

    data = response.json()
    payment_token = data.get('payment_token')
    print(f"   OK - Email verificado")
    print(f"   Payment token: {payment_token[:20]}...")

    # 4. Inicia trial (em vez de pagamento)
    print("\n3. Iniciando período de teste...")
    response = requests.post(f'{BASE_URL}/start-trial/', json={
        'payment_token': payment_token
    })

    if response.status_code != 201:
        print(f"   ERRO: {response.status_code} - {response.text}")
        return False

    data = response.json()
    print(f"   OK - Trial iniciado!")
    print(f"   Username: {data['username']}")
    print(f"   Email: {data['email']}")
    print(f"   Dias de trial: {data['trial_days']}")

    # 5. Verifica status do usuário criado
    print("\n4. Verificando usuário criado...")
    user = User.objects.get(username=username)
    musician = user.musician_profile

    print(f"   Usuário ID: {user.id}")
    print(f"   Músico ID: {musician.id}")
    print(f"   Status: {musician.subscription_status}")
    print(f"   Trial ativo: {musician.is_on_trial()}")
    print(f"   Dias restantes: {musician.trial_days_remaining()}")
    print(f"   Trial termina em: {musician.trial_ends_at}")

    # 6. Testa login
    print("\n5. Testando login...")
    session = requests.Session()
    response = session.post(f'{BASE_URL}/token/', json={
        'username': username,
        'password': 'Test123!@#'
    })

    if response.status_code != 200:
        print(f"   ERRO: {response.status_code} - {response.text}")
        return False

    print("   OK - Login realizado")

    # 7. Verifica endpoint /me/ retorna subscription_info
    print("\n6. Verificando dados de assinatura no endpoint /me/...")
    response = session.get(f'{BASE_URL}/musicians/me/')

    if response.status_code != 200:
        print(f"   ERRO: {response.status_code} - {response.text}")
        return False

    data = response.json()
    subscription_info = data.get('subscription_info')

    if not subscription_info:
        print("   ERRO: subscription_info não retornado!")
        return False

    print(f"   OK - subscription_info retornado:")
    print(f"      status: {subscription_info['status']}")
    print(f"      is_trial: {subscription_info['is_trial']}")
    print(f"      trial_days_remaining: {subscription_info['trial_days_remaining']}")
    print(f"      has_active_subscription: {subscription_info['has_active_subscription']}")

    # 8. Cleanup
    print("\n7. Limpando dados de teste...")
    try:
        user.delete()  # Cascade deleta musician também
        print("   OK - Usuário removido")
    except:
        print("   AVISO: Erro ao limpar dados")

    print("\n" + "=" * 40)
    print("RESULTADO: SUCESSO!")
    print("=" * 40)

    return True

if __name__ == '__main__':
    success = test_trial_flow()
    sys.exit(0 if success else 1)

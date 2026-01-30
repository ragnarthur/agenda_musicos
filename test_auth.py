#!/usr/bin/env python
"""
Script para testar autenticação JWT
"""

import os

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from agenda.models import Musician


def test_user_authentication(username, password):
    """Testa autenticação de um usuário"""
    print(f'\n{"="*60}')
    print(f"Testando autenticação: {username}")
    print(f'{"="*60}')

    # Autenticar usuário
    user = authenticate(username=username, password=password)

    if user is None:
        print(f"❌ ERRO: Falha na autenticação de {username}")
        return False

    print(f"✓ Autenticação bem-sucedida!")
    print(f"  Nome completo: {user.get_full_name()}")
    print(f"  Email: {user.email}")

    # Verificar perfil de músico
    try:
        musician = user.musician_profile
        role_icon = "👑" if musician.is_leader() else "♪"
        print(f"  {role_icon} Instrumento: {musician.get_instrument_label()}")
        print(f"  Papel: {musician.get_role_display()}")
    except Musician.DoesNotExist:
        print(f"  ⚠️  Sem perfil de músico")
        return False

    # Gerar tokens JWT
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    print(f"\n  Tokens JWT gerados:")
    print(f"  Access Token:  {access_token[:50]}...")
    print(f"  Refresh Token: {refresh_token[:50]}...")

    return True


def main():
    """Testa autenticação de todos os músicos"""
    print("\n" + "=" * 60)
    print("TESTE DE AUTENTICAÇÃO JWT - AGENDA DE MÚSICOS")
    print("=" * 60)

    users = [("sara", "sara2026@"), ("arthur", "arthur2026@"), ("roberto", "roberto2026@")]

    success_count = 0
    for username, password in users:
        if test_user_authentication(username, password):
            success_count += 1

    print(f'\n{"="*60}')
    print(f"RESULTADO: {success_count}/{len(users)} usuários autenticados com sucesso")
    print(f'{"="*60}\n')

    if success_count == len(users):
        print("✅ Todos os usuários foram autenticados corretamente!")
        print("   O backend está pronto para ser usado pelo frontend.")
        print(f"\n   Para testar via API HTTP, rode:")
        print(f"   python manage.py runserver")
        print(f"\n   E faça uma requisição POST para:")
        print(f"   http://localhost:8000/api/token/")
        print(f'   Com body: {{"username": "sara", "password": "sara2026@"}}')
    else:
        print("❌ Alguns usuários não puderam ser autenticados.")

    print()


if __name__ == "__main__":
    main()

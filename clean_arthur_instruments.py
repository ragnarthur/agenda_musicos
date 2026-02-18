#!/usr/bin/env python3
"""
Script para corrigir instrumentos duplicados do músico Arthur Araújo
Executado via: cat script.py | docker compose exec -f docker-compose.prod.yml backend python -
"""

import os
import sys

# Configuração Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Carregar variáveis de ambiente
env_vars = {
    "SECRET_KEY": "7wrr3)jqc=73fzi77g@qsv#azk75!bhz+js7a-mzaf_e)8g14",
    "ALLOWED_HOSTS": "localhost,127.0.0.1,181.215.134.53,gigflowagenda.com.br,www.gigflowagenda.com.br,api.gigflowagenda.com.br",
    "CORS_ALLOWED_ORIGINS": "https://gigflowagenda.com.br,https://www.gigflowagenda.com.br",
    "CORS_ALLOW_CREDENTIALS": "False",
    "CSRF_TRUSTED_ORIGINS": "https://gigflowagenda.com.br,https://www.gigflowagenda.com.br,https://api.gigflowagenda.com.br",
    "POSTGRES_DB": "agenda",
    "POSTGRES_USER": "agenda",
    "POSTGRES_PASSWORD": "Antonella-Dogunk123@",
    "DATABASE_URL": "postgresql://agenda:Antonella-Dogunk123@db:5432/agenda?sslmode=disable",
    "DB_SSL_REQUIRE": "0",
    "DEFAULT_FROM_EMAIL": "Agenda Musicos <noreply@localhost>",
    "DEBUG": "False",
}

for key, value in env_vars.items():
    os.environ[key] = value

import django

django.setup()

from agenda.models import Musician


def clean_arthur_instruments():
    print("\n" + "=" * 60)
    print("🔍 Corrigindo instrumentos duplicados de Arthur Araújo")
    print("=" * 60 + "\n")

    try:
        # Busca o músico Arthur
        arthur = Musician.objects.get(user__username="arthur")

        print(f"✓ Músico encontrado:")
        print(f"  ID: {arthur.id}")
        print(f"  Nome: {arthur.user.get_full_name()}")
        print(f"  Username: {arthur.user.username}")
        print(f"  Instrumento principal: {arthur.instrument}")
        print()

        if not arthur.instruments:
            print("❌ Lista de instrumentos vazia. Nada a fazer.")
            return

        # Lista original
        original_count = len(arthur.instruments)
        original_list = arthur.instruments.copy()

        print(f"📋 Lista original ({original_count} instrumentos):")
        for i, inst in enumerate(original_list, 1):
            print(f"  {i}. {inst}")

        # Remove duplicados usando dict.fromkeys
        cleaned_instruments = list(dict.fromkeys(original_list))

        # Garante que o instrumento principal é o primeiro
        if arthur.instrument:
            if arthur.instrument not in cleaned_instruments:
                cleaned_instruments.insert(0, arthur.instrument)
            else:
                # Já está na lista, remove duplicados mantendo-o como primeiro
                cleaned_instruments = [arthur.instrument] + [
                    inst for inst in cleaned_instruments if inst != arthur.instrument
                ]

        print(f"\n✅ Lista corrigida ({len(cleaned_instruments)} instrumentos):")
        for i, inst in enumerate(cleaned_instruments, 1):
            print(f"  {i}. {inst}")

        # Verifica se houve mudança
        has_duplicates = len(original_list) != len(dict.fromkeys(original_list))
        if not has_duplicates:
            print("\n✅ Nenhum duplicado encontrado. Instrumentos já estão corretos!")
            return

        # Mostra o que será alterado
        print(f"\n⚠️  Alterações a serem aplicadas:")
        print(f"   Instrumentos removidos: {original_count - len(cleaned_instruments)}")
        print(f"   Novo total: {len(cleaned_instruments)}")
        print(f"   Instrumento principal mantido: {arthur.instrument}")
        print()

        # Aplica as alterações
        arthur.instruments = cleaned_instruments
        arthur.save(update_fields=["instruments"])

        print("=" * 60)
        print("✅ Alterações aplicadas com sucesso!")
        print("=" * 60)
        print(f"   Instrumentos: {original_count} → {len(cleaned_instruments)}")
        print(f"   Instrumento principal: {arthur.instrument}")
        print()

    except Musician.DoesNotExist:
        print("=" * 60)
        print("❌ ERRO: Músico 'arthur' não encontrado no banco de dados")
        print("=" * 60)
    except Exception as e:
        print("=" * 60)
        print(f"❌ ERRO: {e}")
        print("=" * 60)
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    clean_arthur_instruments()

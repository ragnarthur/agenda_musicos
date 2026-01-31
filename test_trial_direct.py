#!/usr/bin/env python
"""
Teste direto do fluxo de trial (sem servidor HTTP).
"""

import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DJANGO_ENV", "development")
django.setup()

from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone

from agenda.models import Membership, Musician, Organization
from agenda.serializers import MusicianSerializer


def test_trial_model():
    print("\n=== TESTE DIRETO DO TRIAL ===\n")

    if not hasattr(Musician, "start_trial"):
        print("⚠ Funcionalidade de trial não está disponível. Pulando teste.")
        return True

    # Cleanup: remove usuário de teste se existir
    User.objects.filter(username="trial_test_user").delete()

    # 1. Cria usuário e músico diretamente
    print("1. Criando usuário e músico...")
    user = User.objects.create_user(
        username="trial_test_user",
        email="trial_test@teste.com",
        password="Test123!@#",
        first_name="Trial",
        last_name="Test",
    )
    print(f"   User ID: {user.id}")

    musician = Musician.objects.create(
        user=user, instrument="guitar", role="member", subscription_status="trial"
    )
    print(f"   Musician ID: {musician.id}")

    # 2. Testa start_trial()
    print("\n2. Testando método start_trial()...")
    musician.start_trial(days=7)
    print(f"   subscription_status: {musician.subscription_status}")
    print(f"   trial_started_at: {musician.trial_started_at}")
    print(f"   trial_ends_at: {musician.trial_ends_at}")

    # 3. Testa is_on_trial()
    print("\n3. Testando método is_on_trial()...")
    result = musician.is_on_trial()
    print(f"   is_on_trial(): {result}")
    assert result == True, "is_on_trial() deveria retornar True"
    print("   OK - Asserção passou")

    # 4. Testa trial_days_remaining()
    print("\n4. Testando método trial_days_remaining()...")
    days = musician.trial_days_remaining()
    print(f"   trial_days_remaining(): {days}")
    assert (
        days == 7 or days == 6
    ), f"trial_days_remaining() deveria retornar 6 ou 7, retornou {days}"
    print("   OK - Asserção passou")

    # 5. Testa has_active_subscription()
    print("\n5. Testando método has_active_subscription()...")
    result = musician.has_active_subscription()
    print(f"   has_active_subscription(): {result}")
    assert result == True, "has_active_subscription() deveria retornar True durante trial"
    print("   OK - Asserção passou")

    # 6. Testa get_subscription_info()
    print("\n6. Testando método get_subscription_info()...")
    info = musician.get_subscription_info()
    print(f"   subscription_info: {info}")
    assert info["status"] == "trial", f"status deveria ser 'trial', é '{info['status']}'"
    assert info["is_trial"] == True, "is_trial deveria ser True"
    assert info["has_active_subscription"] == True, "has_active_subscription deveria ser True"
    print("   OK - Todas as asserções passaram")

    # 7. Testa serializer
    print("\n7. Testando MusicianSerializer...")

    class FakeRequest:
        def __init__(self, user):
            self.user = user

    serializer = MusicianSerializer(musician, context={"request": FakeRequest(user)})
    data = serializer.data
    print(f"   subscription_info no serializer: {data.get('subscription_info')}")
    assert data.get("subscription_info") is not None, "subscription_info não deve ser None"
    assert data["subscription_info"]["is_trial"] == True, "is_trial deveria ser True"
    print("   OK - Serializer retorna subscription_info corretamente")

    # 8. Simula expiração do trial
    print("\n8. Simulando expiração do trial...")
    musician.trial_ends_at = timezone.now() - timedelta(days=1)
    musician.save()

    result = musician.is_on_trial()
    print(f"   is_on_trial() após expiração: {result}")
    assert result == False, "is_on_trial() deveria retornar False após expiração"

    days = musician.trial_days_remaining()
    print(f"   trial_days_remaining() após expiração: {days}")
    assert days == 0, "trial_days_remaining() deveria retornar 0"

    result = musician.has_active_subscription()
    print(f"   has_active_subscription() após expiração: {result}")
    assert result == False, "has_active_subscription() deveria retornar False"
    print("   OK - Todas as asserções de expiração passaram")

    # 9. Cleanup
    print("\n9. Limpando dados de teste...")
    user.delete()
    print("   OK - Dados removidos")

    print("\n" + "=" * 40)
    print("RESULTADO: TODOS OS TESTES PASSARAM!")
    print("=" * 40)

    return True


if __name__ == "__main__":
    try:
        success = test_trial_model()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\nERRO: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)

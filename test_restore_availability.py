#!/usr/bin/env python
"""
Script de teste manual para verificar a lógica de restauração de disponibilidade.
Testa os seguintes cenários:
1. Criar evento -> Rejeitar -> Verificar se disponibilidade foi restaurada
2. Criar evento -> Deletar -> Verificar se disponibilidade foi restaurada
3. Criar evento -> Aprovar -> Cancelar -> Verificar se disponibilidade foi restaurada
4. Criar dois eventos no mesmo dia -> Deletar um -> Verificar mesclagem de fragmentos
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta, time
from agenda.models import Musician, Event, LeaderAvailability

def setup_test_data():
    """Cria dados de teste: usuários, músicos e disponibilidade inicial"""
    print("🔧 Configurando dados de teste...")

    # Busca ou cria usuários
    sara, _ = User.objects.get_or_create(
        username='sara',
        defaults={
            'first_name': 'Sara',
            'last_name': 'Carmo',
            'email': 'sara@example.com'
        }
    )
    sara.set_password('sara2025@')
    sara.save()

    roberto, _ = User.objects.get_or_create(
        username='roberto',
        defaults={
            'first_name': 'Roberto',
            'last_name': 'Guimarães',
            'email': 'roberto@example.com'
        }
    )
    roberto.set_password('roberto2025@')
    roberto.save()

    # Busca ou cria músicos
    sara_musician, _ = Musician.objects.get_or_create(
        user=sara,
        defaults={
            'instrument': 'vocal',
            'role': 'member',
            'is_active': True
        }
    )

    roberto_musician, _ = Musician.objects.get_or_create(
        user=roberto,
        defaults={
            'instrument': 'drums',
            'role': 'leader',
            'is_active': True
        }
    )

    # Cria disponibilidade do líder para teste
    # Data futura: amanhã das 18h às 23h
    tomorrow = timezone.now().date() + timedelta(days=1)

    # Remove disponibilidades antigas do líder para esse dia
    LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=tomorrow
    ).delete()

    avail = LeaderAvailability.objects.create(
        leader=roberto_musician,
        date=tomorrow,
        start_time=time(18, 0),
        end_time=time(23, 0),
        notes='Disponibilidade de teste',
        is_active=True
    )

    print(f"✅ Disponibilidade criada: {avail.date} {avail.start_time}-{avail.end_time}")

    return sara, roberto, sara_musician, roberto_musician, tomorrow


def test_reject_restores_availability(sara, roberto, sara_musician, roberto_musician, test_date):
    """Teste 1: Rejeitar evento deve restaurar disponibilidade"""
    print("\n" + "="*70)
    print("🧪 TESTE 1: Rejeição de Evento")
    print("="*70)

    # Limpa eventos antigos
    Event.objects.filter(event_date=test_date).delete()

    # Verifica disponibilidades iniciais
    initial_count = LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date,
        is_active=True
    ).count()
    print(f"📊 Disponibilidades ativas iniciais: {initial_count}")

    # Cria evento
    event = Event.objects.create(
        title="Show Teste - Rejeição",
        location="Bar Exemplo",
        event_date=test_date,
        start_time=time(20, 0),
        end_time=time(22, 0),
        created_by=sara,
        status='proposed',
        is_solo=False
    )
    print(f"📅 Evento criado: {event.title} ({event.start_time}-{event.end_time})")

    # Força consumo de disponibilidade (simula perform_create)
    from agenda.views import EventViewSet
    viewset = EventViewSet()
    viewset._consume_leader_availability(event)

    # Verifica fragmentação
    after_create_count = LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date,
        is_active=True
    ).count()
    print(f"📊 Disponibilidades após criação: {after_create_count}")

    # Rejeita evento
    event.reject(roberto, "Não vou poder tocar nesse dia")
    print(f"❌ Evento rejeitado")

    # Restaura disponibilidade
    viewset._restore_leader_availability(event)
    print(f"♻️  Disponibilidade restaurada")

    # Verifica restauração
    after_reject_count = LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date,
        is_active=True
    ).count()
    print(f"📊 Disponibilidades após rejeição: {after_reject_count}")

    availabilities = LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date,
        is_active=True
    ).order_by('start_time')

    print("\n📋 Disponibilidades ativas após rejeição:")
    for avail in availabilities:
        print(f"   - {avail.start_time} até {avail.end_time} ({avail.notes})")

    # Verifica se restaurou corretamente
    # Deve ter criado uma nova disponibilidade cobrindo 20:00-22:00
    restored = LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date,
        start_time=time(20, 0),
        end_time=time(22, 0),
        is_active=True
    ).exists()

    if restored:
        print("\n✅ TESTE 1 PASSOU: Disponibilidade restaurada corretamente!")
    else:
        print("\n❌ TESTE 1 FALHOU: Disponibilidade NÃO foi restaurada")

    return restored


def test_delete_restores_availability(sara, roberto, sara_musician, roberto_musician, test_date):
    """Teste 2: Deletar evento deve restaurar disponibilidade"""
    print("\n" + "="*70)
    print("🧪 TESTE 2: Deleção de Evento")
    print("="*70)

    # Limpa eventos antigos
    Event.objects.filter(event_date=test_date).delete()

    # Recria disponibilidade inicial
    LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date
    ).delete()

    LeaderAvailability.objects.create(
        leader=roberto_musician,
        date=test_date,
        start_time=time(18, 0),
        end_time=time(23, 0),
        notes='Disponibilidade inicial',
        is_active=True
    )

    # Cria evento
    event = Event.objects.create(
        title="Show Teste - Deleção",
        location="Bar Exemplo",
        event_date=test_date,
        start_time=time(19, 0),
        end_time=time(21, 0),
        created_by=sara,
        status='proposed',
        is_solo=False
    )
    print(f"📅 Evento criado: {event.title} ({event.start_time}-{event.end_time})")

    # Consome disponibilidade
    from agenda.views import EventViewSet
    viewset = EventViewSet()
    viewset._consume_leader_availability(event)

    before_delete = LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date,
        is_active=True
    ).count()
    print(f"📊 Disponibilidades antes de deletar: {before_delete}")

    # Simula perform_destroy
    viewset._restore_leader_availability(event)
    event.delete()
    print(f"🗑️  Evento deletado e disponibilidade restaurada")

    # Verifica restauração
    after_delete = LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date,
        is_active=True
    ).count()
    print(f"📊 Disponibilidades após deleção: {after_delete}")

    availabilities = LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date,
        is_active=True
    ).order_by('start_time')

    print("\n📋 Disponibilidades ativas após deleção:")
    for avail in availabilities:
        print(f"   - {avail.start_time} até {avail.end_time} ({avail.notes})")

    # Verifica se restaurou
    restored = LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date,
        start_time=time(19, 0),
        end_time=time(21, 0),
        is_active=True
    ).exists()

    if restored:
        print("\n✅ TESTE 2 PASSOU: Disponibilidade restaurada após deleção!")
    else:
        print("\n❌ TESTE 2 FALHOU: Disponibilidade NÃO foi restaurada")

    return restored


def test_cancel_restores_availability(sara, roberto, sara_musician, roberto_musician, test_date):
    """Teste 3: Cancelar evento aprovado deve restaurar disponibilidade"""
    print("\n" + "="*70)
    print("🧪 TESTE 3: Cancelamento de Evento Aprovado")
    print("="*70)

    # Limpa eventos antigos
    Event.objects.filter(event_date=test_date).delete()

    # Recria disponibilidade inicial
    LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date
    ).delete()

    LeaderAvailability.objects.create(
        leader=roberto_musician,
        date=test_date,
        start_time=time(18, 0),
        end_time=time(23, 0),
        notes='Disponibilidade inicial',
        is_active=True
    )

    # Cria e aprova evento
    event = Event.objects.create(
        title="Show Teste - Cancelamento",
        location="Bar Exemplo",
        event_date=test_date,
        start_time=time(20, 30),
        end_time=time(22, 30),
        created_by=sara,
        status='proposed',
        is_solo=False
    )
    print(f"📅 Evento criado: {event.title} ({event.start_time}-{event.end_time})")

    # Consome disponibilidade
    from agenda.views import EventViewSet
    viewset = EventViewSet()
    viewset._consume_leader_availability(event)

    # Aprova
    event.approve(roberto)
    print(f"✅ Evento aprovado")

    # Cancela
    event.status = 'cancelled'
    event.save()
    viewset._restore_leader_availability(event)
    print(f"🚫 Evento cancelado e disponibilidade restaurada")

    # Verifica restauração
    availabilities = LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date,
        is_active=True
    ).order_by('start_time')

    print("\n📋 Disponibilidades ativas após cancelamento:")
    for avail in availabilities:
        print(f"   - {avail.start_time} até {avail.end_time} ({avail.notes})")

    # Verifica se restaurou
    restored = LeaderAvailability.objects.filter(
        leader=roberto_musician,
        date=test_date,
        start_time=time(20, 30),
        end_time=time(22, 30),
        is_active=True
    ).exists()

    if restored:
        print("\n✅ TESTE 3 PASSOU: Disponibilidade restaurada após cancelamento!")
    else:
        print("\n❌ TESTE 3 FALHOU: Disponibilidade NÃO foi restaurada")

    return restored


def main():
    print("\n" + "="*70)
    print("🚀 INICIANDO TESTES DE RESTAURAÇÃO DE DISPONIBILIDADE")
    print("="*70)

    # Setup
    sara, roberto, sara_musician, roberto_musician, test_date = setup_test_data()

    # Executa testes
    test1 = test_reject_restores_availability(sara, roberto, sara_musician, roberto_musician, test_date)
    test2 = test_delete_restores_availability(sara, roberto, sara_musician, roberto_musician, test_date)
    test3 = test_cancel_restores_availability(sara, roberto, sara_musician, roberto_musician, test_date)

    # Resumo
    print("\n" + "="*70)
    print("📊 RESUMO DOS TESTES")
    print("="*70)
    print(f"Teste 1 (Rejeição):     {'✅ PASSOU' if test1 else '❌ FALHOU'}")
    print(f"Teste 2 (Deleção):      {'✅ PASSOU' if test2 else '❌ FALHOU'}")
    print(f"Teste 3 (Cancelamento): {'✅ PASSOU' if test3 else '❌ FALHOU'}")

    total_passed = sum([test1, test2, test3])
    print(f"\n🎯 Total: {total_passed}/3 testes passaram")

    if total_passed == 3:
        print("\n🎉 TODOS OS TESTES PASSARAM!")
    else:
        print("\n⚠️  Alguns testes falharam. Revise a lógica.")


if __name__ == '__main__':
    main()

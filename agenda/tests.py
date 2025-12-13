# agenda/tests.py
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date, time, timedelta
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Musician, Event, Availability, LeaderAvailability, EventLog
from .views import EventViewSet


class MusicianModelTest(TestCase):
    """Testes do modelo Musician"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='sara',
            first_name='Sara',
            last_name='Silva',
            password='senha123'
        )
    
    def test_create_musician(self):
        """Testa criação de músico"""
        musician = Musician.objects.create(
            user=self.user,
            instrument='vocal',
            role='member'
        )
        self.assertEqual(musician.user.username, 'sara')
        self.assertEqual(musician.instrument, 'vocal')
        self.assertFalse(musician.is_leader())
    
    def test_leader_musician(self):
        """Testa músico líder"""
        musician = Musician.objects.create(
            user=self.user,
            instrument='drums',
            role='leader'
        )
        self.assertTrue(musician.is_leader())


class EventModelTest(TestCase):
    """Testes do modelo Event"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='arthur', password='senha123')
        self.leader_user = User.objects.create_user(username='roberto', password='senha123')
        
        self.musician = Musician.objects.create(
            user=self.user,
            instrument='guitar',
            role='member'
        )
        
        self.leader = Musician.objects.create(
            user=self.leader_user,
            instrument='drums',
            role='leader'
        )
    
    def test_create_event(self):
        """Testa criação de evento"""
        event = Event.objects.create(
            title='Show no Bar do João',
            location='Rua ABC, 123',
            event_date=date.today() + timedelta(days=7),
            start_time=time(20, 0),
            end_time=time(23, 0),
            created_by=self.user
        )
        self.assertEqual(event.title, 'Show no Bar do João')
        self.assertEqual(event.status, 'proposed')
        self.assertTrue(event.can_be_approved())
    
    def test_approve_event(self):
        """Testa aprovação de evento"""
        event = Event.objects.create(
            title='Show',
            location='Local',
            event_date=date.today() + timedelta(days=7),
            start_time=time(20, 0),
            end_time=time(23, 0),
            created_by=self.user,
            status='proposed'
        )
        
        result = event.approve(self.leader_user)
        self.assertTrue(result)
        self.assertEqual(event.status, 'approved')
        self.assertEqual(event.approved_by, self.leader_user)
    
    def test_reject_event(self):
        """Testa rejeição de evento"""
        event = Event.objects.create(
            title='Show',
            location='Local',
            event_date=date.today() + timedelta(days=7),
            start_time=time(20, 0),
            end_time=time(23, 0),
            created_by=self.user,
            status='proposed'
        )
        
        result = event.reject(self.leader_user, 'Conflito de agenda')
        self.assertTrue(result)
        self.assertEqual(event.status, 'rejected')
        self.assertEqual(event.rejection_reason, 'Conflito de agenda')

    def test_event_crossing_midnight_sets_end_next_day(self):
        """Garante que eventos que cruzam meia-noite ajustam end_datetime para o dia seguinte"""
        event = Event.objects.create(
            title='Virada',
            location='Praça',
            event_date=date(2025, 12, 24),
            start_time=time(23, 0),
            end_time=time(2, 0),  # cruza meia-noite para 25/12
            created_by=self.user,
            status='proposed'
        )

        self.assertEqual(event.start_datetime.date(), date(2025, 12, 24))
        self.assertEqual(event.end_datetime.date(), date(2025, 12, 25))
        self.assertLess(event.start_datetime, event.end_datetime)


class LeaderAvailabilityModelTest(TestCase):
    """Testes de disponibilidade do baterista cruzando meia-noite"""

    def setUp(self):
        user = User.objects.create_user(username='roberto', password='senha123')
        self.leader = Musician.objects.create(user=user, instrument='drums', role='leader')

    def test_leader_availability_crossing_midnight(self):
        """Disponibilidade que cruza a meia-noite deve levar end_datetime para o dia seguinte"""
        base_date = timezone.now().date() + timedelta(days=10)
        avail = LeaderAvailability(
            leader=self.leader,
            date=base_date,
            start_time=time(23, 0),
            end_time=time(1, 0),
        )
        avail.save()

        self.assertEqual(avail.start_datetime.date(), base_date)
        self.assertEqual(avail.end_datetime.date(), base_date + timedelta(days=1))
        self.assertLess(avail.start_datetime, avail.end_datetime)

    def test_conflict_detects_events_after_midnight(self):
        """Confere conflito com evento que acontece já no dia seguinte dentro da janela"""
        base_date = timezone.now().date() + timedelta(days=12)
        avail = LeaderAvailability.objects.create(
            leader=self.leader,
            date=base_date,
            start_time=time(23, 0),
            end_time=time(1, 0),
        )

        event = Event.objects.create(
            title='Show virada',
            location='Praça',
            event_date=base_date,  # start no mesmo dia, cruza para o próximo
            start_time=time(23, 30),
            end_time=time(0, 30),
            created_by=self.leader.user,
            status='proposed'
        )

        conflicts = avail.get_conflicting_events()
        self.assertIn(event, conflicts)


class EventAPITest(APITestCase):
    """Testes da API de eventos"""
    
    def setUp(self):
        # Criar usuários
        self.sara = User.objects.create_user(
            username='sara',
            first_name='Sara',
            password='senha123'
        )
        self.roberto = User.objects.create_user(
            username='roberto',
            first_name='Roberto',
            password='senha123'
        )
        
        # Criar perfis de músicos
        self.sara_musician = Musician.objects.create(
            user=self.sara,
            instrument='vocal',
            role='member'
        )
        self.roberto_musician = Musician.objects.create(
            user=self.roberto,
            instrument='drums',
            role='leader'
        )
        
        self.client = APIClient()
    
    def test_create_event_authenticated(self):
        """Testa criação de evento autenticado"""
        self.client.force_authenticate(user=self.sara)
        
        data = {
            'title': 'Show Teste',
            'location': 'Bar XYZ',
            'event_date': (date.today() + timedelta(days=10)).isoformat(),
            'start_time': '20:00:00',
            'end_time': '23:00:00',
        }
        
        response = self.client.post('/api/events/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Event.objects.count(), 1)
        
        event = Event.objects.first()
        self.assertEqual(event.status, 'proposed')
        self.assertEqual(event.created_by, self.sara)
        
        # Verifica se availabilities foram criadas
        self.assertEqual(event.availabilities.count(), 2)  # Sara e Roberto
    
    def test_approve_event_as_leader(self):
        """Testa aprovação de evento como líder"""
        # Criar evento
        event = Event.objects.create(
            title='Show',
            location='Local',
            event_date=date.today() + timedelta(days=7),
            start_time=time(20, 0),
            end_time=time(23, 0),
            created_by=self.sara,
            status='proposed'
        )
        
        # Autenticar como líder
        self.client.force_authenticate(user=self.roberto)
        
        response = self.client.post(f'/api/events/{event.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        event.refresh_from_db()
        self.assertEqual(event.status, 'approved')
        self.assertEqual(event.approved_by, self.roberto)
    
    def test_approve_event_as_member_forbidden(self):
        """Testa que membros não podem aprovar"""
        event = Event.objects.create(
            title='Show',
            location='Local',
            event_date=date.today() + timedelta(days=7),
            start_time=time(20, 0),
            end_time=time(23, 0),
            created_by=self.sara,
            status='proposed'
        )
        
        # Autenticar como membro (não líder)
        self.client.force_authenticate(user=self.sara)
        
        response = self.client.post(f'/api/events/{event.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_set_availability(self):
        """Testa marcar disponibilidade"""
        event = Event.objects.create(
            title='Show',
            location='Local',
            event_date=date.today() + timedelta(days=7),
            start_time=time(20, 0),
            end_time=time(23, 0),
            created_by=self.sara
        )
        
        # Criar availability inicial
        Availability.objects.create(
            musician=self.sara_musician,
            event=event,
            response='pending'
        )
        
        self.client.force_authenticate(user=self.sara)
        
        data = {
            'response': 'available',
            'notes': 'Posso tocar!'
        }
        
        response = self.client.post(f'/api/events/{event.id}/set_availability/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verifica se foi atualizado
        availability = Availability.objects.get(musician=self.sara_musician, event=event)
        self.assertEqual(availability.response, 'available')
        self.assertEqual(availability.notes, 'Posso tocar!')
        self.assertIsNotNone(availability.responded_at)

    def test_set_availability_sets_responded_at(self):
        """Marcar disponibilidade deve preencher responded_at para respostas não pendentes"""
        event = Event.objects.create(
            title='Show',
            location='Local',
            event_date=date.today() + timedelta(days=7),
            start_time=time(20, 0),
            end_time=time(23, 0),
            created_by=self.sara
        )

        Availability.objects.create(
            musician=self.sara_musician,
            event=event,
            response='pending'
        )

        self.client.force_authenticate(user=self.sara)
        response = self.client.post(
            f'/api/events/{event.id}/set_availability/',
            {'response': 'available', 'notes': 'Confirmado'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        availability = Availability.objects.get(musician=self.sara_musician, event=event)
        self.assertEqual(availability.response, 'available')
        self.assertIsNotNone(availability.responded_at)
        self.assertTrue(EventLog.objects.filter(event=event, action='availability').exists())

    def test_solo_event_sets_approval_fields(self):
        """Show solo deve ser criado aprovado com carimbo de aprovador"""
        self.client.force_authenticate(user=self.sara)

        data = {
            'title': 'Show Solo',
            'location': 'Café',
            'event_date': (date.today() + timedelta(days=3)).isoformat(),
            'start_time': '19:00:00',
            'end_time': '21:00:00',
            'is_solo': True,
        }

        response = self.client.post('/api/events/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        event = Event.objects.get(id=response.data['id'])
        self.assertEqual(event.status, 'approved')
        self.assertEqual(event.approved_by, self.sara)
        self.assertIsNotNone(event.approved_at)
        self.assertTrue(EventLog.objects.filter(event=event, action='created').exists())


class RestoreAvailabilityConflictTest(TestCase):
    """Testes da restauração de disponibilidade considerando eventos que cruzam datas"""

    def setUp(self):
        self.sara = User.objects.create_user(username='sara', password='senha123')
        self.roberto = User.objects.create_user(username='roberto', password='senha123')
        self.roberto_musician = Musician.objects.create(
            user=self.roberto,
            instrument='drums',
            role='leader'
        )

    def test_restore_skips_conflict_from_previous_day_event(self):
        """Não deve restaurar disponibilidade quando há evento cruzando meia-noite no dia anterior"""
        base_date = timezone.now().date() + timedelta(days=5)

        # Disponibilidade original do líder
        LeaderAvailability.objects.create(
            leader=self.roberto_musician,
            date=base_date,
            start_time=time(22, 0),
            end_time=time(2, 0),
            is_active=True
        )

        # Evento que será removido
        event_to_restore = Event.objects.create(
            title='Show tarde da noite',
            location='Casa de shows',
            event_date=base_date,
            start_time=time(0, 30),
            end_time=time(1, 30),
            created_by=self.sara,
            status='cancelled'
        )

        # Evento do dia anterior cruzando para o dia alvo
        Event.objects.create(
            title='Evento na véspera',
            location='Arena',
            event_date=base_date - timedelta(days=1),
            start_time=time(23, 30),
            end_time=time(0, 30),
            created_by=self.roberto,
            status='approved'
        )

        before_count = LeaderAvailability.objects.filter(leader=self.roberto_musician).count()

        viewset = EventViewSet()
        viewset._restore_leader_availability(event_to_restore)

        after_count = LeaderAvailability.objects.filter(leader=self.roberto_musician).count()
        self.assertEqual(before_count, after_count)
        restored = LeaderAvailability.objects.filter(notes__icontains='Restaurada', leader=self.roberto_musician)
        self.assertFalse(restored.exists())


class LeaderAvailabilityAPITest(APITestCase):
    """Testes de atualização de disponibilidade do líder com eventos cruzando datas"""

    def setUp(self):
        self.roberto = User.objects.create_user(username='roberto', password='senha123')
        self.roberto_musician = Musician.objects.create(
            user=self.roberto,
            instrument='drums',
            role='leader'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.roberto)

    def test_update_splits_availability_with_cross_midnight_event(self):
        """Atualizar disponibilidade deve considerar eventos que começam no dia anterior e cruzam meia-noite"""
        base_date = timezone.now().date() + timedelta(days=4)

        availability = LeaderAvailability.objects.create(
            leader=self.roberto_musician,
            date=base_date,
            start_time=time(1, 30),
            end_time=time(2, 30),
            is_active=True
        )

        Event.objects.create(
            title='Evento cruzando meia-noite',
            location='Local',
            event_date=base_date - timedelta(days=1),
            start_time=time(23, 30),
            end_time=time(0, 30),
            created_by=self.roberto,
            status='approved'
        )

        payload = {
            'date': base_date.isoformat(),
            'start_time': '00:00',
            'end_time': '02:00',
        }

        response = self.client.put(f'/api/leader-availabilities/{availability.id}/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        availability.refresh_from_db()
        self.assertFalse(availability.is_active)

        fragments = LeaderAvailability.objects.filter(
            leader=self.roberto_musician,
            is_active=True,
            date=base_date
        )
        self.assertTrue(fragments.filter(start_time=time(1, 10), end_time=time(2, 0)).exists())


class EventLogAndPreviewTest(APITestCase):
    """Testes de histórico e preview de conflitos"""

    def setUp(self):
        self.creator = User.objects.create_user(username='sara', password='senha123')
        self.leader_user = User.objects.create_user(username='roberto', password='senha123')
        self.creator_musician = Musician.objects.create(user=self.creator, instrument='vocal', role='member')
        self.leader_musician = Musician.objects.create(user=self.leader_user, instrument='drums', role='leader')
        self.client = APIClient()
        self.client.force_authenticate(user=self.creator)

    def test_preview_conflicts_endpoint(self):
        """Preview deve retornar conflito quando há sobreposição com buffer"""
        base_date = date.today() + timedelta(days=6)
        conflicting_event = Event.objects.create(
            title='Evento existente',
            location='Casa',
            event_date=base_date,
            start_time=time(20, 0),
            end_time=time(22, 0),
            created_by=self.creator,
            status='approved'
        )

        payload = {
            'event_date': base_date.isoformat(),
            'start_time': '21:00',
            'end_time': '23:00'
        }
        response = self.client.post('/api/events/preview_conflicts/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data['has_conflicts'])
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['conflicts'][0]['id'], conflicting_event.id)

    def test_logs_returned_in_detail(self):
        """Detalhe do evento deve retornar logs recentes"""
        event = Event.objects.create(
            title='Show para log',
            location='Local',
            event_date=date.today() + timedelta(days=7),
            start_time=time(19, 0),
            end_time=time(21, 0),
            created_by=self.creator,
            status='proposed'
        )
        EventLog.objects.create(event=event, performed_by=self.creator, action='created', description='Criado')

        response = self.client.get(f'/api/events/{event.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('logs', response.data)
        self.assertGreaterEqual(len(response.data['logs']), 1)

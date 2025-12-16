# agenda/tests/test_event_invites.py
"""
Testes do novo fluxo de criação de eventos com convites de músicos.
"""
from datetime import date, time, timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from agenda.models import Musician, Event, Availability, LeaderAvailability, Organization, Membership


class EventInviteFlowTest(APITestCase):
    """Testes do fluxo de convites de eventos"""

    def setUp(self):
        # Criar usuário criador do evento
        self.creator = User.objects.create_user(
            username='arthur',
            email='arthur@test.com',
            password='arthur2025@',
            first_name='Arthur',
            last_name='Araújo'
        )
        self.org = Organization.objects.create(
            name='Banda Test',
            owner=self.creator,
            subscription_status='active'
        )
        Membership.objects.create(
            user=self.creator,
            organization=self.org,
            role='owner',
            status='active'
        )
        self.creator_musician = Musician.objects.create(
            user=self.creator,
            instrument='guitar',
            role='leader',
            organization=self.org,
            is_active=True
        )

        # Criar músicos convidáveis
        self.user2 = User.objects.create_user(
            username='roberto',
            email='roberto@test.com',
            password='roberto2025@',
            first_name='Roberto',
            last_name='Silva'
        )
        Membership.objects.create(
            user=self.user2,
            organization=self.org,
            role='member',
            status='active'
        )
        self.musician2 = Musician.objects.create(
            user=self.user2,
            instrument='drums',
            role='member',
            organization=self.org,
            is_active=True
        )

        self.user3 = User.objects.create_user(
            username='carlos',
            email='carlos@test.com',
            password='carlos2025@',
            first_name='Carlos',
            last_name='Bass'
        )
        Membership.objects.create(
            user=self.user3,
            organization=self.org,
            role='member',
            status='active'
        )
        self.musician3 = Musician.objects.create(
            user=self.user3,
            instrument='bass',
            role='member',
            organization=self.org,
            is_active=True
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.creator)
        self.target_date = date.today() + timedelta(days=5)

    def test_create_event_with_invited_musicians(self):
        """Testa criação de evento com músicos convidados"""
        event_data = {
            'title': 'Show no Bar',
            'location': 'Bar do João',
            'event_date': self.target_date.isoformat(),
            'start_time': '20:00',
            'end_time': '23:00',
            'is_solo': False,
            'invited_musicians': [self.musician2.id, self.musician3.id]
        }

        url = reverse('event-list')
        response = self.client.post(url, event_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verificar evento criado
        event = Event.objects.get(id=response.data['id'])
        self.assertEqual(event.status, 'proposed')
        self.assertEqual(event.created_by, self.creator)

        # Verificar availabilities criadas
        availabilities = Availability.objects.filter(event=event)
        self.assertEqual(availabilities.count(), 3)  # Criador + 2 convidados

        # Criador deve estar como 'available'
        creator_avail = availabilities.get(musician=self.creator_musician)
        self.assertEqual(creator_avail.response, 'available')

        # Convidados devem estar como 'pending'
        for musician in [self.musician2, self.musician3]:
            avail = availabilities.get(musician=musician)
            self.assertEqual(avail.response, 'pending')

    def test_create_solo_event_auto_approved(self):
        """Testa que evento solo é aprovado automaticamente"""
        event_data = {
            'title': 'Show Solo',
            'location': 'Bar do João',
            'event_date': self.target_date.isoformat(),
            'start_time': '20:00',
            'end_time': '23:00',
            'is_solo': True
        }

        url = reverse('event-list')
        response = self.client.post(url, event_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event = Event.objects.get(id=response.data['id'])
        self.assertEqual(event.status, 'approved')

    def test_event_confirmed_when_all_accept(self):
        """Testa que evento é confirmado quando todos os convidados aceitam"""
        # Criar evento com convite
        event_data = {
            'title': 'Show no Bar',
            'location': 'Bar do João',
            'event_date': self.target_date.isoformat(),
            'start_time': '20:00',
            'end_time': '23:00',
            'is_solo': False,
            'invited_musicians': [self.musician2.id]
        }

        url = reverse('event-list')
        response = self.client.post(url, event_data, format='json')
        event_id = response.data['id']

        # Verificar status inicial
        event = Event.objects.get(id=event_id)
        self.assertEqual(event.status, 'proposed')

        # Convidado aceita
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(
            reverse('event-set-availability', args=[event_id]),
            {'response': 'available'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verificar que evento foi confirmado
        event.refresh_from_db()
        self.assertEqual(event.status, 'confirmed')

    def test_event_stays_proposed_when_someone_refuses(self):
        """Testa que evento permanece proposed quando alguém recusa"""
        # Criar evento com 2 convidados
        event_data = {
            'title': 'Show no Bar',
            'location': 'Bar do João',
            'event_date': self.target_date.isoformat(),
            'start_time': '20:00',
            'end_time': '23:00',
            'is_solo': False,
            'invited_musicians': [self.musician2.id, self.musician3.id]
        }

        url = reverse('event-list')
        response = self.client.post(url, event_data, format='json')
        event_id = response.data['id']

        # Primeiro convidado aceita
        self.client.force_authenticate(user=self.user2)
        self.client.post(
            reverse('event-set-availability', args=[event_id]),
            {'response': 'available'},
            format='json'
        )

        # Segundo convidado recusa
        self.client.force_authenticate(user=self.user3)
        self.client.post(
            reverse('event-set-availability', args=[event_id]),
            {'response': 'unavailable'},
            format='json'
        )

        # Evento deve permanecer proposed (criador pode decidir o que fazer)
        event = Event.objects.get(id=event_id)
        self.assertEqual(event.status, 'proposed')

    def test_event_without_invites_auto_confirmed(self):
        """Testa que evento sem convidados é confirmado automaticamente"""
        event_data = {
            'title': 'Show Solo Implícito',
            'location': 'Bar do João',
            'event_date': self.target_date.isoformat(),
            'start_time': '20:00',
            'end_time': '23:00',
            'is_solo': False,
            'invited_musicians': []  # Lista vazia
        }

        url = reverse('event-list')
        response = self.client.post(url, event_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event = Event.objects.get(id=response.data['id'])
        self.assertEqual(event.status, 'confirmed')

    def test_can_approve_shows_for_invited_musician(self):
        """Testa que can_approve é True para músico convidado com pending"""
        # Criar evento com convite
        event_data = {
            'title': 'Show no Bar',
            'location': 'Bar do João',
            'event_date': self.target_date.isoformat(),
            'start_time': '20:00',
            'end_time': '23:00',
            'is_solo': False,
            'invited_musicians': [self.musician2.id]
        }

        url = reverse('event-list')
        response = self.client.post(url, event_data, format='json')
        event_id = response.data['id']

        # Buscar detalhes como convidado
        self.client.force_authenticate(user=self.user2)
        response = self.client.get(reverse('event-detail', args=[event_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['can_approve'])

    def test_can_approve_false_after_responding(self):
        """Testa que can_approve é False após músico responder"""
        # Criar evento com convite
        event_data = {
            'title': 'Show no Bar',
            'location': 'Bar do João',
            'event_date': self.target_date.isoformat(),
            'start_time': '20:00',
            'end_time': '23:00',
            'is_solo': False,
            'invited_musicians': [self.musician2.id]
        }

        url = reverse('event-list')
        response = self.client.post(url, event_data, format='json')
        event_id = response.data['id']

        # Convidado responde
        self.client.force_authenticate(user=self.user2)
        self.client.post(
            reverse('event-set-availability', args=[event_id]),
            {'response': 'available'},
            format='json'
        )

        # Buscar detalhes novamente
        response = self.client.get(reverse('event-detail', args=[event_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['can_approve'])

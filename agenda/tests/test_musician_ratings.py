# agenda/tests/test_musician_ratings.py
"""Testes da API de avaliação de músicos"""
from django.test import TestCase
from django.contrib.auth.models import User
from datetime import date, time, timedelta
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from agenda.models import Musician, Event, Availability, MusicianRating, Organization, Membership


class MusicianRatingAPITest(APITestCase):
    """Testes da API de avaliação de músicos"""

    def setUp(self):
        # Criar organização para os usuários
        self.org = Organization.objects.create(name='Banda Teste')

        # Criar usuário criador do evento
        self.creator = User.objects.create_user(
            username='arthur',
            first_name='Arthur',
            password='senha123'
        )
        # Criar músicos para avaliar
        self.musician1_user = User.objects.create_user(
            username='sara',
            first_name='Sara',
            password='senha123'
        )
        self.musician2_user = User.objects.create_user(
            username='roberto',
            first_name='Roberto',
            password='senha123'
        )

        # Criar memberships na organização
        Membership.objects.create(user=self.creator, organization=self.org, role='member')
        Membership.objects.create(user=self.musician1_user, organization=self.org, role='member')
        Membership.objects.create(user=self.musician2_user, organization=self.org, role='member')

        # Perfis de músicos
        self.creator_musician = Musician.objects.create(
            user=self.creator,
            instrument='guitar',
            role='member',
            organization=self.org
        )
        self.musician1 = Musician.objects.create(
            user=self.musician1_user,
            instrument='vocal',
            role='member',
            organization=self.org
        )
        self.musician2 = Musician.objects.create(
            user=self.musician2_user,
            instrument='drums',
            role='member',
            organization=self.org
        )

        # Criar evento passado (pode ser avaliado)
        self.past_event = Event.objects.create(
            title='Show Passado',
            location='Bar do João',
            event_date=date.today() - timedelta(days=2),
            start_time=time(20, 0),
            end_time=time(23, 0),
            created_by=self.creator,
            organization=self.org,
            status='confirmed'
        )

        # Criar availabilities para o evento passado
        Availability.objects.create(
            musician=self.musician1,
            event=self.past_event,
            response='available'
        )
        Availability.objects.create(
            musician=self.musician2,
            event=self.past_event,
            response='available'
        )

        # Criar evento futuro (não pode ser avaliado)
        self.future_event = Event.objects.create(
            title='Show Futuro',
            location='Teatro',
            event_date=date.today() + timedelta(days=7),
            start_time=time(19, 0),
            end_time=time(22, 0),
            created_by=self.creator,
            organization=self.org,
            status='proposed'
        )

        self.client = APIClient()

    def test_can_rate_returns_true_for_creator_past_event(self):
        """Criador pode avaliar evento que já passou"""
        self.client.force_authenticate(user=self.creator)

        response = self.client.get(f'/api/events/{self.past_event.id}/can_rate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['can_rate'])

    def test_can_rate_returns_false_for_future_event(self):
        """Não pode avaliar evento que ainda não aconteceu"""
        self.client.force_authenticate(user=self.creator)

        response = self.client.get(f'/api/events/{self.future_event.id}/can_rate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['can_rate'])
        self.assertIn('após a data', response.data['reason'])

    def test_can_rate_returns_false_for_non_creator(self):
        """Não criador não pode avaliar"""
        # Músico 1 está convidado para o evento, então pode vê-lo
        self.client.force_authenticate(user=self.musician1_user)

        response = self.client.get(f'/api/events/{self.past_event.id}/can_rate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['can_rate'])
        self.assertIn('criador', response.data['reason'])

    def test_submit_ratings_success(self):
        """Criador consegue enviar avaliações válidas"""
        self.client.force_authenticate(user=self.creator)

        payload = {
            'ratings': [
                {'musician_id': self.musician1.id, 'rating': 5, 'comment': 'Excelente voz!'},
                {'musician_id': self.musician2.id, 'rating': 4, 'comment': 'Muito bom!'}
            ]
        }

        response = self.client.post(
            f'/api/events/{self.past_event.id}/submit_ratings/',
            payload,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data), 2)

        # Verifica que as avaliações foram criadas
        self.assertEqual(MusicianRating.objects.filter(event=self.past_event).count(), 2)

        # Verifica que os ratings do músico foram atualizados
        self.musician1.refresh_from_db()
        self.assertEqual(self.musician1.total_ratings, 1)
        self.assertEqual(float(self.musician1.average_rating), 5.0)

        self.musician2.refresh_from_db()
        self.assertEqual(self.musician2.total_ratings, 1)
        self.assertEqual(float(self.musician2.average_rating), 4.0)

    def test_submit_ratings_forbidden_for_non_creator(self):
        """Não criador não pode enviar avaliações"""
        self.client.force_authenticate(user=self.musician1_user)

        payload = {
            'ratings': [
                {'musician_id': self.musician2.id, 'rating': 5}
            ]
        }

        response = self.client.post(
            f'/api/events/{self.past_event.id}/submit_ratings/',
            payload,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_submit_ratings_fails_for_future_event(self):
        """Não pode avaliar evento futuro"""
        self.client.force_authenticate(user=self.creator)

        payload = {
            'ratings': [
                {'musician_id': self.musician1.id, 'rating': 5}
            ]
        }

        response = self.client.post(
            f'/api/events/{self.future_event.id}/submit_ratings/',
            payload,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_ratings_fails_for_invalid_rating(self):
        """Avaliação inválida (fora de 1-5) é rejeitada"""
        self.client.force_authenticate(user=self.creator)

        payload = {
            'ratings': [
                {'musician_id': self.musician1.id, 'rating': 6}
            ]
        }

        response = self.client.post(
            f'/api/events/{self.past_event.id}/submit_ratings/',
            payload,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_ratings_fails_for_duplicate(self):
        """Não pode avaliar o mesmo evento duas vezes"""
        self.client.force_authenticate(user=self.creator)

        payload = {
            'ratings': [
                {'musician_id': self.musician1.id, 'rating': 5}
            ]
        }

        # Primeira avaliação deve funcionar
        response1 = self.client.post(
            f'/api/events/{self.past_event.id}/submit_ratings/',
            payload,
            format='json'
        )
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Segunda avaliação deve falhar
        response2 = self.client.post(
            f'/api/events/{self.past_event.id}/submit_ratings/',
            payload,
            format='json'
        )
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('já enviou', response2.data['detail'])

    def test_event_detail_includes_can_rate(self):
        """Detalhe do evento inclui campo can_rate"""
        self.client.force_authenticate(user=self.creator)

        response = self.client.get(f'/api/events/{self.past_event.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('can_rate', response.data)
        self.assertTrue(response.data['can_rate'])

    def test_rating_updates_musician_average(self):
        """Múltiplas avaliações atualizam corretamente a média do músico"""
        # Criar outro evento passado com outro criador
        other_creator = User.objects.create_user(username='joao', password='senha123')
        Membership.objects.create(user=other_creator, organization=self.org, role='member')
        Musician.objects.create(user=other_creator, instrument='bass', role='member', organization=self.org)

        other_event = Event.objects.create(
            title='Outro Show',
            location='Outro Bar',
            event_date=date.today() - timedelta(days=5),
            start_time=time(21, 0),
            end_time=time(23, 30),
            created_by=other_creator,
            organization=self.org,
            status='confirmed'
        )
        Availability.objects.create(
            musician=self.musician1,
            event=other_event,
            response='available'
        )

        # Primeira avaliação: 5 estrelas
        self.client.force_authenticate(user=self.creator)
        self.client.post(
            f'/api/events/{self.past_event.id}/submit_ratings/',
            {'ratings': [{'musician_id': self.musician1.id, 'rating': 5}]},
            format='json'
        )

        # Segunda avaliação: 3 estrelas
        self.client.force_authenticate(user=other_creator)
        self.client.post(
            f'/api/events/{other_event.id}/submit_ratings/',
            {'ratings': [{'musician_id': self.musician1.id, 'rating': 3}]},
            format='json'
        )

        # Verifica média: (5 + 3) / 2 = 4.0
        self.musician1.refresh_from_db()
        self.assertEqual(self.musician1.total_ratings, 2)
        self.assertEqual(float(self.musician1.average_rating), 4.0)

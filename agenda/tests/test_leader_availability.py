# agenda/tests/test_leader_availability.py
"""
Testes robustos para a funcionalidade de LeaderAvailability.
Cobre criação, listagem, filtros e permissões.
"""
from datetime import date, time, timedelta
from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from agenda.models import Musician, LeaderAvailability, Organization, Membership


class LeaderAvailabilityModelTest(TestCase):
    """Testes do modelo LeaderAvailability"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.org = Organization.objects.create(
            name='Test Org',
            owner=self.user,
            subscription_status='active'
        )
        Membership.objects.create(
            user=self.user,
            organization=self.org,
            role='owner',
            status='active'
        )
        self.musician = Musician.objects.create(
            user=self.user,
            instrument='guitar',
            role='leader',
            organization=self.org,
            is_active=True
        )

    def test_create_availability(self):
        """Testa criação de disponibilidade"""
        avail = LeaderAvailability.objects.create(
            leader=self.musician,
            date=date.today() + timedelta(days=1),
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_public=False,
            is_active=True
        )
        self.assertEqual(avail.leader, self.musician)
        self.assertTrue(avail.is_active)

    def test_availability_str(self):
        """Testa representação string"""
        avail = LeaderAvailability.objects.create(
            leader=self.musician,
            date=date.today(),
            start_time=time(14, 0),
            end_time=time(18, 0)
        )
        # O formato é "Nome - DD/MM/YYYY HH:MM-HH:MM"
        self.assertIn('14:00', str(avail))
        self.assertIn('18:00', str(avail))


class LeaderAvailabilityAPITest(APITestCase):
    """Testes da API de LeaderAvailability"""

    def setUp(self):
        # Criar usuário e músico
        self.user = User.objects.create_user(
            username='arthur',
            email='arthur@test.com',
            password='arthur2025@',
            first_name='Arthur',
            last_name='Araújo'
        )
        self.org = Organization.objects.create(
            name='Banda Test',
            owner=self.user,
            subscription_status='active'
        )
        Membership.objects.create(
            user=self.user,
            organization=self.org,
            role='owner',
            status='active'
        )
        self.musician = Musician.objects.create(
            user=self.user,
            instrument='guitar',
            role='leader',
            organization=self.org,
            is_active=True
        )

        # Criar segundo usuário para testar filtros
        self.user2 = User.objects.create_user(
            username='bruno',
            email='bruno@test.com',
            password='bruno2025@',
            first_name='Bruno',
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

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.list_url = reverse('leader-availability-list')

    def test_create_availability(self):
        """Testa criação de disponibilidade via API"""
        data = {
            'date': (date.today() + timedelta(days=1)).isoformat(),
            'start_time': '14:00',
            'end_time': '18:00',
            'notes': 'Disponível para shows',
            'is_public': False
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['leader'], self.musician.id)
        self.assertEqual(response.data['leader_name'], 'Arthur Araújo')

    def test_list_my_availabilities(self):
        """Testa listagem de minhas disponibilidades"""
        # Criar disponibilidades para o usuário logado
        LeaderAvailability.objects.create(
            leader=self.musician,
            date=date.today() + timedelta(days=1),
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True,
            is_public=False
        )
        LeaderAvailability.objects.create(
            leader=self.musician,
            date=date.today() + timedelta(days=2),
            start_time=time(10, 0),
            end_time=time(14, 0),
            is_active=True,
            is_public=True
        )

        # Criar disponibilidade de outro usuário (não deve aparecer)
        LeaderAvailability.objects.create(
            leader=self.musician2,
            date=date.today() + timedelta(days=1),
            start_time=time(20, 0),
            end_time=time(23, 0),
            is_active=True,
            is_public=False
        )

        response = self.client.get(self.list_url, {'mine': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Deve retornar apenas as 2 do usuário logado
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)

    def test_list_public_availabilities(self):
        """Testa listagem de disponibilidades públicas"""
        # Criar disponibilidade pública de outro usuário
        LeaderAvailability.objects.create(
            leader=self.musician2,
            date=date.today() + timedelta(days=1),
            start_time=time(20, 0),
            end_time=time(23, 0),
            is_active=True,
            is_public=True
        )

        # Criar disponibilidade privada (não deve aparecer)
        LeaderAvailability.objects.create(
            leader=self.musician2,
            date=date.today() + timedelta(days=2),
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True,
            is_public=False
        )

        response = self.client.get(self.list_url, {'public': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        # Deve ter apenas a pública
        public_results = [r for r in results if r['is_public']]
        self.assertGreaterEqual(len(public_results), 1)

    def test_filter_by_upcoming(self):
        """Testa filtro de disponibilidades futuras"""
        # Disponibilidade futura
        LeaderAvailability.objects.create(
            leader=self.musician,
            date=date.today() + timedelta(days=5),
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True
        )

        # Disponibilidade passada (não deve aparecer)
        LeaderAvailability.objects.create(
            leader=self.musician,
            date=date.today() - timedelta(days=5),
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True
        )

        response = self.client.get(self.list_url, {'mine': 'true', 'upcoming': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        for r in results:
            self.assertGreaterEqual(r['date'], date.today().isoformat())

    def test_filter_by_instrument(self):
        """Testa filtro por instrumento"""
        # Criar disponibilidade pública do baterista
        LeaderAvailability.objects.create(
            leader=self.musician2,  # drums
            date=date.today() + timedelta(days=1),
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True,
            is_public=True
        )

        # Criar disponibilidade pública do guitarrista
        LeaderAvailability.objects.create(
            leader=self.musician,  # guitar
            date=date.today() + timedelta(days=1),
            start_time=time(10, 0),
            end_time=time(12, 0),
            is_active=True,
            is_public=True
        )

        response = self.client.get(self.list_url, {
            'public': 'true',
            'instrument': 'drums'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        for r in results:
            self.assertEqual(r['leader_instrument'], 'drums')

    def test_search_by_name(self):
        """Testa busca por nome do músico"""
        # Criar disponibilidade pública
        LeaderAvailability.objects.create(
            leader=self.musician2,  # Bruno Silva
            date=date.today() + timedelta(days=1),
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True,
            is_public=True
        )

        response = self.client.get(self.list_url, {
            'public': 'true',
            'search': 'Bruno'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        self.assertGreaterEqual(len(results), 1)
        self.assertIn('Bruno', results[0]['leader_name'])

    def test_update_own_availability(self):
        """Testa atualização da própria disponibilidade"""
        avail = LeaderAvailability.objects.create(
            leader=self.musician,
            date=date.today() + timedelta(days=1),
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True,
            notes='Original'
        )

        url = reverse('leader-availability-detail', args=[avail.id])
        response = self.client.patch(url, {'notes': 'Atualizado'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        avail.refresh_from_db()
        self.assertEqual(avail.notes, 'Atualizado')

    def test_cannot_update_others_availability(self):
        """Testa que não pode atualizar disponibilidade de outro músico"""
        avail = LeaderAvailability.objects.create(
            leader=self.musician2,  # outro músico
            date=date.today() + timedelta(days=1),
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True,
            is_public=True
        )

        url = reverse('leader-availability-detail', args=[avail.id])
        response = self.client.patch(url, {'notes': 'Hacked!'})

        # Retorna 404 porque o queryset filtra apenas as próprias disponibilidades
        # Isso é uma proteção de segurança - não expõe que o recurso existe
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_delete_own_availability(self):
        """Testa exclusão da própria disponibilidade"""
        avail = LeaderAvailability.objects.create(
            leader=self.musician,
            date=date.today() + timedelta(days=1),
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True
        )

        url = reverse('leader-availability-detail', args=[avail.id])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(LeaderAvailability.objects.filter(id=avail.id).exists())

    def test_unauthenticated_access_denied(self):
        """Testa que acesso não autenticado é negado"""
        self.client.logout()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_default_filter_is_mine(self):
        """Testa que filtro padrão é 'mine' quando nenhum parâmetro é passado"""
        # Criar disponibilidade própria
        LeaderAvailability.objects.create(
            leader=self.musician,
            date=date.today() + timedelta(days=1),
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True
        )

        # Criar disponibilidade pública de outro
        LeaderAvailability.objects.create(
            leader=self.musician2,
            date=date.today() + timedelta(days=1),
            start_time=time(20, 0),
            end_time=time(23, 0),
            is_active=True,
            is_public=True
        )

        # Sem parâmetros, deve retornar apenas as próprias
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get('results', response.data)
        for r in results:
            self.assertEqual(r['leader'], self.musician.id)


class LeaderAvailabilityInstrumentsTest(APITestCase):
    """Testes do endpoint de instrumentos"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.org = Organization.objects.create(
            name='Test Org',
            owner=self.user,
            subscription_status='active'
        )

        # Criar músicos com diferentes instrumentos
        for i, instrument in enumerate(['guitar', 'guitar', 'drums', 'bass']):
            u = User.objects.create_user(
                username=f'user{i}',
                password='pass123'
            )
            Membership.objects.create(
                user=u,
                organization=self.org,
                role='member',
                status='active'
            )
            Musician.objects.create(
                user=u,
                instrument=instrument,
                organization=self.org,
                is_active=True
            )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_instruments_endpoint(self):
        """Testa endpoint de instrumentos com contagem"""
        url = reverse('musician-instruments')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Deve ter 3 instrumentos únicos
        self.assertEqual(len(response.data), 3)

        # Verifica contagem de guitarras
        guitar = next((i for i in response.data if i['value'] == 'guitar'), None)
        self.assertIsNotNone(guitar)
        self.assertEqual(guitar['count'], 2)


class AvailableMusiciansEndpointTest(APITestCase):
    """Testes do endpoint available_musicians"""

    def setUp(self):
        # Criar usuário principal (criador do evento)
        self.user = User.objects.create_user(
            username='arthur',
            email='arthur@test.com',
            password='arthur2025@',
            first_name='Arthur',
            last_name='Araújo'
        )
        self.org = Organization.objects.create(
            name='Banda Test',
            owner=self.user,
            subscription_status='active'
        )
        Membership.objects.create(
            user=self.user,
            organization=self.org,
            role='owner',
            status='active'
        )
        self.musician = Musician.objects.create(
            user=self.user,
            instrument='guitar',
            role='leader',
            organization=self.org,
            is_active=True
        )

        # Criar segundo músico com disponibilidade pública
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

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.target_date = date.today() + timedelta(days=3)

    def test_available_musicians_returns_all_with_availability_flag(self):
        """Testa que o endpoint retorna todos os músicos com flag has_availability"""
        # Criar disponibilidade pública para musician2
        LeaderAvailability.objects.create(
            leader=self.musician2,
            date=self.target_date,
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True,
            is_public=True
        )

        url = reverse('leader-availability-available-musicians')
        response = self.client.get(url, {'date': self.target_date.isoformat()})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Deve retornar musician2 (o próprio usuário é excluído)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['musician_name'], 'Roberto Silva')
        self.assertEqual(response.data[0]['instrument'], 'drums')
        self.assertTrue(response.data[0]['has_availability'])
        self.assertEqual(response.data[0]['start_time'], '14:00')
        self.assertEqual(response.data[0]['end_time'], '18:00')

    def test_available_musicians_private_availability_not_shown(self):
        """Testa que disponibilidades privadas resultam em has_availability=False"""
        # Criar disponibilidade privada
        LeaderAvailability.objects.create(
            leader=self.musician2,
            date=self.target_date,
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True,
            is_public=False  # Privada
        )

        url = reverse('leader-availability-available-musicians')
        response = self.client.get(url, {'date': self.target_date.isoformat()})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Músico aparece, mas sem disponibilidade pública
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['musician_name'], 'Roberto Silva')
        self.assertFalse(response.data[0]['has_availability'])
        self.assertIsNone(response.data[0]['start_time'])

    def test_available_musicians_excludes_self(self):
        """Testa que o próprio usuário não aparece na lista"""
        # Criar disponibilidade pública do próprio usuário
        LeaderAvailability.objects.create(
            leader=self.musician,  # Próprio usuário
            date=self.target_date,
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True,
            is_public=True
        )

        url = reverse('leader-availability-available-musicians')
        response = self.client.get(url, {'date': self.target_date.isoformat()})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Apenas musician2, não o próprio usuário
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['musician_name'], 'Roberto Silva')

    def test_available_musicians_requires_date(self):
        """Testa que parâmetro date é obrigatório"""
        url = reverse('leader-availability-available-musicians')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_available_musicians_filter_by_instrument(self):
        """Testa filtro por instrumento"""
        # Criar terceiro músico (baixista)
        user3 = User.objects.create_user(
            username='carlos',
            password='pass123',
            first_name='Carlos',
            last_name='Bass'
        )
        Membership.objects.create(user=user3, organization=self.org, role='member', status='active')
        Musician.objects.create(
            user=user3, instrument='bass', organization=self.org, is_active=True
        )

        url = reverse('leader-availability-available-musicians')
        response = self.client.get(url, {'date': self.target_date.isoformat(), 'instrument': 'drums'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Apenas músico de drums (musician2), não o baixista
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['instrument'], 'drums')

    def test_available_musicians_only_available_filter(self):
        """Testa filtro only_available que retorna apenas músicos com disponibilidade"""
        # Criar terceiro músico (baixista) sem disponibilidade
        user3 = User.objects.create_user(
            username='carlos',
            password='pass123',
            first_name='Carlos',
            last_name='Bass'
        )
        Membership.objects.create(user=user3, organization=self.org, role='member', status='active')
        Musician.objects.create(
            user=user3, instrument='bass', organization=self.org, is_active=True
        )

        # Disponibilidade pública apenas para musician2
        LeaderAvailability.objects.create(
            leader=self.musician2,
            date=self.target_date,
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True,
            is_public=True
        )

        url = reverse('leader-availability-available-musicians')

        # Sem filtro: retorna ambos
        response = self.client.get(url, {'date': self.target_date.isoformat()})
        self.assertEqual(len(response.data), 2)

        # Com filtro only_available: retorna apenas musician2
        response = self.client.get(url, {'date': self.target_date.isoformat(), 'only_available': 'true'})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['musician_name'], 'Roberto Silva')
        self.assertTrue(response.data[0]['has_availability'])

    def test_available_musicians_sorted_by_availability_then_name(self):
        """Testa que músicos com disponibilidade aparecem primeiro"""
        # Criar terceiro músico (baixista)
        user3 = User.objects.create_user(
            username='carlos',
            password='pass123',
            first_name='Carlos',
            last_name='Bass'
        )
        Membership.objects.create(user=user3, organization=self.org, role='member', status='active')
        Musician.objects.create(
            user=user3, instrument='bass', organization=self.org, is_active=True
        )

        # Disponibilidade pública apenas para musician2 (Roberto)
        LeaderAvailability.objects.create(
            leader=self.musician2,
            date=self.target_date,
            start_time=time(14, 0),
            end_time=time(18, 0),
            is_active=True,
            is_public=True
        )

        url = reverse('leader-availability-available-musicians')
        response = self.client.get(url, {'date': self.target_date.isoformat()})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        # Roberto (com disponibilidade) deve vir primeiro
        self.assertEqual(response.data[0]['musician_name'], 'Roberto Silva')
        self.assertTrue(response.data[0]['has_availability'])
        # Carlos (sem disponibilidade) deve vir depois
        self.assertEqual(response.data[1]['musician_name'], 'Carlos Bass')
        self.assertFalse(response.data[1]['has_availability'])

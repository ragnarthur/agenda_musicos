# marketplace/tests.py
from decimal import Decimal
from datetime import date, time

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

from agenda.models import Musician, Organization
from .models import Gig, GigApplication


class GigModelTest(TestCase):
    """Testes para o modelo Gig."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(
            name='Test Org',
            owner=self.user
        )

    def test_create_gig(self):
        """Testa criação básica de uma oportunidade."""
        gig = Gig.objects.create(
            title='Show de Rock',
            description='Preciso de uma banda para evento',
            city='São Paulo',
            location='Bar do João',
            event_date=date(2025, 6, 15),
            start_time=time(20, 0),
            end_time=time(23, 0),
            budget=Decimal('2000.00'),
            contact_name='João Silva',
            contact_email='joao@example.com',
            genres='rock, pop',
            organization=self.organization,
            created_by=self.user
        )
        self.assertEqual(gig.title, 'Show de Rock')
        self.assertEqual(gig.status, 'open')
        self.assertEqual(str(gig), 'Show de Rock (Aberta)')

    def test_gig_default_status(self):
        """Testa que status padrão é 'open'."""
        gig = Gig.objects.create(
            title='Gig Simples',
            organization=self.organization
        )
        self.assertEqual(gig.status, 'open')

    def test_gig_status_choices(self):
        """Testa que todos os status são válidos."""
        valid_statuses = ['open', 'in_review', 'hired', 'closed', 'cancelled']
        for status_choice in valid_statuses:
            gig = Gig.objects.create(
                title=f'Gig {status_choice}',
                status=status_choice,
                organization=self.organization
            )
            self.assertEqual(gig.status, status_choice)


class GigApplicationModelTest(TestCase):
    """Testes para o modelo GigApplication."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='musician1',
            email='musician@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(
            name='Test Org',
            owner=self.user
        )
        self.musician = Musician.objects.create(
            user=self.user,
            organization=self.organization,
            instrument='guitar',
            role='member'
        )
        self.gig = Gig.objects.create(
            title='Show de Jazz',
            organization=self.organization
        )

    def test_create_application(self):
        """Testa criação de candidatura."""
        application = GigApplication.objects.create(
            gig=self.gig,
            musician=self.musician,
            cover_letter='Tenho 10 anos de experiência',
            expected_fee=Decimal('500.00')
        )
        self.assertEqual(application.status, 'pending')
        self.assertEqual(application.gig, self.gig)
        self.assertEqual(application.musician, self.musician)

    def test_unique_together_constraint(self):
        """Testa que um músico não pode se candidatar duas vezes à mesma gig."""
        GigApplication.objects.create(
            gig=self.gig,
            musician=self.musician
        )
        # Tentar criar segunda candidatura deve falhar
        with self.assertRaises(Exception):
            GigApplication.objects.create(
                gig=self.gig,
                musician=self.musician
            )


class GigAPITest(APITestCase):
    """Testes para a API do Marketplace."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='apiuser',
            email='api@example.com',
            password='testpass123'
        )
        self.organization = Organization.objects.create(
            name='API Org',
            owner=self.user
        )
        self.musician = Musician.objects.create(
            user=self.user,
            organization=self.organization,
            instrument='vocal',
            role='member'
        )
        self.client.force_authenticate(user=self.user)

    def test_list_gigs(self):
        """Testa listagem de oportunidades."""
        Gig.objects.create(
            title='Gig 1',
            organization=self.organization,
            created_by=self.user
        )
        Gig.objects.create(
            title='Gig 2',
            organization=self.organization,
            created_by=self.user
        )

        response = self.client.get('/api/marketplace/gigs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verifica se retorna resultados (pode ser paginado)
        data = response.data
        if isinstance(data, dict) and 'results' in data:
            self.assertGreaterEqual(len(data['results']), 2)
        else:
            self.assertGreaterEqual(len(data), 2)

    def test_create_gig(self):
        """Testa criação de oportunidade via API."""
        data = {
            'title': 'Nova Oportunidade',
            'description': 'Descrição do show',
            'city': 'Rio de Janeiro',
            'budget': '1500.00',
            'genres': 'samba, pagode'
        }
        response = self.client.post('/api/marketplace/gigs/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Nova Oportunidade')

    def test_apply_to_gig(self):
        """Testa candidatura a uma oportunidade."""
        gig = Gig.objects.create(
            title='Gig para Aplicar',
            organization=self.organization,
            status='open'
        )
        data = {
            'cover_letter': 'Estou interessado nessa oportunidade',
            'expected_fee': '800.00'
        }
        response = self.client.post(
            f'/api/marketplace/gigs/{gig.id}/apply/',
            data
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verifica que candidatura foi criada
        self.assertTrue(
            GigApplication.objects.filter(gig=gig, musician=self.musician).exists()
        )

    def test_cannot_apply_twice(self):
        """Testa que não pode candidatar duas vezes."""
        gig = Gig.objects.create(
            title='Gig Única',
            organization=self.organization,
            status='open'
        )
        # Primeira candidatura
        self.client.post(f'/api/marketplace/gigs/{gig.id}/apply/', {})

        # Segunda candidatura deve falhar
        response = self.client.post(f'/api/marketplace/gigs/{gig.id}/apply/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_my_applications(self):
        """Testa listagem de minhas candidaturas."""
        gig = Gig.objects.create(
            title='Gig com Aplicação',
            organization=self.organization
        )
        GigApplication.objects.create(
            gig=gig,
            musician=self.musician
        )

        response = self.client.get('/api/marketplace/applications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_access(self):
        """Testa que acesso sem autenticação é bloqueado."""
        self.client.logout()
        response = self.client.get('/api/marketplace/gigs/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class GigWorkflowTest(APITestCase):
    """Testes de workflow completo do Marketplace."""

    def setUp(self):
        # Criador da gig (cliente)
        self.client_user = User.objects.create_user(
            username='client',
            email='client@example.com',
            password='testpass123'
        )
        self.client_org = Organization.objects.create(
            name='Client Org',
            owner=self.client_user
        )
        self.client_musician = Musician.objects.create(
            user=self.client_user,
            organization=self.client_org,
            instrument='other',
            role='leader'
        )

        # Músico candidato
        self.candidate_user = User.objects.create_user(
            username='candidate',
            email='candidate@example.com',
            password='testpass123'
        )
        self.candidate_musician = Musician.objects.create(
            user=self.candidate_user,
            organization=self.client_org,
            instrument='guitar',
            role='member'
        )

    def test_full_workflow(self):
        """Testa workflow completo: criar gig -> candidatar -> contratar."""
        # 1. Cliente cria gig
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post('/api/marketplace/gigs/', {
            'title': 'Show Completo',
            'budget': '2000.00'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        gig_id = response.data['id']

        # 2. Candidato se candidata
        self.client.force_authenticate(user=self.candidate_user)
        response = self.client.post(f'/api/marketplace/gigs/{gig_id}/apply/', {
            'cover_letter': 'Quero participar!',
            'expected_fee': '1800.00'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 3. Cliente contrata o candidato
        self.client.force_authenticate(user=self.client_user)
        application = GigApplication.objects.get(gig_id=gig_id, musician=self.candidate_musician)

        response = self.client.post(f'/api/marketplace/gigs/{gig_id}/hire/', {
            'application_id': application.id
        })
        # Pode ser 200 ou 201 dependendo da implementação
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # 4. Verifica que gig está como contratada
        gig = Gig.objects.get(id=gig_id)
        self.assertEqual(gig.status, 'hired')

        # 5. Verifica que candidatura está como contratada
        application.refresh_from_db()
        self.assertEqual(application.status, 'hired')

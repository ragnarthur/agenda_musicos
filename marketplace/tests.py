# marketplace/tests.py
from datetime import date, time
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import Availability, Event, Musician, Organization
from notifications.models import NotificationPreference
from notifications.services.marketplace_notifications import notify_new_gig_in_city

from .models import Gig, GigApplication, GigChatMessage


class GigModelTest(TestCase):
    """Testes para o modelo Gig."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.organization = Organization.objects.create(name="Test Org", owner=self.user)

    def test_create_gig(self):
        """Testa criação básica de uma oportunidade."""
        gig = Gig.objects.create(
            title="Show de Rock",
            description="Preciso de uma banda para evento",
            city="São Paulo",
            location="Bar do João",
            event_date=date(2025, 6, 15),
            start_time=time(20, 0),
            end_time=time(23, 0),
            budget=Decimal("2000.00"),
            contact_name="João Silva",
            contact_email="joao@example.com",
            genres="rock, pop",
            organization=self.organization,
            created_by=self.user,
        )
        self.assertEqual(gig.title, "Show de Rock")
        self.assertEqual(gig.status, "open")
        self.assertEqual(str(gig), "Show de Rock (Aberta)")

    def test_gig_default_status(self):
        """Testa que status padrão é 'open'."""
        gig = Gig.objects.create(title="Gig Simples", organization=self.organization)
        self.assertEqual(gig.status, "open")

    def test_gig_status_choices(self):
        """Testa que todos os status são válidos."""
        valid_statuses = ["open", "in_review", "hired", "closed", "cancelled"]
        for status_choice in valid_statuses:
            gig = Gig.objects.create(
                title=f"Gig {status_choice}", status=status_choice, organization=self.organization
            )
            self.assertEqual(gig.status, status_choice)


class GigApplicationModelTest(TestCase):
    """Testes para o modelo GigApplication."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="musician1", email="musician@example.com", password="testpass123"
        )
        self.organization = Organization.objects.create(name="Test Org", owner=self.user)
        self.musician = Musician.objects.create(
            user=self.user, organization=self.organization, instrument="guitar", role="member"
        )
        self.gig = Gig.objects.create(title="Show de Jazz", organization=self.organization)

    def test_create_application(self):
        """Testa criação de candidatura."""
        application = GigApplication.objects.create(
            gig=self.gig,
            musician=self.musician,
            cover_letter="Tenho 10 anos de experiência",
            expected_fee=Decimal("500.00"),
        )
        self.assertEqual(application.status, "pending")
        self.assertEqual(application.gig, self.gig)
        self.assertEqual(application.musician, self.musician)

    def test_unique_together_constraint(self):
        """Testa que um músico não pode se candidatar duas vezes à mesma gig."""
        GigApplication.objects.create(gig=self.gig, musician=self.musician)
        # Tentar criar segunda candidatura deve falhar
        with self.assertRaises(Exception):
            GigApplication.objects.create(gig=self.gig, musician=self.musician)


class GigAPITest(APITestCase):
    """Testes para a API do Marketplace."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="apiuser", email="api@example.com", password="testpass123"
        )
        self.organization = Organization.objects.create(name="API Org", owner=self.user)
        self.musician = Musician.objects.create(
            user=self.user, organization=self.organization, instrument="vocal", role="member"
        )
        self.client.force_authenticate(user=self.user)

    def test_list_gigs(self):
        """Testa listagem de oportunidades."""
        Gig.objects.create(title="Gig 1", organization=self.organization, created_by=self.user)
        Gig.objects.create(title="Gig 2", organization=self.organization, created_by=self.user)

        response = self.client.get("/api/marketplace/gigs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verifica se retorna resultados (pode ser paginado)
        data = response.data
        if isinstance(data, dict) and "results" in data:
            self.assertGreaterEqual(len(data["results"]), 2)
        else:
            self.assertGreaterEqual(len(data), 2)

    def test_create_gig(self):
        """Testa criação de oportunidade via API."""
        data = {
            "title": "Nova Oportunidade",
            "description": "Descrição do show",
            "city": "Rio de Janeiro",
            "budget": "1500.00",
            "genres": "samba, pagode",
        }
        response = self.client.post("/api/marketplace/gigs/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Nova Oportunidade")

    def test_apply_to_gig(self):
        """Testa candidatura a uma oportunidade."""
        gig = Gig.objects.create(
            title="Gig para Aplicar", organization=self.organization, status="open"
        )
        data = {"cover_letter": "Estou interessado nessa oportunidade", "expected_fee": "800.00"}
        response = self.client.post(f"/api/marketplace/gigs/{gig.id}/apply/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verifica que candidatura foi criada
        self.assertTrue(GigApplication.objects.filter(gig=gig, musician=self.musician).exists())

    def test_apply_fee_cannot_exceed_gig_budget(self):
        """Impede candidatura com cachê acima do orçamento total da vaga."""
        gig = Gig.objects.create(
            title="Gig com orçamento",
            organization=self.organization,
            status="open",
            budget=Decimal("1000.00"),
        )
        response = self.client.post(
            f"/api/marketplace/gigs/{gig.id}/apply/",
            {"expected_fee": "1500.00"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("orçamento", response.data.get("detail", "").lower())

    def test_cannot_apply_twice(self):
        """Testa que não pode candidatar duas vezes."""
        gig = Gig.objects.create(title="Gig Única", organization=self.organization, status="open")
        # Primeira candidatura
        self.client.post(f"/api/marketplace/gigs/{gig.id}/apply/", {})

        # Segunda candidatura deve falhar
        response = self.client.post(f"/api/marketplace/gigs/{gig.id}/apply/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_my_applications(self):
        """Testa listagem de minhas candidaturas."""
        gig = Gig.objects.create(title="Gig com Aplicação", organization=self.organization)
        GigApplication.objects.create(gig=gig, musician=self.musician)

        response = self.client.get("/api/marketplace/applications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_access(self):
        """Testa que acesso sem autenticação é bloqueado."""
        self.client.logout()
        response = self.client.get("/api/marketplace/gigs/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class GigWorkflowTest(APITestCase):
    """Testes de workflow completo do Marketplace."""

    def setUp(self):
        # Criador da gig (cliente)
        self.client_user = User.objects.create_user(
            username="client", email="client@example.com", password="testpass123"
        )
        self.client_org = Organization.objects.create(name="Client Org", owner=self.client_user)
        self.client_musician = Musician.objects.create(
            user=self.client_user, organization=self.client_org, instrument="other", role="member"
        )

        # Músico candidato
        self.candidate_user = User.objects.create_user(
            username="candidate", email="candidate@example.com", password="testpass123"
        )
        self.candidate_musician = Musician.objects.create(
            user=self.candidate_user,
            organization=self.client_org,
            instrument="guitar",
            role="member",
        )

    def test_full_workflow(self):
        """Testa workflow completo: criar gig -> candidatar -> contratar."""
        # 1. Cliente cria gig
        self.client.force_authenticate(user=self.client_user)
        response = self.client.post(
            "/api/marketplace/gigs/",
            {
                "title": "Show Completo",
                "budget": "2000.00",
                "event_date": "2026-12-20",
                "start_time": "20:00",
                "end_time": "23:00",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        gig_id = response.data["id"]

        # 2. Candidato se candidata
        self.client.force_authenticate(user=self.candidate_user)
        response = self.client.post(
            f"/api/marketplace/gigs/{gig_id}/apply/",
            {"cover_letter": "Quero participar!", "expected_fee": "1800.00"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 3. Cliente contrata o candidato
        self.client.force_authenticate(user=self.client_user)
        application = GigApplication.objects.get(gig_id=gig_id, musician=self.candidate_musician)

        response = self.client.post(
            f"/api/marketplace/gigs/{gig_id}/hire/", {"application_id": application.id}
        )
        # Pode ser 200 ou 201 dependendo da implementação
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # 4. Verifica que gig está como contratada
        gig = Gig.objects.get(id=gig_id)
        self.assertEqual(gig.status, "hired")

        # 5. Verifica que candidatura está como contratada
        application.refresh_from_db()
        self.assertEqual(application.status, "hired")

        # 6. Verifica evento automático na agenda
        event = Event.objects.get(title="[Vaga] Show Completo")
        self.assertEqual(event.status, "confirmed")
        self.assertEqual(event.created_by, self.client_user)
        self.assertEqual(event.event_date.isoformat(), "2026-12-20")
        self.assertEqual(event.start_time.isoformat(), "20:00:00")
        self.assertEqual(event.end_time.isoformat(), "23:00:00")

        creator_availability = Availability.objects.get(event=event, musician=self.client_musician)
        candidate_availability = Availability.objects.get(
            event=event, musician=self.candidate_musician
        )
        self.assertEqual(creator_availability.response, "available")
        self.assertEqual(candidate_availability.response, "available")

    def test_hire_multiple_candidates_creates_single_event_with_band(self):
        second_user = User.objects.create_user(
            username="candidate2", email="candidate2@example.com", password="testpass123"
        )
        second_musician = Musician.objects.create(
            user=second_user,
            organization=self.client_org,
            instrument="bass",
            role="member",
        )

        self.client.force_authenticate(user=self.client_user)
        create_resp = self.client.post(
            "/api/marketplace/gigs/",
            {
                "title": "Show Banda",
                "event_date": "2026-12-21",
                "start_time": "21:00",
                "end_time": "23:30",
            },
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        gig_id = create_resp.data["id"]

        self.client.force_authenticate(user=self.candidate_user)
        first_apply = self.client.post(
            f"/api/marketplace/gigs/{gig_id}/apply/",
            {"expected_fee": "1200.00"},
        )
        self.assertEqual(first_apply.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=second_user)
        second_apply = self.client.post(
            f"/api/marketplace/gigs/{gig_id}/apply/",
            {"expected_fee": "900.00"},
        )
        self.assertEqual(second_apply.status_code, status.HTTP_201_CREATED)

        app1 = GigApplication.objects.get(gig_id=gig_id, musician=self.candidate_musician)
        app2 = GigApplication.objects.get(gig_id=gig_id, musician=second_musician)

        self.client.force_authenticate(user=self.client_user)
        hire_resp = self.client.post(
            f"/api/marketplace/gigs/{gig_id}/hire/",
            {"application_ids": [app1.id, app2.id]},
            format="json",
        )
        self.assertEqual(hire_resp.status_code, status.HTTP_200_OK)

        app1.refresh_from_db()
        app2.refresh_from_db()
        self.assertEqual(app1.status, "hired")
        self.assertEqual(app2.status, "hired")

        gig = Gig.objects.get(id=gig_id)
        self.assertEqual(gig.status, "hired")

        event = Event.objects.get(title="[Vaga] Show Banda")
        participant_ids = set(
            Availability.objects.filter(event=event).values_list("musician_id", flat=True)
        )
        self.assertSetEqual(
            participant_ids,
            {self.client_musician.id, self.candidate_musician.id, second_musician.id},
        )
        self.assertEqual(
            Availability.objects.filter(event=event, response="available").count(),
            3,
        )

    def test_hire_multiple_candidates_rejects_when_sum_exceeds_budget(self):
        second_user = User.objects.create_user(
            username="candidate3", email="candidate3@example.com", password="testpass123"
        )
        second_musician = Musician.objects.create(
            user=second_user,
            organization=self.client_org,
            instrument="keyboard",
            role="member",
        )

        self.client.force_authenticate(user=self.client_user)
        create_resp = self.client.post(
            "/api/marketplace/gigs/",
            {
                "title": "Show Orçamento Limitado",
                "budget": "1500.00",
                "event_date": "2026-12-22",
                "start_time": "20:00",
                "end_time": "22:00",
            },
        )
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        gig_id = create_resp.data["id"]

        self.client.force_authenticate(user=self.candidate_user)
        first_apply = self.client.post(
            f"/api/marketplace/gigs/{gig_id}/apply/",
            {"expected_fee": "900.00"},
        )
        self.assertEqual(first_apply.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=second_user)
        second_apply = self.client.post(
            f"/api/marketplace/gigs/{gig_id}/apply/",
            {"expected_fee": "800.00"},
        )
        self.assertEqual(second_apply.status_code, status.HTTP_201_CREATED)

        app1 = GigApplication.objects.get(gig_id=gig_id, musician=self.candidate_musician)
        app2 = GigApplication.objects.get(gig_id=gig_id, musician=second_musician)

        self.client.force_authenticate(user=self.client_user)
        hire_resp = self.client.post(
            f"/api/marketplace/gigs/{gig_id}/hire/",
            {"application_ids": [app1.id, app2.id]},
            format="json",
        )
        self.assertEqual(hire_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("excede", hire_resp.data.get("detail", "").lower())

        app1.refresh_from_db()
        app2.refresh_from_db()
        self.assertEqual(app1.status, "pending")
        self.assertEqual(app2.status, "pending")


class GigChatAPITest(APITestCase):
    """Testes do chat per-application entre criador da vaga e candidato."""

    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner_chat", email="owner_chat@example.com", password="testpass123"
        )
        self.owner_org = Organization.objects.create(name="Owner Org", owner=self.owner)
        self.owner_musician = Musician.objects.create(
            user=self.owner,
            organization=self.owner_org,
            instrument="other",
            role="member",
        )

        self.hired_user = User.objects.create_user(
            username="hired_chat", email="hired_chat@example.com", password="testpass123"
        )
        self.hired_musician = Musician.objects.create(
            user=self.hired_user,
            organization=self.owner_org,
            instrument="guitar",
            role="member",
        )

        self.other_user = User.objects.create_user(
            username="other_chat", email="other_chat@example.com", password="testpass123"
        )
        self.other_musician = Musician.objects.create(
            user=self.other_user,
            organization=self.owner_org,
            instrument="drums",
            role="member",
        )

        self.gig = Gig.objects.create(
            title="Gig Chat",
            organization=self.owner_org,
            created_by=self.owner,
            status="open",
        )

        self.application = GigApplication.objects.create(
            gig=self.gig,
            musician=self.hired_musician,
            status="pending",
            expected_fee=Decimal("500.00"),
        )

    def _chat_url(self):
        return f"/api/marketplace/gigs/{self.gig.id}/applications/{self.application.id}/chat/"

    def _hire(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            f"/api/marketplace/gigs/{self.gig.id}/hire/",
            {"application_id": self.application.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_only_owner_and_candidate_can_access_chat(self):
        """Dono da vaga e candidato acessam; terceiros recebem 403."""
        self.client.force_authenticate(user=self.owner)
        owner_response = self.client.get(self._chat_url())
        self.assertEqual(owner_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.hired_user)
        candidate_response = self.client.get(self._chat_url())
        self.assertEqual(candidate_response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.other_user)
        denied_response = self.client.get(self._chat_url())
        self.assertEqual(denied_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_send_message_and_block_after_close(self):
        """Chat disponivel desde a candidatura, bloqueado apos encerramento."""
        self.client.force_authenticate(user=self.owner)
        open_msg = self.client.post(
            self._chat_url(),
            {"message": "Tudo certo para o evento?"},
        )
        self.assertEqual(open_msg.status_code, status.HTTP_201_CREATED)
        self.assertEqual(open_msg.data["message"], "Tudo certo para o evento?")

        # Fecha a vaga — chat deve ser bloqueado
        self.gig.status = "closed"
        self.gig.save(update_fields=["status"])

        closed_msg = self.client.post(
            self._chat_url(),
            {"message": "Mensagem apos fechamento"},
        )
        self.assertEqual(closed_msg.status_code, status.HTTP_400_BAD_REQUEST)

    def test_close_gig_clears_chat_messages(self):
        self.client.force_authenticate(user=self.owner)
        self.client.post(
            self._chat_url(),
            {"message": "Mensagem para limpar"},
        )
        self.assertEqual(GigChatMessage.objects.filter(gig=self.gig).count(), 1)

        close_response = self.client.post(
            f"/api/marketplace/gigs/{self.gig.id}/close/",
            {"status": "closed"},
        )
        self.assertEqual(close_response.status_code, status.HTTP_200_OK)
        self.assertEqual(GigChatMessage.objects.filter(gig=self.gig).count(), 0)


class MarketplaceNotificationServiceTest(TestCase):
    """Testes do serviço de notificação para novas vagas por cidade."""

    def setUp(self):
        self.creator = User.objects.create_user(
            username="creator_notify", email="creator_notify@example.com", password="testpass123"
        )
        self.recipient = User.objects.create_user(
            username="recipient_notify",
            email="recipient_notify@example.com",
            password="testpass123",
        )

        self.creator_musician = Musician.objects.create(
            user=self.creator,
            instrument="vocal",
            role="member",
            city="Monte Carmelo",
            state="MG",
            is_active=True,
        )
        self.recipient_musician = Musician.objects.create(
            user=self.recipient,
            instrument="guitar",
            role="member",
            city="Monte Carmelo",
            state="MG",
            is_active=True,
        )

    @patch(
        "notifications.services.marketplace_notifications.notification_service.send_notification"
    )
    @patch("notifications.services.marketplace_notifications.send_event_notification_email")
    def test_notify_new_gig_in_city_sends_email_and_telegram(self, email_mock, telegram_mock):
        gig = Gig.objects.create(
            title="Show em Monte Carmelo",
            city="Monte Carmelo/MG",
            created_by=self.creator,
            status="open",
        )
        NotificationPreference.objects.update_or_create(
            user=self.recipient,
            defaults={
                "notify_quote_requests": True,
                "telegram_verified": True,
                "telegram_chat_id": "123456",
            },
        )

        notify_new_gig_in_city(gig.id)

        self.assertEqual(email_mock.call_count, 1)
        self.assertEqual(email_mock.call_args.kwargs["to_email"], self.recipient.email)
        self.assertEqual(telegram_mock.call_count, 1)
        self.assertEqual(telegram_mock.call_args.kwargs["user"], self.recipient)

    @patch("notifications.services.marketplace_notifications.send_event_notification_email")
    def test_notify_new_gig_in_city_logs_when_no_recipients(self, email_mock):
        gig = Gig.objects.create(
            title="Show sem destinatarios",
            city="Monte Carmelo/MG",
            created_by=self.creator,
            status="open",
        )
        self.recipient_musician.delete()

        with self.assertLogs(
            "notifications.services.marketplace_notifications", level="INFO"
        ) as logs:
            notify_new_gig_in_city(gig.id)

        output = "\n".join(logs.output)
        self.assertIn("nenhum destinatario", output)
        self.assertEqual(email_mock.call_count, 0)

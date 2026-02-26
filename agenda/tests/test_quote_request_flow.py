"""
Testa o fluxo completo de pedido de orçamento:
  contratante cria pedido → músico envia proposta → contratante aceita →
  músico confirma reserva; e variantes de declínio e cancelamento.
"""

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import Booking, ContractorProfile, Musician, QuoteProposal, QuoteRequest


def _future_date(days=30):
    return (timezone.localdate() + timedelta(days=days)).isoformat()


MOCK_NOTIFY = "unittest.mock.MagicMock"


class QuoteRequestHappyPathTest(APITestCase):
    """Fluxo completo: pedido → proposta → aceite → confirmação."""

    def setUp(self):
        self.contractor_user = User.objects.create_user(
            username="contratante_flow",
            email="contratante_flow@test.com",
            password="SenhaForte123!",
        )
        self.contractor = ContractorProfile.objects.create(
            user=self.contractor_user,
            name="Empresa Eventos",
            city="Belo Horizonte",
            state="MG",
            is_active=True,
        )
        self.musician_user = User.objects.create_user(
            username="musico_flow",
            email="musico_flow@test.com",
            password="SenhaForte123!",
        )
        self.musician = Musician.objects.create(
            user=self.musician_user,
            instrument="guitar",
            is_active=True,
            city="Belo Horizonte",
            state="MG",
        )

    @patch("agenda.view_functions.notify_new_quote_request")
    @patch("agenda.view_functions.notify_proposal_received")
    @patch("agenda.view_functions.notify_reservation_created")
    @patch("agenda.view_functions.notify_booking_confirmed")
    def test_full_flow_create_propose_accept_confirm(
        self,
        mock_notify_confirmed,
        mock_notify_reserved,
        mock_notify_proposal,
        mock_notify_created,
    ):
        # 1. Contratante cria pedido
        self.client.force_authenticate(user=self.contractor_user)
        payload = {
            "musician": self.musician.id,
            "event_date": _future_date(),
            "event_type": "Casamento",
            "location_city": "Belo Horizonte",
            "location_state": "MG",
            "duration_hours": 4,
        }
        resp = self.client.post("/api/quotes/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        request_id = resp.data["id"]
        mock_notify_created.assert_called_once()

        # 2. Músico envia proposta
        self.client.force_authenticate(user=self.musician_user)
        proposal_payload = {
            "message": "Topo! Vou levar meu melhor repertório.",
            "proposed_value": "1500.00",
            "valid_until": _future_date(days=10),
        }
        resp = self.client.post(
            f"/api/quotes/{request_id}/proposal/", proposal_payload, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        proposal_id = resp.data["id"]
        mock_notify_proposal.assert_called_once()

        qr = QuoteRequest.objects.get(id=request_id)
        self.assertEqual(qr.status, "responded")

        # 3. Contratante aceita proposta
        self.client.force_authenticate(user=self.contractor_user)
        resp = self.client.post(
            f"/api/quotes/{request_id}/accept/",
            {"proposal_id": proposal_id},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        mock_notify_reserved.assert_called_once()

        qr.refresh_from_db()
        self.assertEqual(qr.status, "reserved")
        booking = Booking.objects.get(request=qr)
        self.assertEqual(booking.status, "reserved")

        # 4. Músico confirma reserva
        self.client.force_authenticate(user=self.musician_user)
        resp = self.client.post(f"/api/quotes/{request_id}/confirm/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        mock_notify_confirmed.assert_called_once()

        qr.refresh_from_db()
        booking.refresh_from_db()
        self.assertEqual(qr.status, "confirmed")
        self.assertEqual(booking.status, "confirmed")
        self.assertIsNotNone(booking.confirmed_at)


class QuoteRequestPermissionsTest(APITestCase):
    """Verifica que apenas o dono da vaga/proposta pode agir."""

    def setUp(self):
        self.musician_user = User.objects.create_user(
            username="musico_perm",
            email="musico_perm@test.com",
            password="SenhaForte123!",
        )
        self.musician = Musician.objects.create(
            user=self.musician_user,
            instrument="vocal",
            is_active=True,
        )
        self.contractor_user = User.objects.create_user(
            username="contratante_perm",
            email="contratante_perm@test.com",
            password="SenhaForte123!",
        )
        self.contractor = ContractorProfile.objects.create(
            user=self.contractor_user,
            name="Produtor",
            is_active=True,
        )
        self.other_contractor_user = User.objects.create_user(
            username="outro_contratante_perm",
            email="outro_contratante_perm@test.com",
            password="SenhaForte123!",
        )
        ContractorProfile.objects.create(
            user=self.other_contractor_user,
            name="Outro Produtor",
            is_active=True,
        )
        self.qr = QuoteRequest.objects.create(
            contractor=self.contractor,
            musician=self.musician,
            event_date=timezone.localdate() + timedelta(days=10),
            event_type="Show",
            location_city="SP",
            location_state="SP",
            status="pending",
        )

    def test_musician_cannot_create_quote_request(self):
        """Músico sem contractor_profile recebe 403."""
        self.client.force_authenticate(user=self.musician_user)
        resp = self.client.post(
            "/api/quotes/",
            {
                "musician": self.musician.id,
                "event_date": _future_date(),
                "event_type": "x",
                "location_city": "SP",
                "location_state": "SP",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_contractor_cannot_accept_proposal(self):
        """Contratante de outro pedido não pode aceitar proposta alheia."""
        proposal = QuoteProposal.objects.create(
            request=self.qr,
            message="Proposta",
            status="sent",
        )
        self.client.force_authenticate(user=self.other_contractor_user)
        resp = self.client.post(
            f"/api/quotes/{self.qr.id}/accept/",
            {"proposal_id": proposal.id},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_contractor_cannot_send_proposal(self):
        """Contratante sem musician_profile não pode enviar proposta."""
        self.client.force_authenticate(user=self.contractor_user)
        resp = self.client.post(
            f"/api/quotes/{self.qr.id}/proposal/",
            {"message": "Oi"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_create_quote(self):
        resp = self.client.post("/api/quotes/", {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class QuoteRequestDeclineAndCancelTest(APITestCase):
    """Testa recusa de proposta e cancelamento de pedido."""

    def setUp(self):
        self.contractor_user = User.objects.create_user(
            username="contratante_decline",
            email="contratante_decline@test.com",
            password="SenhaForte123!",
        )
        self.contractor = ContractorProfile.objects.create(
            user=self.contractor_user,
            name="Declinator",
            is_active=True,
        )
        self.musician_user = User.objects.create_user(
            username="musico_decline",
            email="musico_decline@test.com",
            password="SenhaForte123!",
        )
        self.musician = Musician.objects.create(
            user=self.musician_user,
            instrument="bass",
            is_active=True,
        )
        self.qr = QuoteRequest.objects.create(
            contractor=self.contractor,
            musician=self.musician,
            event_date=timezone.localdate() + timedelta(days=20),
            event_type="Formatura",
            location_city="RJ",
            location_state="RJ",
            status="responded",
        )
        self.proposal = QuoteProposal.objects.create(
            request=self.qr,
            message="Topei",
            proposed_value="800.00",
            status="sent",
        )

    def test_contractor_can_decline_proposal(self):
        self.client.force_authenticate(user=self.contractor_user)
        resp = self.client.post(f"/api/quotes/{self.qr.id}/proposals/{self.proposal.id}/decline/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.proposal.refresh_from_db()
        self.assertEqual(self.proposal.status, "declined")

    @patch("agenda.view_functions.notify_new_quote_request", return_value=None)
    def test_contractor_can_cancel_pending_quote(self, _):
        self.qr.status = "pending"
        self.qr.save(update_fields=["status"])
        self.client.force_authenticate(user=self.contractor_user)
        resp = self.client.post(
            f"/api/quotes/{self.qr.id}/cancel/", {"reason": "Evento cancelado"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.qr.refresh_from_db()
        self.assertEqual(self.qr.status, "cancelled")

    def test_cannot_cancel_already_reserved_quote(self):
        """Pedido com status reserved exige cancelar a reserva, não o pedido."""
        self.qr.status = "reserved"
        self.qr.save(update_fields=["status"])
        self.client.force_authenticate(user=self.contractor_user)
        resp = self.client.post(f"/api/quotes/{self.qr.id}/cancel/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_inactive_musician_blocks_quote_creation(self):
        """Músico inativo não pode receber pedido de orçamento."""
        inactive_musician = Musician.objects.create(
            user=User.objects.create_user(
                username="musico_inativo_q",
                email="musico_inativo_q@test.com",
                password="x",
            ),
            instrument="trumpet",
            is_active=False,
        )
        self.client.force_authenticate(user=self.contractor_user)
        resp = self.client.post(
            "/api/quotes/",
            {
                "musician": inactive_musician.id,
                "event_date": _future_date(),
                "event_type": "Show",
                "location_city": "RJ",
                "location_state": "RJ",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

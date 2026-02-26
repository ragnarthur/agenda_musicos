from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from agenda.models import Booking, ContractorProfile, Musician, QuoteRequest


class BookingCancellationFlowTest(APITestCase):
    def setUp(self):
        self.musician_user = User.objects.create_user(
            username="musico_cancelamento",
            email="musico_cancelamento@test.com",
            password="SenhaForte123!",
        )
        self.musician = Musician.objects.create(
            user=self.musician_user,
            instrument="guitar",
            role="member",
            is_active=True,
            city="Sao Paulo",
            state="SP",
        )

        self.contractor_user = User.objects.create_user(
            username="contratante_cancelamento",
            email="contratante_cancelamento@test.com",
            password="SenhaForte123!",
        )
        self.contractor = ContractorProfile.objects.create(
            user=self.contractor_user,
            name="Contratante Teste",
            city="Sao Paulo",
            state="SP",
        )

        self.other_contractor_user = User.objects.create_user(
            username="contratante_outro",
            email="contratante_outro@test.com",
            password="SenhaForte123!",
        )
        ContractorProfile.objects.create(
            user=self.other_contractor_user,
            name="Outro Contratante",
            city="Campinas",
            state="SP",
        )

        # Gera descompasso proposital entre QuoteRequest.id e Booking.id para cobrir regressao.
        QuoteRequest.objects.create(
            contractor=self.contractor,
            musician=self.musician,
            event_date=timezone.localdate() + timedelta(days=5),
            event_type="Evento sem reserva",
            location_city="Sao Paulo",
            location_state="SP",
            status="pending",
        )

        self.quote_request = QuoteRequest.objects.create(
            contractor=self.contractor,
            musician=self.musician,
            event_date=timezone.localdate() + timedelta(days=7),
            event_type="Casamento",
            location_city="Sao Paulo",
            location_state="SP",
            status="reserved",
        )
        self.booking = Booking.objects.create(request=self.quote_request, status="reserved")

        self.cancel_url = f"/api/bookings/{self.quote_request.id}/cancel/"
        self.admin_cancel_url = f"/api/admin/bookings/{self.quote_request.id}/cancel/"

    def test_contractor_cancels_booking_using_quote_request_id(self):
        self.client.force_authenticate(user=self.contractor_user)

        response = self.client.post(
            self.cancel_url,
            {"reason": "Mudanca de data"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.quote_request.refresh_from_db()
        self.assertEqual(self.booking.status, "cancelled")
        self.assertEqual(self.booking.cancel_reason, "Mudanca de data")
        self.assertEqual(self.quote_request.status, "cancelled")

    def test_other_contractor_cannot_cancel_booking(self):
        self.client.force_authenticate(user=self.other_contractor_user)

        response = self.client.post(
            self.cancel_url,
            {"reason": "Tentativa indevida"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cancels_booking_using_quote_request_id(self):
        admin_user = User.objects.create_user(
            username="admin_cancelamento",
            email="admin_cancelamento@test.com",
            password="SenhaForte123!",
            is_staff=True,
        )
        self.client.force_authenticate(user=admin_user)

        response = self.client.post(
            self.admin_cancel_url,
            {"admin_reason": "Intervencao administrativa"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.quote_request.refresh_from_db()
        self.assertEqual(self.booking.status, "cancelled")
        self.assertEqual(self.booking.cancel_reason, "Intervencao administrativa")
        self.assertEqual(self.quote_request.status, "cancelled")

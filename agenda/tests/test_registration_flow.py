from django.test import override_settings
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from agenda.models import PendingRegistration, Musician, Organization, Membership


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class RegistrationFlowTests(APITestCase):
    def _register_user(self, email: str, username: str):
        payload = {
            'email': email,
            'username': username,
            'password': 'Teste123!@#',
            'first_name': 'Teste',
            'last_name': 'User',
            'instrument': 'violin',
            'bio': 'Violinista com experiencia em eventos.',
            'city': 'Sao Paulo',
            'state': 'SP',
        }
        response = self.client.post('/api/register/', payload, format='json')
        self.assertEqual(response.status_code, 201)
        pending = PendingRegistration.objects.get(email=email)
        return pending

    def test_verify_email_endpoint(self):
        pending = self._register_user('verify@test.com', 'verify_user')

        response = self.client.post('/api/verify-email/', {'token': pending.email_token}, format='json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('payment_token', data)
        self.assertEqual(data['status'], 'email_verified')

        pending.refresh_from_db()
        self.assertEqual(pending.status, 'email_verified')
        self.assertIsNotNone(pending.payment_token)

    def test_start_trial_flow(self):
        pending = self._register_user('trial@test.com', 'trial_user')
        self.client.post('/api/verify-email/', {'token': pending.email_token}, format='json')
        pending.refresh_from_db()

        response = self.client.post('/api/start-trial/', {'payment_token': pending.payment_token}, format='json')
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['trial_days'], 7)

        user = User.objects.get(username='trial_user')
        musician = user.musician_profile
        self.assertEqual(musician.subscription_status, 'trial')
        self.assertTrue(musician.is_on_trial())

        org = Organization.objects.get(owner=user)
        self.assertEqual(org.subscription_status, 'trial')
        self.assertTrue(Membership.objects.filter(user=user, organization=org, role='owner').exists())

    @override_settings(PAYMENT_SERVICE_SECRET='secret123')
    def test_payment_callback_marks_user_active(self):
        pending = self._register_user('stripe@test.com', 'stripe_user')
        self.client.post('/api/verify-email/', {'token': pending.email_token}, format='json')
        pending.refresh_from_db()

        payload = {
            'payment_token': pending.payment_token,
            'stripe_customer_id': 'cus_test_123',
            'stripe_subscription_id': 'sub_test_123',
            'plan': 'monthly',
        }
        response = self.client.post(
            '/api/payment-callback/',
            payload,
            format='json',
            HTTP_X_SERVICE_SECRET='secret123',
        )
        self.assertEqual(response.status_code, 201)

        user = User.objects.get(username='stripe_user')
        musician = user.musician_profile
        self.assertEqual(musician.subscription_status, 'active')
        self.assertEqual(musician.subscription_plan, 'monthly')
        self.assertEqual(musician.stripe_customer_id, 'cus_test_123')
        self.assertEqual(musician.stripe_subscription_id, 'sub_test_123')

        org = Organization.objects.get(owner=user)
        self.assertEqual(org.subscription_status, 'active')

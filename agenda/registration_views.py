# agenda/registration_views.py
"""
Views para fluxo de registro de novos músicos.
Fluxo:
1. POST /register/ - Cria cadastro pendente e envia email de verificação
2. POST /verify-email/ - Verifica email com token
3. GET /registration-status/ - Consulta status do cadastro
4. POST /process-payment/ - Processa pagamento fictício e finaliza cadastro
"""
import secrets
import logging
from datetime import timedelta
import requests

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.db import transaction
from django.conf import settings

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import PendingRegistration, Musician, Organization, Membership, MusicianRequest
from .throttles import BurstRateThrottle
from notifications.services.email_service import (
    send_verification_email,
    send_welcome_email,
    send_trial_welcome_email,
)

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    """
    POST /api/register/
    Cria cadastro pendente e envia email de verificação.
    """
    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        data = request.data
        errors = {}

        # Validações
        required_fields = ['email', 'username', 'password', 'first_name']
        for field in required_fields:
            if not data.get(field):
                errors[field] = 'Este campo é obrigatório.'

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        email = data['email'].lower().strip()
        username = data['username'].strip()
        password = data['password']
        first_name = data['first_name'].strip()

        # Validação de força de senha usando validators do Django
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response(
                {'password': list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )
        last_name = data.get('last_name', '').strip()
        instagram = data.get('instagram', '').strip()
        whatsapp = data.get('whatsapp', '').strip()
        city = str(data.get('city', '') or '').strip()
        state = str(data.get('state', '') or '').strip().upper()

        # Validar formato do Instagram (deve começar com @)
        if instagram and not instagram.startswith('@'):
            instagram = f'@{instagram}'

        instrument = str(data.get('instrument', '') or '').strip()
        instruments_raw = data.get('instruments', [])
        instruments = []

        if isinstance(instruments_raw, list):
            # Limita número máximo de instrumentos para evitar payload abuse
            if len(instruments_raw) > 10:
                errors['instruments'] = 'Máximo de 10 instrumentos permitidos.'
            else:
                for item in instruments_raw:
                    if item is None:
                        continue
                    value = str(item).strip()
                    if not value:
                        continue
                    if len(value) > 50:
                        errors['instruments'] = 'Cada instrumento deve ter no máximo 50 caracteres.'
                        break
                    instruments.append(value.lower())

        bio = str(data.get('bio', '') or '').strip()

        # Validação de tamanho do bio para evitar payload abuse
        if not bio:
            errors['bio'] = 'Mini-bio é obrigatória.'
        elif len(bio) > 350:
            errors['bio'] = 'Mini-bio deve ter no máximo 350 caracteres.'

        # Cidade e estado (obrigatórios/limites)
        if not city:
            errors['city'] = 'Cidade é obrigatória.'
        elif len(city) > 60:
            errors['city'] = 'Cidade deve ter no máximo 60 caracteres.'

        if state and len(state) > 2:
            errors['state'] = 'Estado deve ter no máximo 2 caracteres (UF).'

        # Remove duplicados preservando ordem
        if instruments:
            instruments = list(dict.fromkeys(instruments))

        if instrument and len(instrument) > 50:
            errors['instrument'] = 'Instrumento deve ter no máximo 50 caracteres.'

        # Normaliza instrumento para evitar duplicados (ex: violin/Violin)
        if instrument:
            instrument = instrument.lower()

        # Se veio lista, define o primeiro como principal
        if not instrument and instruments:
            instrument = instruments[0]

        if not instrument and not instruments:
            errors['instrument'] = 'Instrumento é obrigatório.'

        if instrument and instrument not in instruments:
            instruments.insert(0, instrument)

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # Validação de email
        if User.objects.filter(email=email).exists():
            return Response(
                {'email': 'Este email já está cadastrado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validação de username
        if User.objects.filter(username=username).exists():
            return Response(
                {'username': 'Este nome de usuário já está em uso.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Remove cadastro pendente anterior do mesmo email (se existir)
        PendingRegistration.objects.filter(email=email).delete()

        # Cria cadastro pendente
        email_token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=48)

        pending = PendingRegistration.objects.create(
            email=email,
            username=username,
            password_hash=make_password(password),
            first_name=first_name,
            last_name=last_name,
            instagram=instagram,
            whatsapp=whatsapp,
            instrument=instrument,
            instruments=instruments,
            bio=bio[:350],
            city=city,
            state=state,
            email_token=email_token,
            expires_at=expires_at,
            status='pending_email',
        )

        # Envia email de verificação
        try:
            self._send_verification_email(pending)
        except Exception as e:
            logger.error(f'Erro ao enviar email de verificação: {e}')
            # Não falha o cadastro se o email não for enviado
            # O usuário pode reenviar depois

        return Response({
            'message': 'Cadastro iniciado! Verifique seu email para continuar.',
            'email': email,
        }, status=status.HTTP_201_CREATED)

    def _send_verification_email(self, pending: PendingRegistration):
        """Envia email de verificação usando o EmailService"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        verification_url = f"{frontend_url}/verificar-email?token={pending.email_token}"

        send_verification_email(
            to_email=pending.email,
            first_name=pending.first_name,
            verification_url=verification_url,
        )


class CheckEmailView(APIView):
    """
    GET /api/check-email/?email=xxx
    Verifica disponibilidade do email em tempo real.
    """
    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def get(self, request):
        email = request.query_params.get('email', '').lower().strip()

        if not email:
            return Response(
                {'error': 'Email não fornecido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verifica se existe em User ou PendingRegistration
        exists_user = User.objects.filter(email=email).exists()
        exists_pending = PendingRegistration.objects.filter(
            email=email, expires_at__gt=timezone.now()
        ).exists()

        if exists_user:
            return Response({'available': False, 'reason': 'already_registered'})
        if exists_pending:
            return Response({'available': False, 'reason': 'pending_verification'})

        return Response({'available': True})


class VerifyEmailView(APIView):
    """
    POST /api/verify-email/
    Verifica email com token e libera para pagamento.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')

        if not token:
            return Response(
                {'error': 'Token não fornecido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pending = PendingRegistration.objects.get(email_token=token)
        except PendingRegistration.DoesNotExist:
            return Response(
                {'error': 'Token inválido ou expirado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verifica se expirou
        if pending.is_expired():
            return Response(
                {'error': 'Este link expirou. Faça o cadastro novamente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verifica se já foi verificado
        if pending.status != 'pending_email':
            return Response({
                'message': 'Email já verificado.',
                'status': pending.status,
                'payment_token': pending.payment_token,
            })

        # Verifica email
        pending.verify_email()

        return Response({
            'message': 'Email verificado com sucesso! Prossiga para o pagamento.',
            'status': pending.status,
            'payment_token': pending.payment_token,
            'email': pending.email,
            'first_name': pending.first_name,
        })


class RegistrationStatusView(APIView):
    """
    GET /api/registration-status/?token=xxx
    Consulta status do cadastro pelo payment_token.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get('token')

        if not token:
            return Response(
                {'error': 'Token não fornecido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Tenta buscar por email_token ou payment_token
        pending = PendingRegistration.objects.filter(email_token=token).first()
        if not pending:
            pending = PendingRegistration.objects.filter(payment_token=token).first()

        if not pending:
            return Response(
                {'error': 'Cadastro não encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'status': pending.status,
            'status_display': pending.get_status_display(),
            'email': pending.email,
            'first_name': pending.first_name,
            'email_verified': pending.status != 'pending_email',
            'payment_completed': pending.status == 'completed',
            'is_expired': pending.is_expired(),
            'payment_token': pending.payment_token if pending.status == 'email_verified' else None,
        })


class ProcessPaymentView(APIView):
    """
    POST /api/process-payment/
    Processa pagamento fictício e finaliza cadastro.

    Para testes, aceita qualquer número de cartão.
    Em produção, integrar com Stripe/PayPal/etc.
    """
    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        use_stripe = getattr(settings, 'USE_STRIPE', False)
        allow_fake = getattr(settings, 'ALLOW_FAKE_PAYMENT', False)
        if use_stripe and not allow_fake:
            return Response(
                {'error': 'Pagamento direto desativado. Use o checkout Stripe.'},
                status=status.HTTP_403_FORBIDDEN
            )

        payment_token = request.data.get('payment_token')
        card_number = request.data.get('card_number', '')
        card_holder = request.data.get('card_holder', '')

        if not payment_token:
            return Response(
                {'error': 'Token de pagamento não fornecido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pending = PendingRegistration.objects.get(payment_token=payment_token)
        except PendingRegistration.DoesNotExist:
            return Response(
                {'error': 'Token de pagamento inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verifica se já foi completado
        if pending.status == 'completed':
            return Response(
                {'error': 'Este cadastro já foi concluído.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verifica se email foi verificado
        if pending.status == 'pending_email':
            return Response(
                {'error': 'Email ainda não foi verificado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verifica se expirou
        if pending.is_expired():
            return Response(
                {'error': 'Este cadastro expirou. Faça o cadastro novamente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Simula processamento de pagamento (fictício)
        # Em produção, aqui integraria com Stripe/PayPal/etc
        payment_success = self._process_fake_payment(card_number, card_holder)

        if not payment_success:
            return Response(
                {'error': 'Pagamento recusado. Verifique os dados do cartão.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Finaliza cadastro
        try:
            with transaction.atomic():
                user = pending.complete_registration()

                # Cria organização pessoal para o novo músico (usa username para garantir unicidade)
                org, created = Organization.objects.get_or_create(
                    owner=user,
                    defaults={
                        'name': f"Org de {user.username}",
                        'subscription_status': 'active',
                    }
                )
                if not created:
                    org.subscription_status = 'active'
                    org.save()

                # Adiciona como membro da organização (se ainda não for)
                Membership.objects.get_or_create(
                    user=user,
                    organization=org,
                    defaults={
                        'role': 'owner',
                        'status': 'active',
                    }
                )

                # Atualiza músico com organização
                musician = user.musician_profile
                # Marca assinatura como ativa no pagamento fictício
                musician.subscription_status = 'active'
                musician.subscription_plan = 'monthly'
                musician.subscription_ends_at = None
                musician.save()

        except Exception as e:
            logger.error(f'Erro ao finalizar cadastro: {e}')
            return Response(
                {'error': 'Erro ao finalizar cadastro. Tente novamente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Envia email de boas-vindas
        try:
            self._send_welcome_email(pending, user)
        except Exception as e:
            logger.error(f'Erro ao enviar email de boas-vindas: {e}')

        return Response({
            'message': 'Pagamento aprovado! Cadastro concluído com sucesso.',
            'username': user.username,
            'email': user.email,
        }, status=status.HTTP_201_CREATED)

    def _process_fake_payment(self, card_number: str, card_holder: str) -> bool:
        """
        Processa pagamento fictício para testes.
        Aceita qualquer cartão exceto números que começam com 0000.
        """
        # Simula recusa para cartões inválidos (para testes)
        if card_number.startswith('0000'):
            return False

        # Em produção, integrar com gateway de pagamento real
        return True

    def _send_welcome_email(self, pending: PendingRegistration, user):
        """Envia email de boas-vindas usando o EmailService"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        login_url = f"{frontend_url}/login"

        send_welcome_email(
            to_email=user.email,
            first_name=pending.first_name,
            username=user.username,
            login_url=login_url,
        )


class ResendVerificationView(APIView):
    """
    POST /api/resend-verification/
    Reenvia email de verificação.
    """
    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()

        if not email:
            return Response(
                {'error': 'Email não fornecido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pending = PendingRegistration.objects.get(email=email)
        except PendingRegistration.DoesNotExist:
            # Não revela se o email existe ou não
            return Response({
                'message': 'Se o email estiver cadastrado, você receberá um novo link.'
            })

        if pending.status != 'pending_email':
            return Response({
                'message': 'Email já verificado.',
                'status': pending.status,
            })

        if pending.is_expired():
            return Response(
                {'error': 'Cadastro expirado. Faça o cadastro novamente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Gera novo token e reenvia
        pending.email_token = secrets.token_urlsafe(32)
        pending.expires_at = timezone.now() + timedelta(hours=48)
        pending.save()

        try:
            RegisterView()._send_verification_email(pending)
        except Exception as e:
            logger.error(f'Erro ao reenviar email: {e}')
            return Response(
                {'error': 'Erro ao enviar email. Tente novamente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'message': 'Email de verificação reenviado!'
        })


class StartTrialView(APIView):
    """
    POST /api/start-trial/
    Inicia período de teste gratuito de 7 dias.
    Cria User + Musician sem exigir pagamento.
    """
    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        payment_token = request.data.get('payment_token')

        if not payment_token:
            return Response(
                {'error': 'Token não fornecido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pending = PendingRegistration.objects.get(payment_token=payment_token)
        except PendingRegistration.DoesNotExist:
            return Response(
                {'error': 'Token inválido ou expirado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verifica se já foi completado
        if pending.status == 'completed':
            return Response(
                {'error': 'Cadastro já foi concluído.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verifica se email foi verificado
        if pending.status == 'pending_email':
            return Response(
                {'error': 'Email ainda não foi verificado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verifica se expirou
        if pending.is_expired():
            return Response(
                {'error': 'Cadastro expirado. Faça o cadastro novamente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Cria User + Musician (trial)
                user = pending.complete_registration()

                # Cria organização pessoal (usa username para garantir unicidade)
                org, created = Organization.objects.get_or_create(
                    owner=user,
                    defaults={
                        'name': f"Org de {user.username}",
                        'subscription_status': 'trial',
                    }
                )
                if not created:
                    org.subscription_status = 'trial'
                    org.save()

                # Adiciona como membro owner (se ainda não for)
                Membership.objects.get_or_create(
                    user=user,
                    organization=org,
                    defaults={
                        'role': 'owner',
                        'status': 'active',
                    }
                )

                # Inicia trial de 7 dias
                musician = user.musician_profile
                musician.start_trial(days=7)

                logger.info(f'Trial started for user {user.username}')

        except Exception as e:
            logger.error(f'Error starting trial: {e}')
            return Response(
                {'error': 'Erro ao iniciar período de teste.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Envia email de boas-vindas (trial)
        try:
            self._send_trial_welcome_email(pending, user)
        except Exception as e:
            logger.error(f'Error sending trial welcome email: {e}')

        return Response({
            'message': 'Período de teste iniciado com sucesso!',
            'username': user.username,
            'email': user.email,
            'trial_days': 7,
        }, status=status.HTTP_201_CREATED)

    def _send_trial_welcome_email(self, pending: PendingRegistration, user):
        """Envia email de boas-vindas para trial usando o EmailService"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        login_url = f"{frontend_url}/login"

        send_trial_welcome_email(
            to_email=user.email,
            first_name=pending.first_name,
            username=user.username,
            login_url=login_url,
            trial_days=7,
        )


class SubscriptionCheckoutView(APIView):
    """
    POST /api/subscription-checkout/
    Cria sessão de checkout para usuários logados (upgrade do trial).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan = request.data.get('plan')
        success_url = request.data.get('success_url')
        cancel_url = request.data.get('cancel_url')
        payment_method = request.data.get('payment_method', 'card')

        if plan not in ['monthly', 'annual']:
            return Response(
                {'error': 'Plano inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not success_url or not cancel_url:
            return Response(
                {'error': 'URLs de retorno são obrigatórias.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        musician = getattr(request.user, 'musician_profile', None)
        if not musician:
            return Response(
                {'error': 'Perfil de músico não encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if musician.has_active_subscription() and not musician.is_on_trial():
            return Response(
                {'error': 'Sua assinatura já está ativa.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment_service_url = getattr(settings, 'PAYMENT_SERVICE_URL', '')
        service_secret = getattr(settings, 'PAYMENT_SERVICE_SECRET', '')

        if not payment_service_url or not service_secret:
            return Response(
                {'error': 'Serviço de pagamento não configurado.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        payload = {
            'user_id': request.user.id,
            'email': request.user.email,
            'customer_name': request.user.first_name or request.user.username,
            'plan': plan,
            'success_url': success_url,
            'cancel_url': cancel_url,
            'payment_method': payment_method,
        }

        try:
            response = requests.post(
                f'{payment_service_url}/checkout/create-user-session',
                json=payload,
                headers={'X-Service-Secret': service_secret},
                timeout=15,
            )
        except requests.RequestException as e:
            logger.error(f'Erro ao contatar payment-service: {e}')
            return Response(
                {'error': 'Não foi possível iniciar o checkout.'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        if response.status_code >= 400:
            try:
                data = response.json()
            except ValueError:
                data = {'error': 'Erro ao iniciar checkout.'}
            return Response(data, status=response.status_code)

        return Response(response.json(), status=status.HTTP_200_OK)


class SubscriptionActivateView(APIView):
    """
    POST /api/subscription-activate/
    Chamado pelo Payment Service após checkout concluído para usuários existentes.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        service_secret = request.headers.get('X-Service-Secret')
        expected_secret = getattr(settings, 'PAYMENT_SERVICE_SECRET', None)

        if not expected_secret or service_secret != expected_secret:
            logger.warning('Subscription activate with invalid service secret')
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user_id = request.data.get('user_id')
        stripe_customer_id = request.data.get('stripe_customer_id')
        stripe_subscription_id = request.data.get('stripe_subscription_id')
        plan = request.data.get('plan')
        payment_method = request.data.get('payment_method', 'card')

        if not all([user_id, stripe_customer_id, plan]):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if payment_method not in ['card', 'pix', 'boleto']:
            return Response(
                {'error': 'Invalid payment method'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if payment_method == 'card' and not stripe_subscription_id:
            return Response(
                {'error': 'Missing subscription id for card payment'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if plan not in ['monthly', 'annual']:
            return Response(
                {'error': 'Invalid plan'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            musician = user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {'error': 'Musician not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        musician.stripe_customer_id = stripe_customer_id
        musician.stripe_subscription_id = stripe_subscription_id or None
        musician.subscription_plan = plan
        musician.subscription_status = 'active'
        if payment_method in ['pix', 'boleto']:
            days = 30 if plan == 'monthly' else 365
            musician.subscription_ends_at = timezone.now() + timedelta(days=days)
        else:
            musician.subscription_ends_at = None
        musician.trial_started_at = None
        musician.trial_ends_at = None
        musician.save()

        org = Organization.objects.filter(owner=user).first()
        if not org:
            org = Organization.objects.filter(memberships__user=user).first()
        if org:
            org.subscription_status = 'active'
            org.save()
            Membership.objects.filter(user=user, organization=org).update(status='active')

        logger.info(f'Subscription activated for user {user.username}')

        return Response({
            'success': True,
            'user_id': user.id,
        }, status=status.HTTP_200_OK)


class SubscriptionActivateFakeView(APIView):
    """
    POST /api/subscription-activate-fake/
    Ativa assinatura via pagamento fictício para usuários logados.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        allow_fake = getattr(settings, 'ALLOW_FAKE_PAYMENT', False)
        use_stripe = getattr(settings, 'USE_STRIPE', False)

        if use_stripe and not allow_fake:
            return Response(
                {'error': 'Pagamento fictício desativado.'},
                status=status.HTTP_403_FORBIDDEN
            )

        plan = request.data.get('plan', 'monthly')
        if plan not in ['monthly', 'annual']:
            return Response(
                {'error': 'Plano inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        musician = getattr(request.user, 'musician_profile', None)
        if not musician:
            return Response(
                {'error': 'Perfil de músico não encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if musician.has_active_subscription() and not musician.is_on_trial():
            return Response(
                {'error': 'Sua assinatura já está ativa.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        musician.subscription_status = 'active'
        musician.subscription_plan = plan
        musician.subscription_ends_at = None
        musician.trial_started_at = None
        musician.trial_ends_at = None
        musician.save()

        org = Organization.objects.filter(owner=request.user).first()
        if not org:
            org = Organization.objects.filter(memberships__user=request.user).first()
        if org:
            org.subscription_status = 'active'
            org.save()
            Membership.objects.filter(user=request.user, organization=org).update(status='active')

        logger.info(f'Fake subscription activated for user {request.user.username}')

        return Response({
            'success': True,
        }, status=status.HTTP_200_OK)


class PaymentCallbackView(APIView):
    """
    POST /api/payment-callback/
    Chamado pelo Payment Service após pagamento aprovado via Stripe.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Validar secret compartilhado
        service_secret = request.headers.get('X-Service-Secret')
        expected_secret = getattr(settings, 'PAYMENT_SERVICE_SECRET', None)

        if not expected_secret or service_secret != expected_secret:
            logger.warning('Payment callback with invalid service secret')
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        payment_token = request.data.get('payment_token')
        stripe_customer_id = request.data.get('stripe_customer_id')
        stripe_subscription_id = request.data.get('stripe_subscription_id')
        plan = request.data.get('plan')  # 'monthly' ou 'annual'
        payment_method = request.data.get('payment_method', 'card')

        if not all([payment_token, stripe_customer_id, plan]):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if payment_method not in ['card', 'pix', 'boleto']:
            return Response(
                {'error': 'Invalid payment method'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if payment_method == 'card' and not stripe_subscription_id:
            return Response(
                {'error': 'Missing subscription id for card payment'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pending = PendingRegistration.objects.get(payment_token=payment_token)
        except PendingRegistration.DoesNotExist:
            return Response(
                {'error': 'Invalid payment token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if pending.status == 'completed':
            return Response(
                {'error': 'Registration already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Finaliza registro (cria User + Musician)
                user = pending.complete_registration()

                # Cria organização pessoal (usa username para garantir unicidade)
                org, created = Organization.objects.get_or_create(
                    owner=user,
                    defaults={
                        'name': f"Org de {user.username}",
                        'subscription_status': 'active',
                    }
                )
                if not created:
                    org.subscription_status = 'active'
                    org.save()

                # Adiciona como membro owner (se ainda não for)
                Membership.objects.get_or_create(
                    user=user,
                    organization=org,
                    defaults={
                        'role': 'owner',
                        'status': 'active',
                    }
                )

                # Salvar IDs do Stripe no Musician
                musician = user.musician_profile
                musician.stripe_customer_id = stripe_customer_id
                musician.stripe_subscription_id = stripe_subscription_id or None
                musician.subscription_plan = plan
                musician.subscription_status = 'active'
                if payment_method in ['pix', 'boleto']:
                    days = 30 if plan == 'monthly' else 365
                    musician.subscription_ends_at = timezone.now() + timedelta(days=days)
                else:
                    musician.subscription_ends_at = None
                musician.trial_started_at = None
                musician.trial_ends_at = None
                musician.save()

                logger.info(f'Payment callback completed for user {user.username}')

        except Exception as e:
            logger.error(f'Error in payment callback: {e}')
            return Response(
                {'error': 'Failed to complete registration'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Envia email de boas-vindas
        try:
            ProcessPaymentView()._send_welcome_email(pending, user)
        except Exception as e:
            logger.error(f'Error sending welcome email: {e}')

        return Response({
            'success': True,
            'user_id': user.id,
            'username': user.username,
        }, status=status.HTTP_201_CREATED)


class SubscriptionStatusUpdateView(APIView):
    """
    POST /api/subscription-status-update/
    Chamado pelo Payment Service quando status da assinatura muda.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Validar secret compartilhado
        service_secret = request.headers.get('X-Service-Secret')
        expected_secret = getattr(settings, 'PAYMENT_SERVICE_SECRET', None)

        if not expected_secret or service_secret != expected_secret:
            logger.warning('Subscription update with invalid service secret')
            return Response(
                {'error': 'Unauthorized'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        stripe_customer_id = request.data.get('stripe_customer_id')
        new_status = request.data.get('status')
        subscription_ends_at = request.data.get('subscription_ends_at')

        if not stripe_customer_id or not new_status:
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            musician = Musician.objects.get(stripe_customer_id=stripe_customer_id)
        except Musician.DoesNotExist:
            return Response(
                {'error': 'Musician not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        musician.subscription_status = new_status
        if subscription_ends_at:
            from django.utils.dateparse import parse_datetime
            musician.subscription_ends_at = parse_datetime(subscription_ends_at)
        musician.save()

        logger.info(f'Subscription status updated for musician {musician.id}: {new_status}')

        return Response({'success': True})


class RegisterWithInviteView(APIView):
    """
    POST /api/register-with-invite/
    Registro de músico usando token de convite (após aprovação do admin).
    """
    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        data = request.data
        errors = {}

        # Validar token de convite
        invite_token = data.get('invite_token')
        if not invite_token:
            return Response(
                {'error': 'Token de convite não fornecido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            musician_request = MusicianRequest.objects.get(invite_token=invite_token)
        except MusicianRequest.DoesNotExist:
            return Response(
                {'error': 'Token de convite inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not musician_request.is_invite_valid():
            if musician_request.invite_used:
                return Response(
                    {'error': 'Este convite já foi utilizado.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {'error': 'Convite expirado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validações de campos
        required_fields = ['password']
        for field in required_fields:
            if not data.get(field):
                errors[field] = 'Este campo é obrigatório.'

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        password = data['password']

        # Validação de força de senha
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response(
                {'password': list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Usa dados do MusicianRequest ou permite override
        email = musician_request.email
        first_name = data.get('first_name') or musician_request.full_name.split()[0]
        last_name = data.get('last_name') or ' '.join(musician_request.full_name.split()[1:])
        username = data.get('username') or email.split('@')[0]

        # Validação de username único
        if User.objects.filter(username=username).exists():
            # Gera username único
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

        # Validação de email (já deveria estar ok pelo MusicianRequest)
        if User.objects.filter(email=email).exists():
            return Response(
                {'email': 'Este email já está cadastrado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Cria usuário
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )
                user.set_password(password)
                user.save()

                # Cria músico
                instruments = musician_request.instruments or []
                if musician_request.instrument and musician_request.instrument not in instruments:
                    instruments.insert(0, musician_request.instrument)

                musician = Musician.objects.create(
                    user=user,
                    phone=musician_request.phone,
                    instagram=musician_request.instagram or '',
                    instrument=musician_request.instrument,
                    instruments=instruments,
                    bio=musician_request.bio or '',
                    city=musician_request.city,
                    state=musician_request.state,
                    role='member',
                    is_active=True,
                    subscription_status='active',  # Músicos aprovados têm acesso ativo
                )

                # Cria organização pessoal
                org, created = Organization.objects.get_or_create(
                    owner=user,
                    defaults={
                        'name': f"Org de {username}",
                        'subscription_status': 'active',
                    }
                )
                if not created:
                    org.subscription_status = 'active'
                    org.save()

                # Adiciona como membro owner
                Membership.objects.get_or_create(
                    user=user,
                    organization=org,
                    defaults={
                        'role': 'owner',
                        'status': 'active',
                    }
                )

                # Marca convite como usado
                musician_request.mark_invite_used()

                logger.info(f'Musician registered via invite: {user.username}')

        except Exception as e:
            logger.error(f'Error registering musician with invite: {e}')
            return Response(
                {'error': 'Erro ao criar conta. Tente novamente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Envia email de boas-vindas
        try:
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            login_url = f"{frontend_url}/login"
            send_welcome_email(
                to_email=user.email,
                first_name=first_name,
                username=username,
                login_url=login_url,
            )
        except Exception as e:
            logger.error(f'Error sending welcome email: {e}')

        return Response({
            'message': 'Conta criada com sucesso!',
            'username': username,
            'email': email,
        }, status=status.HTTP_201_CREATED)


class RegisterCompanyView(APIView):
    """
    POST /api/register-company/
    Registro de empresa (gratuito, sem aprovação).
    """
    permission_classes = [AllowAny]
    throttle_classes = [BurstRateThrottle]

    def post(self, request):
        from .serializers import CompanyRegisterSerializer

        serializer = CompanyRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        email = data['email']
        password = data['password']
        company_name = data['company_name']
        contact_name = data['contact_name']
        phone = data.get('phone', '')
        city = data['city']
        state = data['state']
        org_type = data.get('org_type', 'company')

        # Validação de força de senha
        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response(
                {'password': list(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validação de username único
        username = email.split('@')[0]
        if User.objects.filter(username=username).exists():
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

        # Validação de nome de empresa único
        if Organization.objects.filter(name=company_name).exists():
            return Response(
                {'company_name': 'Uma empresa com este nome já está cadastrada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Extrai primeiro e último nome
                name_parts = contact_name.split()
                first_name = name_parts[0] if name_parts else contact_name
                last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''

                # Cria usuário
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )
                user.set_password(password)
                user.save()

                # Cria organização (empresa)
                organization = Organization.objects.create(
                    name=company_name,
                    owner=user,
                    org_type=org_type,
                    contact_name=contact_name,
                    contact_email=email,
                    phone=phone,
                    city=city,
                    state=state,
                    subscription_status='active',
                )

                # Cria membership
                Membership.objects.create(
                    user=user,
                    organization=organization,
                    role='owner',
                    status='active',
                )

                logger.info(f'Company registered: {company_name} by {user.username}')

        except Exception as e:
            logger.error(f'Error registering company: {e}')
            return Response(
                {'error': 'Erro ao criar conta. Tente novamente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'message': 'Empresa cadastrada com sucesso!',
            'username': username,
            'email': email,
            'company_name': company_name,
        }, status=status.HTTP_201_CREATED)

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

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from django.db import transaction

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import PendingRegistration, Musician, Organization, Membership
from .throttles import BurstRateThrottle

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
        last_name = data.get('last_name', '').strip()
        phone = data.get('phone', '').strip()
        instrument = str(data.get('instrument', '') or '').strip()
        bio = data.get('bio', '').strip()

        if instrument and len(instrument) > 50:
            errors['instrument'] = 'Instrumento deve ter no máximo 50 caracteres.'

        # Normaliza instrumento para evitar duplicados (ex: violin/Violin)
        if instrument:
            instrument = instrument.lower()

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
            phone=phone,
            instrument=instrument,
            bio=bio,
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
        """Envia email de verificação"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        verification_url = f"{frontend_url}/verificar-email?token={pending.email_token}"

        subject = 'Confirme seu email - Agenda Músicos'
        message = f"""
Olá {pending.first_name}!

Obrigado por se cadastrar na Agenda Músicos.

Para confirmar seu email e continuar o cadastro, clique no link abaixo:

{verification_url}

Este link expira em 48 horas.

Se você não solicitou este cadastro, ignore este email.

Atenciosamente,
Equipe Agenda Músicos
        """

        html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
        .button {{ display: inline-block; background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
        .button:hover {{ background: #4f46e5; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Agenda Músicos</h1>
        </div>
        <div class="content">
            <h2>Olá {pending.first_name}!</h2>
            <p>Obrigado por se cadastrar na <strong>Agenda Músicos</strong>.</p>
            <p>Para confirmar seu email e continuar o cadastro, clique no botão abaixo:</p>
            <p style="text-align: center;">
                <a href="{verification_url}" class="button">Confirmar Email</a>
            </p>
            <p><small>Ou copie e cole este link no navegador:<br>{verification_url}</small></p>
            <p><small>Este link expira em 48 horas.</small></p>
        </div>
        <div class="footer">
            <p>Se você não solicitou este cadastro, ignore este email.</p>
            <p>Equipe Agenda Músicos</p>
        </div>
    </div>
</body>
</html>
        """

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[pending.email],
            html_message=html_message,
            fail_silently=False,
        )


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

                # Cria organização pessoal para o novo músico
                org = Organization.objects.create(
                    name=f"Org de {pending.first_name}",
                    owner=user,
                    subscription_status='active',
                )

                # Adiciona como membro da organização
                Membership.objects.create(
                    user=user,
                    organization=org,
                    role='owner',
                    status='active',
                )

                # Atualiza músico com organização
                musician = user.musician_profile
                # Se quiser associar organização ao músico, faça aqui

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
        """Envia email de boas-vindas"""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

        subject = 'Bem-vindo à Agenda Músicos!'
        message = f"""
Olá {pending.first_name}!

Seu cadastro foi concluído com sucesso!

Agora você pode acessar a plataforma com suas credenciais:
- Usuário: {user.username}
- Link: {frontend_url}/login

Na Agenda Músicos você pode:
- Gerenciar seus shows e eventos
- Conectar-se com outros músicos
- Receber convites para tocar
- E muito mais!

Qualquer dúvida, estamos à disposição.

Bons shows!
Equipe Agenda Músicos
        """

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
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

        if not all([payment_token, stripe_customer_id, stripe_subscription_id, plan]):
            return Response(
                {'error': 'Missing required fields'},
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

                # Cria organização pessoal
                org = Organization.objects.create(
                    name=f"Org de {pending.first_name}",
                    owner=user,
                    subscription_status='active',
                )

                # Adiciona como membro owner
                Membership.objects.create(
                    user=user,
                    organization=org,
                    role='owner',
                    status='active',
                )

                # Salvar IDs do Stripe no Musician
                musician = user.musician_profile
                musician.stripe_customer_id = stripe_customer_id
                musician.stripe_subscription_id = stripe_subscription_id
                musician.subscription_plan = plan
                musician.subscription_status = 'active'
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

import secrets
import logging
from datetime import timedelta

from django.utils import timezone
from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import NotificationPreference, NotificationLog, TelegramVerification, NotificationChannel
from .serializers import (
    NotificationPreferenceSerializer,
    NotificationLogSerializer,
    TelegramConnectSerializer,
)
from .providers.telegram import TelegramProvider

logger = logging.getLogger(__name__)


class NotificationPreferenceView(APIView):
    """
    GET/PUT /api/notifications/preferences/
    Gerencia preferencias de notificacao do usuario logado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs)
        return Response(serializer.data)

    def put(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationLogListView(APIView):
    """
    GET /api/notifications/logs/
    Lista historico de notificacoes do usuario.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = NotificationLog.objects.filter(user=request.user)[:50]
        serializer = NotificationLogSerializer(logs, many=True)
        return Response(serializer.data)


class TelegramConnectView(APIView):
    """
    POST /api/notifications/telegram/connect/
    Inicia processo de conexao com Telegram.
    Retorna codigo de verificacao que usuario deve enviar ao bot.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Verifica se Telegram esta configurado
        provider = TelegramProvider()
        if not provider.is_configured():
            return Response(
                {'error': 'Telegram nao configurado no servidor'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Gera codigo unico de 6 caracteres
        code = secrets.token_hex(3).upper()  # Ex: "A1B2C3"

        # Remove verificacoes antigas nao usadas
        TelegramVerification.objects.filter(user=request.user, used=False).delete()

        # Cria nova verificacao
        verification = TelegramVerification.objects.create(
            user=request.user,
            verification_code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        bot_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', '@GigFlowAgendaBot')

        return Response({
            'code': code,
            'bot_username': bot_username,
            'expires_in_minutes': 10,
            'instructions': f"Envie o codigo {code} para {bot_username} no Telegram",
        })


class TelegramDisconnectView(APIView):
    """
    POST /api/notifications/telegram/disconnect/
    Desconecta Telegram da conta.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            prefs = request.user.notification_preferences
            prefs.telegram_chat_id = None
            prefs.telegram_verified = False

            # Se telegram era o canal preferido, volta para email
            if prefs.preferred_channel == NotificationChannel.TELEGRAM:
                prefs.preferred_channel = NotificationChannel.EMAIL

            prefs.save()

            return Response({
                'success': True,
                'message': 'Telegram desconectado com sucesso'
            })

        except NotificationPreference.DoesNotExist:
            return Response({
                'success': True,
                'message': 'Nenhuma conexao ativa'
            })


class TelegramStatusView(APIView):
    """
    GET /api/notifications/telegram/status/
    Verifica status da conexao Telegram (polling para frontend).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            prefs = request.user.notification_preferences
            connected = bool(prefs.telegram_chat_id and prefs.telegram_verified)
        except NotificationPreference.DoesNotExist:
            connected = False

        return Response({
            'connected': connected,
        })


class TelegramWebhookView(APIView):
    """
    POST /api/notifications/telegram/webhook/
    Recebe atualizacoes do Telegram Bot API.
    Processa mensagens de verificacao e comandos.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data

        # Extrai mensagem
        message = data.get('message', {})
        chat_id = str(message.get('chat', {}).get('id', ''))
        text = message.get('text', '').strip()
        username = message.get('from', {}).get('username', '')
        first_name = message.get('from', {}).get('first_name', '')

        if not chat_id:
            return Response({'ok': True})

        logger.info(f"Webhook Telegram: chat_id={chat_id}, text={text}")

        # Comandos especiais
        if text.upper() == '/START':
            self._send_welcome(chat_id)
            return Response({'ok': True})

        if text.upper() == '/STATUS':
            self._send_status(chat_id)
            return Response({'ok': True})

        # Tenta verificar codigo (6 caracteres hex)
        code = text.upper().strip()
        if len(code) == 6:
            self._try_verify_code(chat_id, code, first_name)
        else:
            # Mensagem nao e um codigo - verifica se chat esta conectado
            self._handle_unknown_message(chat_id, text)

        return Response({'ok': True})

    def _try_verify_code(self, chat_id: str, code: str, first_name: str):
        """Tenta verificar codigo de conexao"""
        verification = TelegramVerification.objects.filter(
            verification_code=code,
            used=False,
            expires_at__gt=timezone.now()
        ).first()

        provider = TelegramProvider()

        if verification:
            # Atualiza preferencias do usuario
            prefs, _ = NotificationPreference.objects.get_or_create(user=verification.user)
            prefs.telegram_chat_id = chat_id
            prefs.telegram_verified = True
            prefs.preferred_channel = NotificationChannel.TELEGRAM
            prefs.save()

            verification.used = True
            verification.save()

            logger.info(f"Usuario {verification.user.username} conectou Telegram (chat_id: {chat_id})")

            # Envia confirmacao
            name = first_name or verification.user.first_name or verification.user.username
            provider.send_message(
                chat_id,
                f"*Conta conectada com sucesso, {name}!*\n\n"
                f"Agora voce recebera notificacoes de:\n"
                f"- Convites para eventos\n"
                f"- Confirmacoes de shows\n"
                f"- Respostas de disponibilidade\n\n"
                f"Para desconectar, acesse o app em Configuracoes > Notificacoes."
            )
        else:
            # Codigo invalido ou expirado
            provider.send_message(
                chat_id,
                "Codigo invalido ou expirado.\n\n"
                "Para conectar sua conta:\n"
                "1. Acesse o app GigFlow\n"
                "2. Va em Configuracoes > Notificacoes\n"
                "3. Clique em 'Conectar Telegram'\n"
                "4. Envie o codigo gerado aqui"
            )

    def _send_welcome(self, chat_id: str):
        """Envia mensagem de boas-vindas"""
        provider = TelegramProvider()
        if provider.is_configured():
            provider.send_message(
                chat_id,
                "*Bem-vindo ao GigFlow - Agenda!*\n\n"
                "Para conectar sua conta e receber notificacoes:\n\n"
                "1. Acesse o app GigFlow\n"
                "2. Va em Configuracoes > Notificacoes\n"
                "3. Clique em 'Conectar Telegram'\n"
                "4. Envie o codigo de 6 caracteres aqui\n\n"
                "Comandos disponiveis:\n"
                "/start - Ver esta mensagem\n"
                "/status - Verificar status da conexao"
            )

    def _handle_unknown_message(self, chat_id: str, text: str):
        """Trata mensagens que nao sao codigos de verificacao"""
        provider = TelegramProvider()
        if not provider.is_configured():
            return

        # Verifica se chat_id ja esta conectado a alguma conta
        is_connected = NotificationPreference.objects.filter(
            telegram_chat_id=chat_id,
            telegram_verified=True
        ).exists()

        if is_connected:
            # Usuario conectado enviou mensagem desconhecida - nao faz nada
            # para nao ser intrusivo
            return

        # Chat nao conectado - envia instrucoes de como conectar
        provider.send_message(
            chat_id,
            "*Este chat nao esta conectado a nenhuma conta.*\n\n"
            "Para conectar e receber notificacoes:\n"
            "1. Acesse o app GigFlow\n"
            "2. Va em Configuracoes > Notificacoes\n"
            "3. Clique em 'Conectar Telegram'\n"
            "4. Envie o codigo de 6 caracteres aqui\n\n"
            "_Se ja tem um codigo, envie-o agora!_"
        )

    def _send_status(self, chat_id: str):
        """Envia status da conexao"""
        provider = TelegramProvider()
        if not provider.is_configured():
            return

        # Busca usuario conectado a este chat_id
        try:
            prefs = NotificationPreference.objects.get(
                telegram_chat_id=chat_id,
                telegram_verified=True
            )
            user = prefs.user
            name = user.get_full_name() or user.username

            provider.send_message(
                chat_id,
                f"*Status: Conectado*\n\n"
                f"Conta: {name}\n"
                f"Email: {user.email}\n\n"
                f"Voce esta recebendo notificacoes neste chat.\n\n"
                f"_Se precisar reconectar (ex: banco resetado), va em Configuracoes > Notificacoes no app e clique em 'Reconectar'._"
            )
        except NotificationPreference.DoesNotExist:
            provider.send_message(
                chat_id,
                "*Status: Nao conectado*\n\n"
                "Este chat nao esta vinculado a nenhuma conta.\n\n"
                "*Para conectar ou reconectar:*\n"
                "1. Acesse o app GigFlow\n"
                "2. Va em Configuracoes > Notificacoes\n"
                "3. Clique em 'Conectar Telegram' ou 'Reconectar'\n"
                "4. Envie o codigo de 6 caracteres aqui\n\n"
                "_Se voce ja tem um codigo, envie agora!_"
            )


class TestNotificationView(APIView):
    """
    POST /api/notifications/test/
    Envia notificacao de teste para o usuario logado.
    Apenas para debug em ambiente de desenvolvimento.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.DEBUG:
            return Response(
                {'error': 'Disponivel apenas em modo debug'},
                status=status.HTTP_403_FORBIDDEN
            )

        from .services.base import notification_service
        from .models import NotificationType

        channel = request.data.get('channel')  # Opcional: forca canal especifico

        result = notification_service.send_notification(
            user=request.user,
            notification_type=NotificationType.EVENT_INVITE,
            title="Teste de Notificacao",
            body="Esta e uma notificacao de teste do sistema GigFlow.\n\nSe voce recebeu esta mensagem, tudo esta funcionando!",
            data={
                'url': getattr(settings, 'FRONTEND_URL', 'http://localhost:5173'),
                'content_type': 'test',
            },
            force_channel=channel
        )

        return Response({
            'success': result.success,
            'error': result.error_message,
            'external_id': result.external_id,
        })

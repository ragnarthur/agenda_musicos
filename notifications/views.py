import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.http import HttpRequest
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from agenda.validators import sanitize_string

from .models import (
    NotificationChannel,
    NotificationLog,
    NotificationPreference,
    TelegramVerification,
)
from .providers.telegram import TelegramProvider
from .serializers import (
    NotificationLogSerializer,
    NotificationPreferenceSerializer,
    TelegramConnectSerializer,
    TelegramDisconnectSerializer,
)

logger = logging.getLogger(__name__)


class TelegramWebhookThrottle(AnonRateThrottle):
    """
    Throttle para proteger o webhook do Telegram contra flood/spam.
    Limita a 60 requisicoes por minuto (1 por segundo).
    """

    rate = "60/minute"


@method_decorator(csrf_exempt, name="dispatch")
class TelegramWebhookView(APIView):
    """
    POST /api/notifications/telegram/webhook/
    Recebe atualizacoes do Telegram Bot API.
    Processa mensagens de verificacao e comandos.
    """

    permission_classes = [AllowAny]
    throttle_classes = [TelegramWebhookThrottle]

    def post(self, request: HttpRequest):
        # Verificar secreto do Telegram (opcional, se configurado)
        telegram_webhook_secret = getattr(settings, "TELEGRAM_WEBHOOK_SECRET", "")

        if telegram_webhook_secret:
            provided_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
            if provided_secret != telegram_webhook_secret:
                logger.warning(
                    f"Webhook: token secreto inválido recebido: {provided_secret[:10]}..."
                )
                return Response({"error": "Unauthorized"}, status=401)

        data = request.data

        # Extrair mensagem
        message = data.get("message", {})
        chat_id = str(message.get("chat", {}).get("id", ""))
        text = (
            sanitize_string(message.get("text", ""), max_length=200, allow_empty=True)
            or ""
        )
        username = (
            sanitize_string(
                message.get("from", {}).get("username", ""),
                max_length=150,
                allow_empty=True,
            )
            or ""
        )
        first_name = (
            sanitize_string(
                message.get("from", {}).get("first_name", ""),
                max_length=150,
                allow_empty=True,
            )
            or ""
        )

        if not chat_id:
            return Response({"ok": True})

        logger.info(f"Webhook Telegram: chat_id={chat_id}, text={text}")

        # Comandos especiais
        if text.upper() == "/START":
            self._send_welcome(chat_id)
            return Response({"ok": True})

        if text.upper() == "/STATUS":
            self._send_status(chat_id)
            return Response({"ok": True})

        # Tenta verificar código (6 caracteres hex)
        code = text.upper().strip()
        if len(code) == 6:
            self._try_verify_code(chat_id, code, first_name)
        else:
            # Mensagem não é um código - verifica se chat está conectado
            self._handle_unknown_message(chat_id, text)

        return Response({"ok": True})

    def _try_verify_code(self, chat_id: str, code: str, first_name: str):
        """Tenta verificar codigo de conexao"""
        verification = TelegramVerification.objects.filter(
            verification_code=code, used=False, expires_at__gt=timezone.now()
        ).first()

        provider = TelegramProvider()

        if verification:
            # Atualiza preferencias do usuario
            prefs, _ = NotificationPreference.objects.get_or_create(
                user=verification.user
            )
            prefs.telegram_chat_id = chat_id
            prefs.telegram_verified = True
            prefs.preferred_channel = NotificationChannel.TELEGRAM
            prefs.save()

            verification.used = True
            verification.save()

            logger.info(
                f"Usuario {verification.user.username} conectou Telegram (chat_id: {chat_id})"
            )

            # Envia confirmacao
            name = (
                first_name or verification.user.first_name or verification.user.username
            )
            provider.send_message(
                chat_id,
                f"*Conta conectada com sucesso, {name}!*\n\n"
                f"Agora voce recebera notificacoes de:\n"
                f"- Convites para eventos\n"
                f"- Confirmacoes de shows\n"
                f"- Respostas de disponibilidade\n\n"
                f"Para desconectar, acesse o app em Configuracoes > Notificacoes.",
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
                "4. Envie o codigo gerado aqui",
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
                "/status - Verificar status da conexao",
            )

    def _handle_unknown_message(self, chat_id: str, text: str):
        """Trata mensagens que nao sao codigos de verificacao"""
        provider = TelegramProvider()
        if not provider.is_configured():
            return

        # Verifica se chat_id ja esta conectado a alguma conta
        is_connected = NotificationPreference.objects.filter(
            telegram_chat_id=chat_id, telegram_verified=True
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
            "_Se ja tem um codigo, envie-o agora!_",
        )

    def _send_status(self, chat_id: str):
        """Envia status da conexao"""
        provider = TelegramProvider()
        if not provider.is_configured():
            return

        # Busca usuario conectado a este chat_id
        try:
            prefs = NotificationPreference.objects.get(
                telegram_chat_id=chat_id, telegram_verified=True
            )
            user = prefs.user
            name = user.get_full_name() or user.username

            provider.send_message(
                chat_id,
                f"*Status: Conectado*\n\n"
                f"Conta: {name}\n"
                f"Email: {user.email}\n\n"
                f"Voce esta recebendo notificacoes neste chat.\n\n"
                f"_Se precisar reconectar (ex: banco resetado), va em Configuracoes > Notificacoes no app e clique em 'Reconectar'._",
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
                "_Se voce ja tem um codigo, envie agora!_",
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
                {"detail": "Disponivel apenas em modo debug"},
                status=status.HTTP_403_FORBIDDEN,
            )

        from .models import NotificationType
        from .services.base import notification_service

        channel = request.data.get("channel")  # Opcional: forca canal especifico

        result = notification_service.send_notification(
            user=request.user,
            notification_type=NotificationType.EVENT_INVITE,
            title="Teste de Notificacao",
            body="Esta e uma notificacao de teste do sistema GigFlow.\n\nSe voce recebeu esta mensagem, tudo esta funcionando!",
            data={
                "url": getattr(settings, "FRONTEND_URL", "http://localhost:5173"),
                "content_type": "test",
            },
            force_channel=channel,
        )

        return Response(
            {
                "success": result.success,
                "detail": result.error_message,
                "external_id": result.external_id,
            }
        )


class NotificationPreferenceView(APIView):
    """
    GET/PUT/PATCH /api/notifications/preferences/
    Retorna e atualiza preferencias de notificacao do usuario logado.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs)
        return Response(serializer.data)

    def put(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(
            prefs, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class NotificationLogListView(APIView):
    """
    GET /api/notifications/logs/
    Lista historico de notificacoes do usuario logado.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit_raw = request.query_params.get("limit", "50")
        try:
            limit = max(1, min(int(limit_raw), 200))
        except (TypeError, ValueError):
            limit = 50

        logs = NotificationLog.objects.filter(user=request.user).order_by("-created_at")[
            :limit
        ]
        serializer = NotificationLogSerializer(logs, many=True)
        return Response(serializer.data)


class TelegramConnectView(APIView):
    """
    POST /api/notifications/telegram/connect/
    Gera codigo de verificacao para conectar Telegram.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        provider = TelegramProvider()
        if not provider.is_configured():
            return Response(
                {"detail": "Telegram nao configurado."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Invalida codigos antigos
        TelegramVerification.objects.filter(user=request.user, used=False).update(
            used=True
        )

        code = None
        for _ in range(5):
            candidate = secrets.token_hex(3).upper()
            if not TelegramVerification.objects.filter(
                verification_code=candidate
            ).exists():
                code = candidate
                break

        if not code:
            return Response(
                {"detail": "Nao foi possivel gerar codigo."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        expires_in = 10
        TelegramVerification.objects.create(
            user=request.user,
            verification_code=code,
            expires_at=timezone.now() + timedelta(minutes=expires_in),
        )

        bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", "") or ""
        if bot_username and not bot_username.startswith("@"):
            bot_username = f"@{bot_username}"

        instructions = (
            "Abra o Telegram, procure pelo bot e envie o codigo abaixo.\n"
            "Se nao conseguir encontrar, use o username do bot indicado."
        )

        payload = {
            "code": code,
            "bot_username": bot_username,
            "expires_in_minutes": expires_in,
            "instructions": instructions,
        }
        serializer = TelegramConnectSerializer(payload)
        return Response(serializer.data)


class TelegramDisconnectView(APIView):
    """
    POST /api/notifications/telegram/disconnect/
    Desconecta Telegram do usuario logado.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        prefs.telegram_chat_id = None
        prefs.telegram_verified = False
        if prefs.preferred_channel == NotificationChannel.TELEGRAM:
            prefs.preferred_channel = NotificationChannel.EMAIL
        prefs.save()

        TelegramVerification.objects.filter(user=request.user, used=False).update(
            used=True
        )

        payload = {"success": True, "message": "Telegram desconectado."}
        serializer = TelegramDisconnectSerializer(payload)
        return Response(serializer.data)


class TelegramStatusView(APIView):
    """
    GET /api/notifications/telegram/status/
    Retorna status de conexao do Telegram.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        connected = bool(prefs.telegram_chat_id and prefs.telegram_verified)
        return Response({"connected": connected})

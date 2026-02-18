"""
Servico de notificacoes para Quote Requests.

Envia notificacoes via Email (sempre) e Telegram (se configurado pelo usuario).
"""

import logging

from django.conf import settings

from notifications.models import NotificationType
from notifications.services.base import notification_service
from notifications.services.email_service import (
    send_booking_confirmed_email,
    send_new_quote_request_email,
    send_proposal_received_email,
    send_reservation_email,
)

logger = logging.getLogger(__name__)


def notify_new_quote_request(quote_request):
    """
    Notifica musico sobre novo pedido de orcamento (Email + Telegram).

    Args:
        quote_request: QuoteRequest object
    """
    musician = quote_request.musician
    contractor = quote_request.contractor
    user = musician.user

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    quote_url = f"{frontend_url}/musicos/pedidos/{quote_request.id}"
    location = f"{quote_request.location_city}, {quote_request.location_state}"
    event_date = quote_request.event_date.strftime("%d/%m/%Y")

    # Email via funcao dedicada (mantem template especifico)
    try:
        send_new_quote_request_email(
            to_email=user.email,
            musician_name=user.first_name,
            contractor_name=contractor.name,
            event_type=quote_request.event_type,
            event_date=event_date,
            location=location,
            quote_url=quote_url,
        )
        logger.info("Email de novo pedido enviado para %s", user.email)
    except Exception as e:
        logger.error("Erro ao enviar email de novo pedido: %s", e)

    # Telegram via notification_service (se usuario preferir)
    try:
        prefs = getattr(user, "notification_preferences", None)
        if prefs and prefs.telegram_verified and prefs.preferred_channel == "telegram":
            title = "Novo pedido de orcamento"
            body = (
                f"{contractor.name} enviou um pedido de orcamento.\n\n"
                f"📋 Detalhes\n"
                f" • Evento: {quote_request.event_type}\n"
                f" • Data: {event_date}\n"
                f" • Local: {location}\n\n"
                f"Acesse o app para enviar sua proposta."
            )
            notification_service.send_notification(
                user=user,
                notification_type=NotificationType.QUOTE_REQUEST_NEW,
                title=title,
                body=body,
                data={
                    "url": quote_url,
                    "content_type": "quote_request",
                    "object_id": quote_request.id,
                },
                force_channel="telegram",
            )
            logger.info("Telegram de novo pedido enviado para %s", user.username)
    except Exception as e:
        logger.error("Erro ao enviar Telegram de novo pedido: %s", e)


def notify_proposal_received(quote_request, proposal):
    """
    Notifica contratante sobre proposta recebida (Email + Telegram).

    Args:
        quote_request: QuoteRequest object
        proposal: QuoteProposal object
    """
    contractor = quote_request.contractor
    musician = quote_request.musician
    user = contractor.user

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    quote_url = f"{frontend_url}/contratante/pedidos/{quote_request.id}"
    musician_name = f"{musician.user.first_name} {musician.user.last_name}".strip()

    # Email
    try:
        send_proposal_received_email(
            to_email=user.email,
            contractor_name=contractor.name,
            musician_name=musician_name,
            event_type=quote_request.event_type,
            proposed_value=str(proposal.proposed_value) if proposal.proposed_value else None,
            quote_url=quote_url,
        )
        logger.info("Email de proposta enviado para %s", user.email)
    except Exception as e:
        logger.error("Erro ao enviar email de proposta: %s", e)

    # Telegram
    try:
        prefs = getattr(user, "notification_preferences", None)
        if prefs and prefs.telegram_verified and prefs.preferred_channel == "telegram":
            title = "Nova proposta recebida"
            value_text = (
                f"R$ {proposal.proposed_value}" if proposal.proposed_value else "A combinar"
            )
            body = (
                f"{musician_name} enviou uma proposta.\n\n"
                f"💰 Proposta\n"
                f" • Evento: {quote_request.event_type}\n"
                f" • Valor proposto: {value_text}\n\n"
                f"Acesse o app para aceitar ou recusar."
            )
            notification_service.send_notification(
                user=user,
                notification_type=NotificationType.QUOTE_PROPOSAL_RECEIVED,
                title=title,
                body=body,
                data={
                    "url": quote_url,
                    "content_type": "quote_proposal",
                    "object_id": proposal.id,
                },
                force_channel="telegram",
            )
            logger.info("Telegram de proposta enviado para %s", user.username)
    except Exception as e:
        logger.error("Erro ao enviar Telegram de proposta: %s", e)


def notify_reservation_created(quote_request):
    """
    Notifica musico sobre reserva criada (Email + Telegram).

    Args:
        quote_request: QuoteRequest object
    """
    musician = quote_request.musician
    contractor = quote_request.contractor
    user = musician.user

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    quote_url = f"{frontend_url}/musicos/pedidos/{quote_request.id}"
    location = f"{quote_request.location_city}, {quote_request.location_state}"
    event_date = quote_request.event_date.strftime("%d/%m/%Y")

    # Email
    try:
        send_reservation_email(
            to_email=user.email,
            musician_name=user.first_name,
            contractor_name=contractor.name,
            event_type=quote_request.event_type,
            event_date=event_date,
            location=location,
            quote_url=quote_url,
        )
        logger.info("Email de reserva enviado para %s", user.email)
    except Exception as e:
        logger.error("Erro ao enviar email de reserva: %s", e)

    # Telegram
    try:
        prefs = getattr(user, "notification_preferences", None)
        if prefs and prefs.telegram_verified and prefs.preferred_channel == "telegram":
            title = "Proposta aceita! Reserva criada"
            body = (
                f"{contractor.name} aceitou sua proposta!\n\n"
                f"📋 Detalhes da reserva\n"
                f" • Evento: {quote_request.event_type}\n"
                f" • Data: {event_date}\n"
                f" • Local: {location}\n\n"
                f"⚡ ACAO NECESSARIA: Confirme a reserva no app."
            )
            notification_service.send_notification(
                user=user,
                notification_type=NotificationType.QUOTE_RESERVATION_CREATED,
                title=title,
                body=body,
                data={
                    "url": quote_url,
                    "content_type": "quote_request",
                    "object_id": quote_request.id,
                },
                force_channel="telegram",
            )
            logger.info("Telegram de reserva enviado para %s", user.username)
    except Exception as e:
        logger.error("Erro ao enviar Telegram de reserva: %s", e)


def notify_booking_confirmed(quote_request):
    """
    Notifica contratante sobre booking confirmado (Email + Telegram).

    Args:
        quote_request: QuoteRequest object
    """
    contractor = quote_request.contractor
    musician = quote_request.musician
    user = contractor.user

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    quote_url = f"{frontend_url}/contratante/pedidos/{quote_request.id}"
    location = f"{quote_request.location_city}, {quote_request.location_state}"
    event_date = quote_request.event_date.strftime("%d/%m/%Y")
    musician_name = f"{musician.user.first_name} {musician.user.last_name}".strip()

    # Email
    try:
        send_booking_confirmed_email(
            to_email=user.email,
            contractor_name=contractor.name,
            musician_name=musician_name,
            event_type=quote_request.event_type,
            event_date=event_date,
            location=location,
            quote_url=quote_url,
        )
        logger.info("Email de confirmacao enviado para %s", user.email)
    except Exception as e:
        logger.error("Erro ao enviar email de confirmacao: %s", e)

    # Telegram
    try:
        prefs = getattr(user, "notification_preferences", None)
        if prefs and prefs.telegram_verified and prefs.preferred_channel == "telegram":
            title = "Reserva confirmada!"
            body = (
                f"🎉 {musician_name} confirmou a reserva!\n\n"
                f"📋 Detalhes do evento\n"
                f" • Evento: {quote_request.event_type}\n"
                f" • Data: {event_date}\n"
                f" • Local: {location}\n\n"
                f"Tudo certo! Agora e so aguardar o dia do evento."
            )
            notification_service.send_notification(
                user=user,
                notification_type=NotificationType.QUOTE_BOOKING_CONFIRMED,
                title=title,
                body=body,
                data={
                    "url": quote_url,
                    "content_type": "booking",
                    "object_id": quote_request.id,
                },
                force_channel="telegram",
            )
            logger.info("Telegram de confirmacao enviado para %s", user.username)
    except Exception as e:
        logger.error("Erro ao enviar Telegram de confirmacao: %s", e)

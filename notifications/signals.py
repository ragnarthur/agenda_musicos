import logging
from django.conf import settings
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from agenda.models import Availability, Event

logger = logging.getLogger(__name__)


# Guarda status anterior do evento para detectar mudancas
_event_previous_status = {}

def _format_relative_day(event_date):
    """Retorna um texto relativo para a data do evento."""
    if not event_date:
        return ''

    today = timezone.localdate()
    delta = (event_date - today).days

    if delta == 0:
        return 'hoje'
    if delta == 1:
        return 'amanha'
    if delta > 1:
        return f'em {delta} dias'
    if delta == -1:
        return 'ontem'
    if delta < -1:
        return f'ha {abs(delta)} dias'
    return ''

def _format_event_lines(event):
    """Monta linhas padronizadas do evento para notificacoes."""
    event_date = event.event_date.strftime('%d/%m/%Y')
    start_time = event.start_time.strftime('%H:%M') if event.start_time else '--:--'
    end_time = event.end_time.strftime('%H:%M') if event.end_time else '--:--'
    relative = _format_relative_day(event.event_date)
    date_label = f"{event_date} ({relative})" if relative else event_date

    lines = [
        f"- Data: {date_label}",
        f"- Horario: {start_time} - {end_time}",
        f"- Local: {event.location}",
    ]
    return lines

@receiver(pre_save, sender=Event)
def store_previous_event_status(sender, instance, **kwargs):
    """Guarda status anterior para detectar mudanca para 'confirmed'"""
    if instance.pk:
        try:
            old = Event.objects.get(pk=instance.pk)
            _event_previous_status[instance.pk] = old.status
        except Event.DoesNotExist:
            pass


@receiver(post_save, sender=Availability)
def notify_on_availability_created(sender, instance, created, **kwargs):
    """
    Envia notificacao quando um musico e convidado para um evento.
    Dispara apenas na criacao (created=True) e quando response='pending'.
    """
    if not created:
        return

    if instance.response != 'pending':
        return

    # Nao notifica o proprio criador do evento
    event = instance.event
    if event.created_by and instance.musician.user == event.created_by:
        return

    user = instance.musician.user

    # Import aqui para evitar circular import
    from notifications.models import NotificationType
    from notifications.services.base import notification_service

    # Monta URL do evento
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    event_url = f"{frontend_url}/eventos/{event.id}"

    # Nome de quem convidou
    inviter_name = ''
    if event.created_by:
        inviter_name = event.created_by.get_full_name() or event.created_by.username

    title = f"Convite para show: {event.title}"
    event_lines = _format_event_lines(event)
    event_lines_text = "\n".join(event_lines)
    event_date = event.event_date.strftime('%d/%m/%Y')
    body = (
        f"Voce recebeu um convite para tocar.\n\n"
        f"Resumo do evento\n"
        f"{event_lines_text}\n"
    )

    if inviter_name:
        body += f"- Convidado por: {inviter_name}\n"

    body += "\nStatus: aguardando sua resposta.\nAbra o app para confirmar sua disponibilidade."

    try:
        notification_service.send_notification(
            user=user,
            notification_type=NotificationType.EVENT_INVITE,
            title=title,
            body=body,
            data={
                'content_type': 'event',
                'object_id': event.id,
                'url': event_url,
                'event_title': event.title,
                'event_date': event_date,
            }
        )
        logger.info(f"Notificacao de convite enviada para {user.username}")
    except Exception as e:
        logger.error(f"Erro ao enviar notificacao de convite: {e}")


@receiver(post_save, sender=Availability)
def notify_on_availability_response(sender, instance, created, **kwargs):
    """
    Notifica o criador do evento quando um musico responde ao convite.
    """
    if created:
        return  # Ignora criacao

    if instance.response == 'pending':
        return  # Ignora se ainda pendente

    event = instance.event
    if not event.created_by:
        return

    # Nao notifica se o proprio criador respondeu
    if instance.musician.user == event.created_by:
        return

    from notifications.models import NotificationType
    from notifications.services.base import notification_service

    user = event.created_by
    musician_name = instance.musician.user.get_full_name() or instance.musician.user.username

    response_labels = {
        'available': 'confirmou presenca',
        'unavailable': 'nao podera comparecer',
        'maybe': 'ainda esta em duvida',
    }

    response_text = response_labels.get(instance.response, 'respondeu')

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    event_url = f"{frontend_url}/eventos/{event.id}"

    title = f"Resposta recebida: {event.title}"
    event_lines = _format_event_lines(event)
    event_lines_text = "\n".join(event_lines)
    body = (
        f"{musician_name} {response_text}.\n\n"
        f"Resumo do evento\n"
        f"{event_lines_text}\n\n"
        f"Acesse o app para acompanhar o status."
    )

    try:
        notification_service.send_notification(
            user=user,
            notification_type=NotificationType.AVAILABILITY_RESPONSE,
            title=title,
            body=body,
            data={
                'content_type': 'availability',
                'object_id': instance.id,
                'url': event_url,
                'musician_name': musician_name,
                'response': instance.response,
            }
        )
        logger.info(f"Notificacao de resposta enviada para {user.username}")
    except Exception as e:
        logger.error(f"Erro ao enviar notificacao de resposta: {e}")


@receiver(post_save, sender=Event)
def notify_on_event_confirmed(sender, instance, created, **kwargs):
    """
    Notifica todos os participantes quando evento e confirmado.
    """
    if created:
        return

    # Verifica se status mudou para 'confirmed'
    previous_status = _event_previous_status.pop(instance.pk, None)
    if previous_status == instance.status:
        return  # Status nao mudou

    if instance.status != 'confirmed':
        return

    from notifications.models import NotificationType
    from notifications.services.base import notification_service

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    event_url = f"{frontend_url}/eventos/{instance.id}"
    title = f"Evento confirmado: {instance.title}"
    event_lines = _format_event_lines(instance)
    event_lines_text = "\n".join(event_lines)
    body = (
        f"O evento foi confirmado.\n\n"
        f"Resumo do evento\n"
        f"{event_lines_text}\n\n"
        f"Equipe confirmada. Nos vemos la!"
    )

    # Notifica todos os musicos que aceitaram
    for availability in instance.availabilities.filter(response='available'):
        user = availability.musician.user

        try:
            notification_service.send_notification(
                user=user,
                notification_type=NotificationType.EVENT_CONFIRMED,
                title=title,
                body=body,
                data={
                    'content_type': 'event',
                    'object_id': instance.id,
                    'url': event_url,
                }
            )
            logger.info(f"Notificacao de confirmacao enviada para {user.username}")
        except Exception as e:
            logger.error(f"Erro ao notificar {user.username}: {e}")


@receiver(post_save, sender=Event)
def notify_on_event_cancelled(sender, instance, created, **kwargs):
    """
    Notifica todos os participantes quando evento e cancelado.
    """
    if created:
        return

    previous_status = _event_previous_status.get(instance.pk)
    if previous_status == instance.status:
        return

    if instance.status != 'cancelled':
        return

    from notifications.models import NotificationType
    from notifications.services.base import notification_service

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    title = f"Evento cancelado: {instance.title}"
    event_lines = _format_event_lines(instance)
    event_lines_text = "\n".join(event_lines)
    body = (
        f"O evento foi cancelado.\n\n"
        f"Resumo do evento\n"
        f"{event_lines_text}\n\n"
        f"Se precisar, voce pode reagendar uma nova data."
    )

    # Notifica todos os musicos envolvidos (exceto quem cancelou)
    for availability in instance.availabilities.all():
        user = availability.musician.user

        # Nao notifica quem cancelou
        if instance.created_by and user == instance.created_by:
            continue

        try:
            notification_service.send_notification(
                user=user,
                notification_type=NotificationType.EVENT_CANCELLED,
                title=title,
                body=body,
                data={
                    'content_type': 'event',
                    'object_id': instance.id,
                }
            )
            logger.info(f"Notificacao de cancelamento enviada para {user.username}")
        except Exception as e:
            logger.error(f"Erro ao notificar {user.username}: {e}")

import logging
import unicodedata
from decimal import Decimal

from django.conf import settings

from notifications.models import NotificationPreference, NotificationType
from notifications.services.base import notification_service
from notifications.services.email_service import send_event_notification_email

logger = logging.getLogger(__name__)


def _frontend_marketplace_url(gig_id: int | None = None) -> str:
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    if gig_id:
        return f"{frontend_url}/marketplace#gig-{gig_id}"
    return f"{frontend_url}/marketplace"


def _format_fee(amount: Decimal | None) -> str:
    if amount is None:
        return "A combinar"
    return f"R$ {amount:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def _can_notify(user) -> tuple[bool, NotificationPreference]:
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    return prefs.notify_quote_requests, prefs


def _notify_user(
    user,
    *,
    title: str,
    body: str,
    gig_id: int,
    object_id: int | None = None,
    include_email: bool = True,
    include_telegram: bool = True,
) -> None:
    can_notify, prefs = _can_notify(user)
    if not can_notify:
        return

    url = _frontend_marketplace_url(gig_id)

    if include_email and user.email:
        try:
            send_event_notification_email(
                to_email=user.email,
                template_name="notification",
                subject=title,
                context={
                    "title": title,
                    "body": body,
                    "first_name": user.first_name or user.username,
                    "action_url": url,
                    "action_text": "Abrir Vagas",
                    "preview_text": title,
                },
            )
        except Exception as exc:
            logger.error("Erro ao enviar email de marketplace para %s: %s", user.username, exc)

    if include_telegram and prefs.telegram_verified and prefs.telegram_chat_id:
        try:
            notification_service.send_notification(
                user=user,
                notification_type=NotificationType.MARKETPLACE_ACTIVITY,
                title=title,
                body=body,
                data={
                    "url": url,
                    "content_type": "marketplace_gig",
                    "object_id": object_id or gig_id,
                },
                force_channel="telegram",
            )
        except Exception as exc:
            logger.error("Erro ao enviar Telegram de marketplace para %s: %s", user.username, exc)


def _extract_city_name(raw_city: str | None) -> str:
    """
    Extrai o nome base da cidade para matching.
    Exemplos:
    - "Uberlandia/MG" -> "Uberlandia"
    - "Uberlandia, MG" -> "Uberlandia"
    - "Uberlandia - MG" -> "Uberlandia"
    """
    if not raw_city:
        return ""
    city = str(raw_city).strip()
    if not city:
        return ""
    # Common UI formats: "Cidade/UF", "Cidade, UF", "Cidade - UF"
    for sep in ("/", ","):
        if sep in city:
            city = city.split(sep, 1)[0].strip()
    if " - " in city:
        city = city.split(" - ", 1)[0].strip()
    return city


def _normalize_city_key(value: str) -> str:
    """
    Normaliza string para comparação tolerante (acentos/espacos/caixa).
    """
    value = (value or "").strip().lower()
    if not value:
        return ""
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = " ".join(value.split())
    return value


def notify_new_gig_in_city(gig_id: int) -> None:
    """
    Notifica músicos quando surge uma nova vaga na cidade deles.

    Regras:
    - Email sempre (se houver email), Telegram apenas se o usuário estiver conectado/verificado.
    - Respeita preferências do usuário (notify_quote_requests).
    - Não notifica o criador da vaga.
    """
    try:
        from agenda.models import Musician
        from marketplace.models import Gig  # Import local para evitar ciclo
    except Exception:
        logger.exception("Falha ao importar modelos para notificar nova vaga.")
        return

    gig = (
        Gig.objects.select_related("created_by")
        .only(
            "id",
            "title",
            "city",
            "location",
            "event_date",
            "start_time",
            "end_time",
            "budget",
            "created_by_id",
        )
        .filter(id=gig_id)
        .first()
    )
    if not gig:
        return

    city_raw = (gig.city or "").strip()
    if not city_raw:
        return

    city_name = _extract_city_name(city_raw)
    city_key = _normalize_city_key(city_name)
    if not city_key:
        return

    # Busca candidatos por match simples de cidade; o matching "tolerante" final e feito em Python.
    musicians = (
        Musician.objects.select_related("user")
        .filter(is_active=True)
        .exclude(user_id=gig.created_by_id)
        .exclude(city__isnull=True)
        .exclude(city__exact="")
    )

    # Limita o universo ao que o DB consegue filtrar bem (performance).
    # - cidade exatamente igual (case-insensitive)
    # - ou cidade começando com o nome (cobre formatos como "Cidade/UF")
    musicians = musicians.filter(city__istartswith=city_name)

    # Comparacao final tolerante (ex: "São Paulo" vs "Sao Paulo")
    recipients = []
    for musician in musicians:
        m_city_key = _normalize_city_key(_extract_city_name(musician.city))
        if m_city_key == city_key:
            recipients.append(musician.user)

    if not recipients:
        return

    title = f"Nova vaga em {city_name}: {gig.title}"
    date_text = gig.event_date.strftime("%d/%m/%Y") if gig.event_date else "A combinar"
    time_text = ""
    if gig.start_time and gig.end_time:
        time_text = f"{gig.start_time.strftime('%H:%M')} - {gig.end_time.strftime('%H:%M')}"
    elif gig.start_time:
        time_text = gig.start_time.strftime("%H:%M")
    else:
        time_text = "A combinar"

    body = (
        f"Uma nova vaga foi publicada na sua cidade.\n\n"
        f"📋 Detalhes da vaga\n"
        f" • Vaga: {gig.title}\n"
        f" • Cidade: {city_raw}\n"
        f" • Data: {date_text}\n"
        f" • Horario: {time_text}\n"
        f" • Local: {gig.location or 'A combinar'}\n"
        f" • Cache: {_format_fee(gig.budget)}\n\n"
        f"Abra o app para ver os detalhes e se candidatar."
    )

    for user in recipients:
        _notify_user(
            user,
            title=title,
            body=body,
            gig_id=gig.id,
            object_id=gig.id,
        )


def notify_gig_application_created(gig, application) -> None:
    """Notifica criador da vaga e músico candidato sobre nova candidatura."""
    musician_user = application.musician.user
    musician_name = musician_user.get_full_name() or musician_user.username
    fee_text = _format_fee(application.expected_fee)

    if gig.created_by and gig.created_by_id != musician_user.id:
        owner_title = f"Nova candidatura na vaga: {gig.title}"
        owner_body = (
            f"{musician_name} enviou uma candidatura.\n\n"
            f"📋 Detalhes\n"
            f" • Cache proposto: {fee_text}\n"
            f" • Status: ⏳ aguardando sua analise\n\n"
            f"Abra o app para revisar a proposta e decidir a contratacao."
        )
        _notify_user(
            gig.created_by,
            title=owner_title,
            body=owner_body,
            gig_id=gig.id,
            object_id=application.id,
        )

    musician_title = f"Candidatura enviada: {gig.title}"
    musician_body = (
        f"Sua candidatura foi enviada com sucesso.\n\n"
        f"📋 Detalhes\n"
        f" • Cache informado: {fee_text}\n"
        f" • Status atual: ⏳ Pendente\n\n"
        f"Voce sera notificado quando houver atualizacao do criador da vaga."
    )
    _notify_user(
        musician_user,
        title=musician_title,
        body=musician_body,
        gig_id=gig.id,
        object_id=application.id,
    )


def notify_gig_hire_result(gig, hired_applications, rejected_applications) -> None:
    """Notifica todos os envolvidos após contratação em uma vaga."""
    for hired_application in hired_applications:
        hired_user = hired_application.musician.user
        hired_title = f"Parabens! Voce foi contratado: {gig.title}"
        hired_body = (
            f"🎉 Sua candidatura foi aprovada!\n\n"
            f"📋 Detalhes\n"
            f" • Cache aprovado: {_format_fee(hired_application.expected_fee)}\n"
            f" • Status atual: ✅ Contratado\n\n"
            f"Abra o app para visualizar os detalhes de contato do contratante."
        )
        _notify_user(
            hired_user,
            title=hired_title,
            body=hired_body,
            gig_id=gig.id,
            object_id=hired_application.id,
        )

    for application in rejected_applications:
        rejected_user = application.musician.user
        rejected_title = f"Atualizacao da vaga: {gig.title}"
        rejected_body = (
            f"A vaga foi preenchida com outro musico.\n\n"
            f" • Status da sua candidatura: ❌ Recusada\n\n"
            f"Continue acompanhando novas vagas no marketplace."
        )
        _notify_user(
            rejected_user,
            title=rejected_title,
            body=rejected_body,
            gig_id=gig.id,
            object_id=application.id,
        )

    if gig.created_by:
        owner_title = f"Contratacao concluida: {gig.title}"
        hired_names = [
            app.musician.user.get_full_name() or app.musician.user.username
            for app in hired_applications
        ]
        owner_names_text = ", ".join(hired_names)
        owner_body = (
            f"Voce concluiu a contratacao da vaga.\n\n"
            f"📋 Resumo\n"
            f" • Musicos contratados: {owner_names_text}\n"
            f" • Candidaturas recusadas: {len(rejected_applications)}\n\n"
            f"Todas as partes foram notificadas."
        )
        _notify_user(
            gig.created_by,
            title=owner_title,
            body=owner_body,
            gig_id=gig.id,
            object_id=gig.id,
        )


def notify_gig_chat_message(gig, chat_message, recipients) -> None:
    """Notifica os envolvidos quando há nova mensagem no chat da contratação."""
    sender_name = chat_message.sender.get_full_name() or chat_message.sender.username
    preview = chat_message.message
    if len(preview) > 140:
        preview = f"{preview[:137]}..."

    title = f"Nova mensagem no chat: {gig.title}"
    body = (
        f"💬 {sender_name} enviou uma nova mensagem.\n\n"
        f'"{preview}"\n\n'
        "Abra o app para responder no chat da contratacao."
    )

    for user in recipients:
        _notify_user(
            user,
            title=title,
            body=body,
            gig_id=gig.id,
            object_id=chat_message.id,
            include_email=False,
            include_telegram=True,
        )


def notify_gig_closed(gig, closed_status: str, affected_applications) -> None:
    """Notifica candidatos afetados quando vaga é encerrada/cancelada."""
    status_label = "encerrada" if closed_status == "closed" else "cancelada"

    for application in affected_applications:
        musician_user = application.musician.user
        title = f"Vaga {status_label}: {gig.title}"
        body = (
            f"⚠️ A vaga foi {status_label} pelo criador.\n\n"
            f" • Status da sua candidatura: ❌ Recusada\n\n"
            f"Acompanhe novas oportunidades no marketplace."
        )
        _notify_user(
            musician_user,
            title=title,
            body=body,
            gig_id=gig.id,
            object_id=application.id,
        )

    if gig.created_by:
        owner_title = f"Vaga {status_label}: {gig.title}"
        owner_body = (
            f"A vaga foi marcada como {status_label}.\n\n"
            f"📋 Resumo\n"
            f" • Candidaturas impactadas: {len(affected_applications)}\n\n"
            f"Os candidatos afetados foram notificados."
        )
        _notify_user(
            gig.created_by,
            title=owner_title,
            body=owner_body,
            gig_id=gig.id,
            object_id=gig.id,
        )

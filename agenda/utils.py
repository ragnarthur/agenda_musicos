# agenda/utils.py
"""
Funções utilitárias compartilhadas para o app agenda.
"""
from datetime import timedelta
from django.utils import timezone


def split_availability_with_events(availability, events, LeaderAvailabilityModel):
    """
    Divide uma disponibilidade removendo os intervalos ocupados por eventos.
    Cria novos slots com as sobras, desativando a disponibilidade original.

    Args:
        availability: Instância de LeaderAvailability a ser dividida
        events: QuerySet ou lista de eventos que conflitam
        LeaderAvailabilityModel: Classe do modelo LeaderAvailability

    Returns:
        Lista de novas disponibilidades criadas (pode ser vazia)
    """
    if not events:
        return []

    tz = timezone.get_current_timezone()
    start = availability.start_datetime
    end = availability.end_datetime
    buffer = timedelta(minutes=40)

    # Ordena eventos por início
    events = sorted(events, key=lambda e: e.start_datetime)

    new_slots = []
    cursor = start

    for ev in events:
        ev_start = ev.start_datetime - buffer
        ev_end = ev.end_datetime + buffer

        # Se há espaço antes do evento, cria slot
        if ev_start > cursor:
            new_slots.append((cursor, min(ev_start, end)))

        # Move cursor após o evento
        if ev_end > cursor:
            cursor = max(cursor, ev_end)

    # Sobra final
    if cursor < end:
        new_slots.append((cursor, end))

    # Desativa disponibilidade original
    availability.is_active = False
    availability.save(update_fields=['is_active'])

    # Cria novas disponibilidades com as sobras
    objs = []
    now = timezone.now()

    for slot_start, slot_end in new_slots:
        if slot_end <= slot_start:
            continue

        # Preenche todos os campos para evitar problemas com bulk_create
        # bulk_create não preenche auto_now/auto_now_add automaticamente
        date_value = slot_start.astimezone(tz).date()
        start_time = slot_start.astimezone(tz).time()
        end_time = slot_end.astimezone(tz).time()

        objs.append(
            LeaderAvailabilityModel(
                leader=availability.leader,
                date=date_value,
                start_time=start_time,
                end_time=end_time,
                start_datetime=slot_start,
                end_datetime=slot_end,
                notes=availability.notes,
                created_at=now,
                updated_at=now,
            )
        )

    if objs:
        LeaderAvailabilityModel.objects.bulk_create(objs)

    return objs


def get_user_organization(user):
    """
    Retorna a organização do usuário (primeira membership ativa) ou a organização do perfil de músico.

    Args:
        user: Instância do User

    Returns:
        Organization ou None
    """
    from .models import Musician, Membership

    membership = Membership.objects.filter(
        user=user, status='active'
    ).select_related('organization').first()

    if membership:
        return membership.organization

    try:
        musician = user.musician_profile
        return musician.organization
    except Musician.DoesNotExist:
        return None

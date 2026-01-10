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
                organization=availability.organization,
                date=date_value,
                start_time=start_time,
                end_time=end_time,
                start_datetime=slot_start,
                end_datetime=slot_end,
                notes=availability.notes,
                is_public=availability.is_public,
                is_active=True,
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


def award_badges_for_musician(musician):
    """
    Avalia critérios e atribui badges para um músico.
    Retorna lista de MusicianBadge recém-criadas.
    Usa get_or_create com tratamento de IntegrityError para evitar race conditions.
    """
    from .models import MusicianBadge, Availability, Connection
    from django.db import IntegrityError

    awarded = []
    now = timezone.now()
    today = now.date()
    last_30 = today - timedelta(days=30)

    # Eventos tocados (disponível)
    played_events = Availability.objects.filter(
        musician=musician,
        response='available',
        event__event_date__lte=today
    )
    total_played = played_events.count()

    played_last_30 = played_events.filter(event__event_date__gte=last_30).count()

    # Conexões
    connections_count = Connection.objects.filter(follower=musician).count()

    # Definições de badges
    badges_def = [
        ('first_show', '🎸 Primeiro Show', 'Completou o primeiro evento', total_played >= 1),
        ('five_stars', '⭐ 5 Estrelas', 'Manteve média 5.0', musician.average_rating == 5 and musician.total_ratings >= 5),
        ('hot_month', '🔥 Em Alta', '10 shows no último mês', played_last_30 >= 10),
        ('top_musician', '👑 Top Músico', 'Destaque pela avaliação', musician.total_ratings >= 10 and musician.average_rating >= 4.5),
        ('networking', '🤝 Networking', '50 conexões criadas', connections_count >= 50),
        ('busy_calendar', '📅 Agenda Cheia', '20 shows em 30 dias', played_last_30 >= 20),
    ]

    for slug, name, desc, condition in badges_def:
        if not condition:
            continue
        try:
            badge, created = MusicianBadge.objects.get_or_create(
                musician=musician,
                slug=slug,
                defaults={
                    'name': name,
                    'description': desc,
                    'icon': name.split(' ')[0],  # Emoji já incluso no nome
                }
            )
            if created:
                awarded.append(badge)
        except IntegrityError:
            # Race condition: badge já foi criada por outra requisição
            pass

    return awarded


def get_badge_progress(musician):
    """
    Retorna badges conquistadas e disponíveis com progresso.
    """
    from .models import MusicianBadge, Availability, Connection

    now = timezone.now()
    today = now.date()
    last_30 = today - timedelta(days=30)

    # Calcula métricas
    played_events = Availability.objects.filter(
        musician=musician,
        response='available',
        event__event_date__lte=today
    )
    total_played = played_events.count()
    played_last_30 = played_events.filter(event__event_date__gte=last_30).count()
    connections_count = Connection.objects.filter(follower=musician).count()

    # Primeiro, garante que badges sejam concedidas
    award_badges_for_musician(musician)

    # Busca badges conquistadas
    earned = MusicianBadge.objects.filter(musician=musician)
    earned_slugs = set(earned.values_list('slug', flat=True))

    # Definições de badges com progresso
    badges_definitions = [
        {
            'slug': 'first_show',
            'name': '🎸 Primeiro Show',
            'description': 'Completou o primeiro evento',
            'icon': '🎸',
            'current': total_played,
            'required': 1,
        },
        {
            'slug': 'five_stars',
            'name': '⭐ 5 Estrelas',
            'description': 'Manteve média 5.0 com 5+ avaliações',
            'icon': '⭐',
            'current': musician.total_ratings,
            'required': 5,
            'extra_condition': f'Média atual: {musician.average_rating or 0:.1f}/5.0',
        },
        {
            'slug': 'hot_month',
            'name': '🔥 Em Alta',
            'description': '10 shows no último mês',
            'icon': '🔥',
            'current': played_last_30,
            'required': 10,
        },
        {
            'slug': 'top_musician',
            'name': '👑 Top Músico',
            'description': '10+ avaliações com média 4.5+',
            'icon': '👑',
            'current': musician.total_ratings,
            'required': 10,
            'extra_condition': f'Média atual: {musician.average_rating or 0:.1f}/4.5',
        },
        {
            'slug': 'networking',
            'name': '🤝 Networking',
            'description': '50 conexões criadas',
            'icon': '🤝',
            'current': connections_count,
            'required': 50,
        },
        {
            'slug': 'busy_calendar',
            'name': '📅 Agenda Cheia',
            'description': '20 shows em 30 dias',
            'icon': '📅',
            'current': played_last_30,
            'required': 20,
        },
    ]

    # Separa conquistadas e disponíveis
    available = []
    for badge_def in badges_definitions:
        if badge_def['slug'] not in earned_slugs:
            current = badge_def['current']
            required = badge_def['required']
            percentage = min(100, round((current / required) * 100)) if required > 0 else 0
            available.append({
                'slug': badge_def['slug'],
                'name': badge_def['name'],
                'description': badge_def['description'],
                'icon': badge_def['icon'],
                'current': current,
                'required': required,
                'percentage': percentage,
                'extra_condition': badge_def.get('extra_condition'),
            })

    # Ordena por porcentagem (mais próximos primeiro)
    available.sort(key=lambda x: -x['percentage'])

    return {
        'earned': list(earned.values('id', 'slug', 'name', 'description', 'icon', 'awarded_at')),
        'available': available,
    }

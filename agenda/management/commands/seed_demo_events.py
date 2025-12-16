# agenda/management/commands/seed_demo_events.py
"""
Cria eventos de demonstração (incluindo alguns já concluídos) para testar convites e ratings.

Uso:
    python manage.py seed_demo_events
    python manage.py seed_demo_events --clear  # remove eventos de teste antes de criar
"""
from datetime import datetime, timedelta, time
from typing import List

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from agenda.models import Event, Musician, Organization, Availability, Membership


class Command(BaseCommand):
    help = 'Cria eventos de demo (passados e futuros) para testar rating e convites.'

    EVENT_TEMPLATES = [
        {
            'title': '[TESTE] Sunset acústico no lago',
            'location': 'Bar do Lago - Av. Central, 123',
            'description': 'Evento passado para testar rating dos músicos contratados.',
            'days_offset': -7,
            'start_time': time(19, 0),
            'end_time': time(22, 0),
            'instruments': ['vocal', 'guitar', 'percussion'],
            'status': 'confirmed',
        },
        {
            'title': '[TESTE] Casamento na praia',
            'location': 'Espaço Mar Azul',
            'description': 'Cerimônia e recepção com repertório pop/jazz.',
            'days_offset': -3,
            'start_time': time(17, 0),
            'end_time': time(21, 0),
            'instruments': ['vocal', 'keyboard', 'bass', 'drums'],
            'status': 'confirmed',
        },
        {
            'title': '[TESTE] Corporate Jazz Night',
            'location': 'Terraço Vista 360',
            'description': 'Evento corporativo com repertório lounge e jazz.',
            'days_offset': 5,
            'start_time': time(20, 0),
            'end_time': time(23, 0),
            'instruments': ['vocal', 'keyboard', 'bass', 'drums'],
            'status': 'approved',
        },
        {
            'title': '[TESTE] Festival de bairro',
            'location': 'Praça Central',
            'description': 'Show aberto com repertório pop/rock.',
            'days_offset': 10,
            'start_time': time(18, 0),
            'end_time': time(22, 0),
            'instruments': ['vocal', 'guitar', 'bass', 'drums', 'percussion'],
            'status': 'proposed',
        },
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Remove eventos de teste antes de recriar.',
        )

    def handle(self, *args, **options):
        clear = options['clear']

        org = self._get_or_create_organization()
        creator = self._get_creator_user(org)
        musicians = list(Musician.objects.filter(is_active=True, organization=org).select_related('user'))

        if not musicians:
            self.stdout.write(self.style.ERROR('Nenhum músico encontrado. Rode "seed_test_data" antes.'))
            return

        if clear:
            removed = Event.objects.filter(title__startswith='[TESTE]').delete()[0]
            self.stdout.write(f'Eventos de teste removidos: {removed}')

        created, updated = self._create_events(org, creator, musicians)

        self.stdout.write(self.style.SUCCESS(f'Eventos criados: {created}, atualizados: {updated}'))
        self.stdout.write(self.style.SUCCESS(f'Criador dos eventos: {creator.username} / senha: {creator.username}2025@'))
        self.stdout.write(self.style.SUCCESS('Use os eventos passados (status confirmed) para testar ratings.'))

    def _get_or_create_organization(self) -> Organization:
        org, _ = Organization.objects.get_or_create(
            name='Banda Principal',
            defaults={'subscription_status': 'active'},
        )
        return org

    def _get_creator_user(self, org: Organization) -> User:
        """
        Escolhe um usuário criador (prioriza Lívia vocal, depois qualquer músico, depois superuser).
        Garante membership na organização.
        """
        user = (
            User.objects.filter(username='livia_vocal').first()
            or Musician.objects.filter(is_active=True, organization=org).order_by('id').values_list('user', flat=True).first()
        )

        if isinstance(user, int):
            user = User.objects.filter(id=user).first()

        if not user:
            user = User.objects.filter(is_superuser=True).first()

        if not user:
            raise ValueError('Nenhum usuário disponível para ser criador dos eventos.')

        Membership.objects.get_or_create(
            user=user,
            organization=org,
            defaults={'role': 'member', 'status': 'active'},
        )
        return user

    def _create_events(self, org: Organization, creator: User, musicians: List[Musician]):
        created = 0
        updated = 0

        now = timezone.now()

        # Mapa de músicos por instrumento para convites
        musicians_by_instrument = {}
        for m in musicians:
            musicians_by_instrument.setdefault(m.instrument, []).append(m)

        for tpl in self.EVENT_TEMPLATES:
            event_date = timezone.now().date() + timedelta(days=tpl['days_offset'])
            defaults = {
                'description': tpl['description'],
                'location': tpl['location'],
                'event_date': event_date,
                'start_time': tpl['start_time'],
                'end_time': tpl['end_time'],
                'is_solo': False,
                'organization': org,
                'created_by': creator,
                'status': tpl['status'],
                'approved_by': creator if tpl['status'] in ['approved', 'confirmed'] else None,
                'approved_at': now if tpl['status'] in ['approved', 'confirmed'] else None,
            }

            event, was_created = Event.objects.update_or_create(
                title=tpl['title'],
                organization=org,
                defaults=defaults,
            )

            # Recalcula datetimes (model.save já cuida, mas garantimos)
            event.save()

            # Limpa availabilities anteriores e recria
            event.availabilities.all().delete()

            invited = set()
            for instrument in tpl['instruments']:
                invited_list = musicians_by_instrument.get(instrument, [])
                for musician in invited_list[:2]:  # convida até 2 por instrumento
                    invited.add(musician)

            # Sempre adiciona o criador como available
            try:
                creator_musician = creator.musician_profile
                invited.add(creator_musician)
            except Musician.DoesNotExist:
                creator_musician = None

            for musician in invited:
                Availability.objects.update_or_create(
                    musician=musician,
                    event=event,
                    defaults={
                        'response': 'available' if tpl['status'] in ['approved', 'confirmed'] else 'pending',
                        'notes': '[TESTE] Convite automático',
                        'responded_at': now if tpl['status'] in ['approved', 'confirmed'] else None,
                    },
                )

            if was_created:
                created += 1
            else:
                updated += 1

        return created, updated

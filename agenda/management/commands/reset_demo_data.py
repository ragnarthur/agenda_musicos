# agenda/management/commands/reset_demo_data.py
"""
Reseta dados de eventos e músicos, mantendo o trio principal (Sara, Arthur, Roberto)
e criando bots de teste. Opcionalmente recria eventos demo para testar rating.

Uso:
    python manage.py reset_demo_data
    python manage.py reset_demo_data --no-events  # não recria eventos de teste
"""
import unicodedata

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.core.management import call_command

from agenda.models import (
    Availability,
    Event,
    EventLog,
    EventInstrument,
    LeaderAvailability,
    Musician,
    MusicianRating,
    Organization,
    Membership,
)


CORE_MUSICIANS = [
    {
        'username': 'sara',
        'first_name': 'Sara',
        'last_name': 'Carmo',
        'email': 'saram.carmo@hotmail.com',
        'password': 'sara2025@',
        'instrument': 'guitar',
        'role': 'member',
    },
    {
        'username': 'arthur',
        'first_name': 'Arthur',
        'last_name': 'Araújo',
        'email': 'catsinthegarden01@gmail.com',
        'password': 'arthur2025@',
        'instrument': 'guitar',
        'role': 'member',
    },
    {
        'username': 'roberto',
        'first_name': 'Roberto',
        'last_name': 'Guimarães',
        'email': 'riguimaandroid@gmail.com',
        'password': 'roberto2025@',
        'instrument': 'drums',
        'role': 'leader',
    },
]

BOT_MUSICIANS = [
    {'username': 'bot_vocal', 'first_name': 'Lívia', 'last_name': 'Bot', 'instrument': 'vocal'},
    {'username': 'bot_vocal2', 'first_name': 'Mariana', 'last_name': 'Bot', 'instrument': 'vocal'},
    {'username': 'bot_guitar', 'first_name': 'Marcos', 'last_name': 'Bot', 'instrument': 'guitar'},
    {'username': 'bot_guitar2', 'first_name': 'Rafael', 'last_name': 'Bot', 'instrument': 'guitar'},
    {'username': 'bot_bass', 'first_name': 'Diego', 'last_name': 'Bot', 'instrument': 'bass'},
    {'username': 'bot_bass2', 'first_name': 'Pedro', 'last_name': 'Bot', 'instrument': 'bass'},
    {'username': 'bot_drums', 'first_name': 'Fernanda', 'last_name': 'Bot', 'instrument': 'drums'},
    {'username': 'bot_drums2', 'first_name': 'Lucas', 'last_name': 'Bot', 'instrument': 'drums'},
    {'username': 'bot_keys', 'first_name': 'Carla', 'last_name': 'Bot', 'instrument': 'keyboard'},
    {'username': 'bot_keys2', 'first_name': 'Gabriel', 'last_name': 'Bot', 'instrument': 'keyboard'},
    {'username': 'bot_perc', 'first_name': 'Carlos', 'last_name': 'Bot', 'instrument': 'percussion'},
    {'username': 'bot_perc2', 'first_name': 'Maria', 'last_name': 'Bot', 'instrument': 'percussion'},
]


class Command(BaseCommand):
    help = 'Reseta dados mantendo músicos principais e recria bots e eventos de teste.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--no-events',
            action='store_true',
            help='Não recria eventos de teste.',
        )
        parser.add_argument(
            '--no-avail',
            action='store_true',
            help='Não recria disponibilidades demo.',
        )

    def handle(self, *args, **options):
        no_events = options['no_events']
        no_avail = options['no_avail']
        org = self._get_org()

        self.stdout.write(self.style.WARNING('Limpando eventos e avaliações...'))
        self._clear_events()

        self.stdout.write(self.style.WARNING('Removendo músicos não essenciais...'))
        self._prune_musicians(org)

        self.stdout.write(self.style.WARNING('Garantindo trio principal...'))
        self._ensure_core_musicians(org)

        self.stdout.write(self.style.WARNING('Criando bots de teste...'))
        self._create_bots(org)

        if not no_events:
            self.stdout.write(self.style.WARNING('Criando eventos demo...'))
            call_command('seed_demo_events', clear=True)

        if not no_avail:
            self.stdout.write(self.style.WARNING('Gerando disponibilidades demo...'))
            call_command('seed_demo_availabilities')

        self.stdout.write(self.style.SUCCESS('Reset concluído.'))

    def _get_org(self):
        org, _ = Organization.objects.get_or_create(
            name='Banda Principal',
            defaults={'subscription_status': 'active'},
        )
        return org

    def _clear_events(self):
        MusicianRating.objects.all().delete()
        Availability.objects.all().delete()
        EventLog.objects.all().delete()
        EventInstrument.objects.all().delete()
        LeaderAvailability.objects.all().delete()
        Event.objects.all().delete()

    def _prune_musicians(self, org):
        keep_usernames = {m['username'] for m in CORE_MUSICIANS}
        # Remove músicos (e usuários) não essenciais
        extra_musicians = Musician.objects.exclude(user__username__in=keep_usernames)
        extra_users = User.objects.filter(musician_profile__in=extra_musicians)
        Membership.objects.filter(user__in=extra_users, organization=org).delete()
        extra_musicians.delete()
        extra_users.delete()

    def _ensure_core_musicians(self, org):
        for data in CORE_MUSICIANS:
            user, _ = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'email': data['email'],
                },
            )
            user.first_name = data['first_name']
            user.last_name = data['last_name']
            user.email = data['email']
            user.set_password(data['password'])
            user.save()

            Membership.objects.get_or_create(
                user=user,
                organization=org,
                defaults={'role': 'owner' if data['role'] == 'leader' else 'member', 'status': 'active'},
            )

            Musician.objects.update_or_create(
                user=user,
                defaults={
                    'instrument': data['instrument'],
                    'role': data['role'],
                    'bio': '',
                    'phone': '',
                    'instagram': '',
                    'is_active': True,
                    'organization': org,
                },
            )

    def _create_bots(self, org):
        for bot in BOT_MUSICIANS:
            username = bot['username']
            first_name_clean = ''.join(
                c for c in unicodedata.normalize('NFKD', bot['first_name'])
                if c.isalnum()
            ).lower()
            password = f'{first_name_clean}2025@' if first_name_clean else f'{username}2025@'
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    'first_name': bot['first_name'],
                    'last_name': bot['last_name'],
                    'email': f'{username}@demo.com',
                },
            )
            user.set_password(password)
            user.save()

            Membership.objects.get_or_create(
                user=user,
                organization=org,
                defaults={'role': 'member', 'status': 'active'},
            )

            Musician.objects.update_or_create(
                user=user,
                defaults={
                    'instrument': bot['instrument'],
                    'role': 'member',
                    'bio': '[BOT] Músico de teste',
                    'is_active': True,
                    'organization': org,
                },
            )

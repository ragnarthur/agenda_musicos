# agenda/management/commands/seed_test_data.py
"""
Comando para popular o banco de dados com músicos e disponibilidades de teste.
Útil para testar funcionalidades de filtro, busca e agendamento.

Uso:
    python manage.py seed_test_data
    python manage.py seed_test_data --clear  # Limpa dados de teste antes de criar
"""

from datetime import datetime, timedelta, time
import random

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from agenda.models import Musician, Organization, Membership, LeaderAvailability


class Command(BaseCommand):
    help = 'Popula o banco com músicos e disponibilidades de teste'

    # Músicos de teste com variedade de instrumentos
    TEST_MUSICIANS = [
        # Vocalistas (3)
        {
            'username': 'livia_vocal',
            'first_name': 'Lívia',
            'last_name': 'Mendes',
            'instrument': 'vocal',
            'bio': 'Vocalista pop/MPB, disponível para casamentos e eventos corporativos',
            'phone': '(11) 98888-4444',
            'instagram': '@livia.canta',
        },
        {
            'username': 'marcos_vocal',
            'first_name': 'Marcos',
            'last_name': 'Silva',
            'instrument': 'vocal',
            'bio': 'Cantor versátil, rock/pop/sertanejo',
            'phone': '(11) 97777-1111',
            'instagram': '@marcos.voz',
        },
        {
            'username': 'julia_vocal',
            'first_name': 'Júlia',
            'last_name': 'Santos',
            'instrument': 'vocal',
            'bio': 'Cantora jazz/bossa nova para eventos elegantes',
            'phone': '(21) 96666-2222',
            'instagram': '@julia.jazz',
        },
        # Guitarristas (3)
        {
            'username': 'bruno_guitar',
            'first_name': 'Bruno',
            'last_name': 'Farias',
            'instrument': 'guitar',
            'bio': 'Guitarrista e violonista, repertório pop/rock e acústico',
            'phone': '(11) 97777-2222',
            'instagram': '@bruno.gtr',
        },
        {
            'username': 'rafael_guitar',
            'first_name': 'Rafael',
            'last_name': 'Costa',
            'instrument': 'guitar',
            'bio': 'Guitarrista rock/blues, disponível para bandas cover',
            'phone': '(31) 95555-3333',
            'instagram': '@rafa.guitar',
        },
        {
            'username': 'ana_guitar',
            'first_name': 'Ana',
            'last_name': 'Oliveira',
            'instrument': 'guitar',
            'bio': 'Violonista clássica e popular, casamentos e recepções',
            'phone': '(41) 94444-4444',
            'instagram': '@ana.violao',
        },
        # Baixistas (2)
        {
            'username': 'diego_bass',
            'first_name': 'Diego',
            'last_name': 'Santana',
            'instrument': 'bass',
            'bio': 'Baixista groove/funk/rock, disponível para turnês curtas',
            'phone': '(31) 95555-1111',
            'instagram': '@diego.bass',
        },
        {
            'username': 'pedro_bass',
            'first_name': 'Pedro',
            'last_name': 'Almeida',
            'instrument': 'bass',
            'bio': 'Baixista jazz/fusion, ensaios e gravações',
            'phone': '(21) 93333-5555',
            'instagram': '@pedro.low',
        },
        # Bateristas (3)
        {
            'username': 'fernanda_drums',
            'first_name': 'Fernanda',
            'last_name': 'Castro',
            'instrument': 'drums',
            'bio': 'Baterista versátil (pop/rock/sertanejo), pronta para freelas',
            'phone': '(41) 94444-0000',
            'instagram': '@fernanda.drums',
        },
        {
            'username': 'lucas_drums',
            'first_name': 'Lucas',
            'last_name': 'Ribeiro',
            'instrument': 'drums',
            'bio': 'Baterista rock/metal, turnês e gravações',
            'phone': '(11) 92222-6666',
            'instagram': '@lucas.drums',
        },
        {
            'username': 'thiago_drums',
            'first_name': 'Thiago',
            'last_name': 'Ferreira',
            'instrument': 'drums',
            'bio': 'Baterista jazz/MPB, disponível finais de semana',
            'phone': '(21) 91111-7777',
            'instagram': '@thiago.baquetas',
        },
        # Tecladistas (2)
        {
            'username': 'carla_keyboard',
            'first_name': 'Carla',
            'last_name': 'Lopes',
            'instrument': 'keyboard',
            'bio': 'Tecladista/pianista para trios e casamentos',
            'phone': '(21) 96666-3333',
            'instagram': '@carla.keys',
        },
        {
            'username': 'gabriel_keyboard',
            'first_name': 'Gabriel',
            'last_name': 'Moreira',
            'instrument': 'keyboard',
            'bio': 'Tecladista pop/rock, sintetizadores e Hammond',
            'phone': '(11) 98888-8888',
            'instagram': '@gab.keys',
        },
        # Outros (2)
        {
            'username': 'maria_sax',
            'first_name': 'Maria',
            'last_name': 'Souza',
            'instrument': 'percussion',
            'bio': 'Saxofonista jazz/bossa, eventos sofisticados',
            'phone': '(11) 97777-9999',
            'instagram': '@maria.sax',
        },
        {
            'username': 'carlos_perc',
            'first_name': 'Carlos',
            'last_name': 'Nunes',
            'instrument': 'percussion',
            'bio': 'Percussionista samba/pagode/axé',
            'phone': '(21) 96666-0000',
            'instagram': '@carlos.perc',
        },
    ]

    # Slots de horário variados
    TIME_SLOTS = [
        (time(9, 0), time(12, 0)),    # Manhã
        (time(14, 0), time(17, 0)),   # Tarde
        (time(18, 0), time(21, 0)),   # Início da noite
        (time(19, 0), time(22, 0)),   # Noite
        (time(20, 0), time(23, 0)),   # Noite tarde
        (time(21, 0), time(0, 0)),    # Madrugada (cruza meia-noite)
        (time(10, 0), time(14, 0)),   # Brunch/almoço
        (time(15, 0), time(19, 0)),   # Fim de tarde
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Limpa dados de teste antes de criar novos',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=14,
            help='Número de dias para criar disponibilidades (padrão: 14)',
        )

    def handle(self, *args, **options):
        clear = options['clear']
        days_ahead = options['days']

        if clear:
            self._clear_test_data()

        org = self._get_or_create_organization()
        musicians = self._create_musicians(org)
        availabilities_count = self._create_availabilities(musicians, days_ahead)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(self.style.SUCCESS('DADOS DE TESTE CRIADOS COM SUCESSO'))
        self.stdout.write(self.style.SUCCESS('=' * 50))
        self.stdout.write(f'Músicos criados/atualizados: {len(musicians)}')
        self.stdout.write(f'Disponibilidades criadas: {availabilities_count}')
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('CREDENCIAIS DE ACESSO:'))
        self.stdout.write('Senha padrão: <username>2026@')
        self.stdout.write('Exemplo: livia_vocal / livia_vocal2026@')
        self.stdout.write('')
        self._print_summary(musicians)

    def _clear_test_data(self):
        """Remove dados de teste existentes"""
        self.stdout.write('Limpando dados de teste anteriores...')

        # Remove disponibilidades de teste
        deleted_avail = LeaderAvailability.objects.filter(
            notes__icontains='[TESTE]'
        ).delete()[0]

        # Remove músicos de teste (pelo username)
        test_usernames = [m['username'] for m in self.TEST_MUSICIANS]
        deleted_musicians = Musician.objects.filter(
            user__username__in=test_usernames
        ).delete()[0]

        deleted_users = User.objects.filter(
            username__in=test_usernames
        ).delete()[0]

        self.stdout.write(f'  - Disponibilidades removidas: {deleted_avail}')
        self.stdout.write(f'  - Músicos removidos: {deleted_musicians}')
        self.stdout.write(f'  - Usuários removidos: {deleted_users}')

    def _get_or_create_organization(self):
        """Obtém ou cria organização de teste"""
        org, created = Organization.objects.get_or_create(
            name='Banda Principal',
            defaults={'subscription_status': 'active'}
        )
        if created:
            self.stdout.write(f'Organização criada: {org.name}')
        return org

    def _create_musicians(self, org):
        """Cria músicos de teste"""
        self.stdout.write('Criando músicos de teste...')
        musicians = []

        for data in self.TEST_MUSICIANS:
            user, user_created = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'email': f"{data['username']}@demo.com",
                },
            )

            # Atualiza dados do usuário
            user.first_name = data['first_name']
            user.last_name = data['last_name']
            user.set_password(f"{data['username']}2026@")
            user.save()

            # Cria membership
            Membership.objects.get_or_create(
                user=user,
                organization=org,
                defaults={'role': 'member', 'status': 'active'},
            )

            # Cria ou atualiza músico
            musician, _ = Musician.objects.update_or_create(
                user=user,
                defaults={
                    'instrument': data['instrument'],
                    'role': 'member',
                    'bio': data['bio'],
                    'phone': data['phone'],
                    'instagram': data['instagram'],
                    'is_active': True,
                    'organization': org,
                },
            )
            musicians.append(musician)

            status = 'NOVO' if user_created else 'atualizado'
            self.stdout.write(f"  - {data['first_name']} {data['last_name']} ({data['instrument']}) [{status}]")

        return musicians

    def _create_availabilities(self, musicians, days_ahead):
        """Cria disponibilidades para os músicos"""
        self.stdout.write(f'Criando disponibilidades para os próximos {days_ahead} dias...')

        today = datetime.now().date()
        created_count = 0

        for musician in musicians:
            # Cada músico terá disponibilidades em alguns dias (não todos)
            # Isso simula uma agenda real mais realista
            available_days = random.sample(
                range(1, days_ahead + 1),
                k=random.randint(days_ahead // 3, days_ahead // 2)  # 1/3 a 1/2 dos dias
            )

            for day_offset in available_days:
                date = today + timedelta(days=day_offset)

                # Escolhe 1-2 slots aleatórios para este dia
                num_slots = random.randint(1, 2)
                day_slots = random.sample(self.TIME_SLOTS, k=num_slots)

                for start_time, end_time in day_slots:
                    # Verifica se já existe
                    existing = LeaderAvailability.objects.filter(
                        leader=musician,
                        date=date,
                        start_time=start_time,
                    ).exists()

                    if existing:
                        continue

                    # Cria disponibilidade
                    # Aleatoriamente torna algumas públicas e outras privadas
                    is_public = random.choice([True, True, True, False])  # 75% públicas

                    notes_options = [
                        '[TESTE] Disponível para gigs',
                        '[TESTE] Agenda livre',
                        '[TESTE] Aceito propostas',
                        '[TESTE] Disponível para freelas',
                        '[TESTE] Preferência por eventos pequenos',
                        '[TESTE] Disponível para casamentos',
                        '[TESTE] Aceito cachês a combinar',
                    ]

                    LeaderAvailability.objects.create(
                        leader=musician,
                        date=date,
                        start_time=start_time,
                        end_time=end_time,
                        notes=random.choice(notes_options),
                        is_public=is_public,
                        organization=musician.organization,
                    )
                    created_count += 1

        return created_count

    def _print_summary(self, musicians):
        """Imprime resumo dos dados criados"""
        self.stdout.write(self.style.SUCCESS('RESUMO POR INSTRUMENTO:'))

        instrument_counts = {}
        for m in musicians:
            inst = m.instrument
            if inst not in instrument_counts:
                instrument_counts[inst] = []
            instrument_counts[inst].append(m.user.get_full_name())

        instrument_labels = {
            'vocal': 'Vocal',
            'guitar': 'Guitarra/Violão',
            'bass': 'Baixo',
            'drums': 'Bateria',
            'keyboard': 'Teclado',
            'percussion': 'Percussão/Outros',
        }

        for inst, names in sorted(instrument_counts.items()):
            label = instrument_labels.get(inst, inst)
            self.stdout.write(f'  {label}: {len(names)} músicos')
            for name in names:
                self.stdout.write(f'    - {name}')

        # Conta disponibilidades por tipo
        total_public = LeaderAvailability.objects.filter(
            notes__icontains='[TESTE]',
            is_public=True
        ).count()
        total_private = LeaderAvailability.objects.filter(
            notes__icontains='[TESTE]',
            is_public=False
        ).count()

        self.stdout.write('')
        self.stdout.write(f'Disponibilidades públicas: {total_public}')
        self.stdout.write(f'Disponibilidades privadas: {total_private}')

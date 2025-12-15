from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from agenda.models import Musician, Organization, Membership


class Command(BaseCommand):
    help = 'Cria músicos fictícios para testes de convites e agenda compartilhada'

    DEMO_MUSICIANS = [
        {
            'username': 'livia',
            'first_name': 'Lívia',
            'last_name': 'Mendes',
            'instrument': 'vocal',
            'bio': 'Vocalista pop/MPB, disponível para casamentos e eventos corporativos',
            'email': 'livia@demo.com',
            'phone': '(11) 98888-4444',
            'instagram': '@livia.canta',
        },
        {
            'username': 'bruno',
            'first_name': 'Bruno',
            'last_name': 'Farias',
            'instrument': 'guitar',
            'bio': 'Guitarrista e violonista, repertório pop/rock e acústico',
            'email': 'bruno@demo.com',
            'phone': '(11) 97777-2222',
            'instagram': '@bruno.gtr',
        },
        {
            'username': 'carla',
            'first_name': 'Carla',
            'last_name': 'Lopes',
            'instrument': 'keyboard',
            'bio': 'Tecladista/pianista para trios e casamentos',
            'email': 'carla@demo.com',
            'phone': '(21) 96666-3333',
            'instagram': '@carla.keys',
        },
        {
            'username': 'diego',
            'first_name': 'Diego',
            'last_name': 'Santana',
            'instrument': 'bass',
            'bio': 'Baxista groove/funk/rock, disponível para turnês curtas',
            'email': 'diego@demo.com',
            'phone': '(31) 95555-1111',
            'instagram': '@diego.bass',
        },
        {
            'username': 'fernanda',
            'first_name': 'Fernanda',
            'last_name': 'Castro',
            'instrument': 'drums',
            'bio': 'Baterista versátil (pop/rock/sertanejo), pronta para freelas',
            'email': 'fernanda@demo.com',
            'phone': '(41) 94444-0000',
            'instagram': '@fernanda.drums',
        },
    ]

    def handle(self, *args, **options):
        org, _ = Organization.objects.get_or_create(
            name='Banda Principal',
            defaults={'subscription_status': 'active'}
        )

        created_users = 0
        created_musicians = 0

        for data in self.DEMO_MUSICIANS:
            user, user_created = User.objects.get_or_create(
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
            user.set_password(f"{data['username']}2025@")
            user.save()

            if user_created:
                created_users += 1

            Membership.objects.get_or_create(
                user=user,
                organization=org,
                defaults={'role': 'member', 'status': 'active'},
            )

            musician, musician_created = Musician.objects.update_or_create(
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
            if musician_created:
                created_musicians += 1

        self.stdout.write(self.style.SUCCESS(
            f'Usuários criados: {created_users} | Músicos criados: {created_musicians}'
        ))
        self.stdout.write(self.style.SUCCESS(
            'Senhas: <username>2025@ (ex: livia2025@)'
        ))

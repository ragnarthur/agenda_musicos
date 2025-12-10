# agenda/management/commands/populate_db.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from agenda.models import Musician


class Command(BaseCommand):
    help = 'Popula o banco de dados com os músicos iniciais (Sara, Arthur, Roberto)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Iniciando população do banco de dados...'))

        # Lista de músicos a serem criados
        musicians_data = [
            {
                'username': 'sara',
                'first_name': 'Sara',
                'last_name': 'Carmo',
                'email': 'sara@musica.com',
                'password': 'senha123',
                'instrument': 'vocal',
                'role': 'member',
                'bio': 'Vocalista e violonista - Contrata músicos para apresentações',
                'phone': '(11) 98888-1111'
            },
            {
                'username': 'arthur',
                'first_name': 'Arthur',
                'last_name': 'Araújo',
                'email': 'arthur@musica.com',
                'password': 'senha123',
                'instrument': 'guitar',
                'role': 'member',
                'bio': 'Vocalista e violonista - Contrata músicos para apresentações',
                'phone': '(11) 98888-2222'
            },
            {
                'username': 'roberto',
                'first_name': 'Roberto',
                'last_name': 'Guimarães',
                'email': 'roberto@musica.com',
                'password': 'senha123',
                'instrument': 'drums',
                'role': 'leader',
                'bio': 'Baterista profissional - Contratado para shows',
                'phone': '(11) 98888-3333'
            }
        ]

        created_count = 0
        updated_count = 0

        for data in musicians_data:
            # Extrair dados do usuário e do músico
            username = data['username']
            user_data = {
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'email': data['email']
            }
            musician_data = {
                'instrument': data['instrument'],
                'role': data['role'],
                'bio': data['bio'],
                'phone': data['phone']
            }

            # Criar ou atualizar usuário
            user, user_created = User.objects.get_or_create(
                username=username,
                defaults=user_data
            )

            if user_created:
                user.set_password(data['password'])
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Usuário criado: {user.get_full_name()} (@{username})')
                )
            else:
                # Atualizar dados do usuário existente
                for key, value in user_data.items():
                    setattr(user, key, value)
                user.set_password(data['password'])
                user.save()
                self.stdout.write(
                    self.style.WARNING(f'⟳ Usuário atualizado: {user.get_full_name()} (@{username})')
                )

            # Criar ou atualizar perfil de músico
            musician, musician_created = Musician.objects.get_or_create(
                user=user,
                defaults=musician_data
            )

            if musician_created:
                created_count += 1
                role_display = '👑 LÍDER' if data['role'] == 'leader' else 'Membro'
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ♪ Músico criado: {data["instrument"].upper()} - {role_display}'
                    )
                )
            else:
                # Atualizar dados do músico existente
                for key, value in musician_data.items():
                    setattr(musician, key, value)
                musician.save()
                updated_count += 1
                role_display = '👑 LÍDER' if data['role'] == 'leader' else 'Membro'
                self.stdout.write(
                    self.style.WARNING(
                        f'  ♪ Músico atualizado: {data["instrument"].upper()} - {role_display}'
                    )
                )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('Banco de dados populado com sucesso!'))
        self.stdout.write(self.style.SUCCESS(f'Músicos criados: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'Músicos atualizados: {updated_count}'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write('')
        self.stdout.write(self.style.NOTICE('Credenciais de acesso:'))
        self.stdout.write(self.style.NOTICE('-' * 60))
        self.stdout.write('Sara Carmo (Vocalista/Violonista - Contratante):')
        self.stdout.write('  username: sara')
        self.stdout.write('  password: senha123')
        self.stdout.write('')
        self.stdout.write('Arthur Araújo (Vocalista/Violonista - Contratante):')
        self.stdout.write('  username: arthur')
        self.stdout.write('  password: senha123')
        self.stdout.write('')
        self.stdout.write('Roberto Guimarães (Baterista - Contratado):')
        self.stdout.write('  username: roberto')
        self.stdout.write('  password: senha123')
        self.stdout.write(self.style.NOTICE('-' * 60))

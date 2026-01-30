# agenda/management/commands/populate_db.py
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from agenda.models import Membership, Musician, Organization


class Command(BaseCommand):
    help = "Popula o banco de dados com os músicos iniciais (Sara, Arthur, Roberto)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Iniciando população do banco de dados..."))
        self.stdout.write(self.style.NOTICE("Senhas padrão configuradas (2026@)."))
        self.stdout.write(
            self.style.NOTICE('Crie/atualize o admin via "createsuperuser" se necessário.\n')
        )

        # Lista de músicos a serem criados
        musicians_data = [
            {
                "username": "sara",
                "first_name": "Sara",
                "last_name": "Carmo",
                "email": "saram.carmo@hotmail.com",
                "password": "sara2026@",
                "instrument": "guitar",
                "role": "member",
                "bio": "Vocalista e violonista - contrata músicos para apresentações",
                "phone": "(17) 99193-3859",
                "instagram": "@saracarmocantora",
            },
            {
                "username": "arthur",
                "first_name": "Arthur",
                "last_name": "Araújo",
                "email": "catsinthegarden01@gmail.com",
                "password": "arthur2026@",
                "instrument": "guitar",
                "role": "member",
                "bio": "Vocal, violão e guitarra - contrata músicos para apresentações",
                "phone": "(34) 98811-5465",
                "instagram": "@arthuraraujo07",
            },
            {
                "username": "roberto",
                "first_name": "Roberto",
                "last_name": "Guimarães",
                "email": "riguimaandroid@gmail.com",
                "password": "roberto2026@",
                "instrument": "drums",
                "role": "member",
                "bio": "Baterista",
                "phone": "(34) 99174-3948",
                "instagram": "@roberto.guimaraes.299",
            },
        ]

        created_count = 0
        updated_count = 0
        org, _ = Organization.objects.get_or_create(name="Banda Principal")

        for data in musicians_data:
            # Extrair dados do usuário e do músico
            username = data["username"]
            user_data = {
                "first_name": data["first_name"],
                "last_name": data["last_name"],
                "email": data["email"],
            }
            musician_data = {
                "instrument": data["instrument"],
                "role": data["role"],
                "bio": data["bio"],
                "phone": data["phone"],
                "instagram": data.get("instagram", ""),
            }

            # Criar ou atualizar usuário
            user, user_created = User.objects.get_or_create(username=username, defaults=user_data)

            if user_created:
                user.set_password(data["password"])
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Usuário criado: {user.get_full_name()} (@{username})")
                )
            else:
                # Atualizar dados do usuário existente
                for key, value in user_data.items():
                    setattr(user, key, value)
                user.set_password(data["password"])
                user.save()
                self.stdout.write(
                    self.style.WARNING(
                        f"⟳ Usuário atualizado: {user.get_full_name()} (@{username})"
                    )
                )

            # Criar ou atualizar perfil de músico
            musician, musician_created = Musician.objects.get_or_create(
                user=user, defaults=musician_data
            )
            if not musician.organization:
                musician.organization = org
                musician.save(update_fields=["organization"])

            Membership.objects.get_or_create(
                user=user,
                organization=org,
                defaults={
                    "role": "owner" if data.get("username") == "sara" else "member",
                    "status": "active",
                },
            )

            if musician_created:
                created_count += 1
                role_display = "Membro"
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
                role_display = "Membro"
                self.stdout.write(
                    self.style.WARNING(
                        f'  ♪ Músico atualizado: {data["instrument"].upper()} - {role_display}'
                    )
                )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("Banco de dados populado com sucesso!"))
        self.stdout.write(self.style.SUCCESS(f"Músicos criados: {created_count}"))
        self.stdout.write(self.style.SUCCESS(f"Músicos atualizados: {updated_count}"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write("")
        self.stdout.write(self.style.NOTICE("Credenciais de acesso:"))
        self.stdout.write(self.style.NOTICE("-" * 60))
        self.stdout.write("Sara Carmo (Vocal e violão - Membro):")
        self.stdout.write("  username: sara")
        self.stdout.write("  password: sara2026@")
        self.stdout.write("")
        self.stdout.write("Arthur Araújo (Vocal, violão e guitarra - Membro):")
        self.stdout.write("  username: arthur")
        self.stdout.write("  password: arthur2026@")
        self.stdout.write("")
        self.stdout.write("Roberto Guimarães (Baterista):")
        self.stdout.write("  username: roberto")
        self.stdout.write("  password: roberto2026@")
        self.stdout.write(self.style.NOTICE("-" * 60))

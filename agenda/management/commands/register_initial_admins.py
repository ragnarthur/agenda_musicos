"""
Comando para registrar administradores iniciais fixos (admin_1 e admin_2).
Executar no deploy inicial: python manage.py register_initial_admins
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()

INITIAL_ADMINS = [
    {
        "username": "admin_1",
        "email": "admin_1@gigflow.com.br",
        "password": "Teste123@",
        "is_superuser": True,
        "is_staff": True,
    },
    {
        "username": "admin_2",
        "email": "admin_2@gigflow.com.br",
        "password": "Teste123@",
        "is_superuser": True,
        "is_staff": True,
    },
]


class Command(BaseCommand):
    help = "Registra administradores iniciais fixos (admin_1 e admin_2)"

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for admin_data in INITIAL_ADMINS:
            username = admin_data["username"]

            try:
                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        "email": admin_data["email"],
                    },
                )

                if created:
                    user.set_password(admin_data["password"])
                    user.is_superuser = admin_data["is_superuser"]
                    user.is_staff = admin_data["is_staff"]
                    user.save()
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ Admin {username} criado com senha fixa")
                    )
                else:
                    # Garante que o usuário existente tem a senha fixa
                    user.set_password(admin_data["password"])
                    user.is_superuser = admin_data["is_superuser"]
                    user.is_staff = admin_data["is_staff"]
                    user.email = admin_data["email"]
                    user.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ Admin {username} atualizado com senha fixa")
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"✗ Erro ao criar/atualizar admin {username}: {str(e)}")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n=== Resumo ===\n"
                f"Admins criados: {created_count}\n"
                f"Admins atualizados: {updated_count}\n"
                f"Total processado: {len(INITIAL_ADMINS)}\n"
                f"Senhas fixas: Teste123@"
            )
        )

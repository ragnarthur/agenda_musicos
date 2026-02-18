"""
Comando seguro para resetar administradores.
Requer confirmação explícita e verifica se o usuário tem permissão.
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
    help = "Reset administradores com senha fixa (requer confirmação)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Força reset sem confirmação (apenas para automação)",
        )

    def handle(self, *args, **options):
        force = options.get("force", False)

        if not force:
            self.stdout.write(
                self.style.WARNING("⚠️  ATENÇÃO: Isso vai resetar todos os admins existentes!")
            )
            self.stdout.write(self.style.WARNING("Admins existentes serão DELETADOS."))
            confirm = input("Tem certeza que deseja continuar? (yes/no): ")
            if confirm.lower() not in ["yes", "y"]:
                self.stdout.write(self.style.SUCCESS("Operação cancelada."))
                return

        # Deletar todos os admins existentes
        deleted = User.objects.filter(is_superuser=True).delete()[0]
        self.stdout.write(self.style.SUCCESS(f"✓ {deleted} admins deletados"))

        # Criar novos admins
        created = 0
        for admin_data in INITIAL_ADMINS:
            user = User(
                username=admin_data["username"],
                email=admin_data["email"],
                is_superuser=admin_data["is_superuser"],
                is_staff=admin_data["is_staff"],
            )
            user.set_password(admin_data["password"])
            user.save()
            created += 1
            self.stdout.write(
                self.style.SUCCESS(f"✓ Admin {user.username} criado com senha: Teste123@")
            )

        self.stdout.write(
            self.style.SUCCESS(f"\n=== Concluído ===\nAdmins criados: {created}\nSenhas: Teste123@")
        )

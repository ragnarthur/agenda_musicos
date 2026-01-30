from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Redefine senhas de desenvolvimento para sara, arthur e roberto (formato: <username>2026@)"
    )

    def handle(self, *args, **options):
        User = get_user_model()
        users = ["sara", "arthur", "roberto"]
        updated = 0

        for username in users:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Usuário {username} não encontrado."))
                continue

            new_password = f"{username}2026@"
            user.set_password(new_password)
            user.save(update_fields=["password"])
            updated += 1
            self.stdout.write(self.style.SUCCESS(f"Senha redefinida para {username}."))

        self.stdout.write(self.style.SUCCESS(f"Total atualizado: {updated}"))

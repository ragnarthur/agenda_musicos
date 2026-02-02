from django.core.management.base import BaseCommand
from agenda.models import Musician
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Remove instrumentos duplicados de músicos específicos"

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            type=str,
            required=True,
            help="Nome de usuário do músico para limpar",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mostra alterações sem salvar (apenas teste)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Força limpeza mesmo sem duplicados",
        )

    def handle(self, *args, **options):
        username = options.get("username")
        dry_run = options.get("dry_run", False)
        force = options.get("force", False)

        if not username:
            self.stdout.write(self.style.ERROR("Erro: --username é obrigatório"))
            return

        try:
            musician = Musician.objects.get(user__username=username)
        except Musician.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Músico "{username}" não encontrado'))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{'=' * 60}\n"
                f"🔍 Analisando músico: {musician.user.get_full_name()} (@{username})\n"
                f"{'=' * 60}"
            )
        )

        if not musician.instruments:
            self.stdout.write(
                self.style.WARNING("Lista de instrumentos vazia. Nada a fazer.")
            )
            return

        original_count = len(musician.instruments)
        original_list = musician.instruments.copy()

        # Remove duplicados usando dict.fromkeys
        cleaned_instruments = list(dict.fromkeys(original_list))

        # Garante que o instrumento principal é o primeiro
        if musician.instrument:
            if musician.instrument not in cleaned_instruments:
                cleaned_instruments.insert(0, musician.instrument)
            else:
                # Já está na lista, remove duplicados mantendo-o como primeiro
                cleaned_instruments = [musician.instrument] + [
                    inst for inst in cleaned_instruments if inst != musician.instrument
                ]

        # Verifica se houve mudança ou se está forçado
        has_duplicates = len(original_list) != len(dict.fromkeys(original_list))
        if not has_duplicates and not force:
            self.stdout.write(
                self.style.SUCCESS("✓ Sem duplicados encontrados. Nada alterado.")
            )
            return

        # Mostra alteração
        self.stdout.write(
            self.style.WARNING(
                f"\n📋 Detalhes:\n"
                f"{'=' * 60}\n"
                f"ID do músico: {musician.id}\n"
                f"Instrumento principal: {musician.instrument}\n"
                f"Lista original ({original_count}): {original_list}\n"
                f"Lista limpa ({len(cleaned_instruments)}): {cleaned_instruments}\n"
                f"{'=' * 60}"
            )
        )

        # Salva apenas se não for dry-run
        if dry_run:
            self.stdout.write(
                self.style.NOTICE("\n⚠️  Modo DRY-RUN: Alterações não salvas")
            )
        else:
            musician.instruments = cleaned_instruments
            musician.save(update_fields=["instruments"])
            logger.info(
                f"Músico {musician.id} ({username}) atualizado: "
                f"{original_count} → {len(cleaned_instruments)} instrumentos"
            )
            self.stdout.write(self.style.SUCCESS("\n✅ Alterações salvas com sucesso!"))

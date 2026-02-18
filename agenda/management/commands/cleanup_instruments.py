# agenda/management/commands/cleanup_instruments.py
"""
Limpa e normaliza instrumentos dos músicos, removendo duplicatas e
expandindo instrumentos compostos.

Uso:
    python manage.py cleanup_instruments --dry-run  # Mostra o que seria alterado
    python manage.py cleanup_instruments            # Executa as alterações
"""

import re
import unicodedata

from django.core.management.base import BaseCommand

from agenda.models import Musician


def normalize_instrument(name: str) -> str:
    """Normaliza nome do instrumento (lowercase, sem acentos)."""
    if not name:
        return ""
    name = name.strip().lower()
    # Remove acentos
    name = unicodedata.normalize("NFKD", name)
    name = "".join([c for c in name if not unicodedata.combining(c)])
    return name


def expand_compound_instrument(instrument: str) -> list[str]:
    """
    Expande instrumentos compostos em instrumentos individuais.
    Ex: "violao e vocal" -> ["violao", "vocal"]
    Ex: "guitarra/baixo" -> ["guitarra", "baixo"]
    """
    normalized = normalize_instrument(instrument)

    # Padrões de separadores comuns
    separators = [" e ", " / ", "/", " & ", ", ", " - "]

    for sep in separators:
        if sep in normalized:
            parts = normalized.split(sep)
            return [p.strip() for p in parts if p.strip()]

    return [normalized]


class Command(BaseCommand):
    help = "Limpa e normaliza instrumentos dos músicos, removendo duplicatas."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mostra o que seria alterado sem modificar o banco.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(
                self.style.WARNING("=== MODO DRY-RUN: Nenhuma alteração será feita ===\n")
            )

        musicians = Musician.objects.all()
        total = musicians.count()
        updated = 0
        skipped = 0

        self.stdout.write(f"Processando {total} músicos...\n")

        for musician in musicians:
            username = musician.user.username
            old_instrument = musician.instrument
            old_instruments = musician.instruments.copy() if musician.instruments else []

            # Coletar todos os instrumentos (principal + lista)
            all_instruments = []

            # Primeiro, adicionar o instrumento principal
            if old_instrument:
                expanded = expand_compound_instrument(old_instrument)
                all_instruments.extend(expanded)

            # Depois, adicionar os da lista instruments
            for inst in old_instruments:
                expanded = expand_compound_instrument(inst)
                all_instruments.extend(expanded)

            # Normalizar todos
            normalized = [normalize_instrument(i) for i in all_instruments if i]

            # Remover duplicatas mantendo ordem
            seen = set()
            unique = []
            for inst in normalized:
                if inst and inst not in seen:
                    seen.add(inst)
                    unique.append(inst)

            # Determinar novo instrumento principal (primeiro da lista)
            new_instrument = unique[0] if unique else old_instrument
            new_instruments = unique

            # Verificar se houve mudança
            changed = new_instrument != old_instrument or new_instruments != old_instruments

            if changed:
                updated += 1
                self.stdout.write(f"\n{self.style.WARNING(username)}:")
                self.stdout.write(f"  Antes: instrument='{old_instrument}'")
                self.stdout.write(f"         instruments={old_instruments}")
                self.stdout.write(f"  Depois: instrument='{self.style.SUCCESS(new_instrument)}'")
                self.stdout.write(
                    f"          instruments={self.style.SUCCESS(str(new_instruments))}"
                )

                if not dry_run:
                    musician.instrument = new_instrument
                    musician.instruments = new_instruments
                    musician.save(update_fields=["instrument", "instruments"])
            else:
                skipped += 1

        self.stdout.write(f"\n{'=' * 50}")
        self.stdout.write(f"Total: {total} músicos")
        self.stdout.write(f"Alterados: {self.style.SUCCESS(str(updated))}")
        self.stdout.write(f"Sem alteração: {skipped}")

        if dry_run and updated > 0:
            self.stdout.write(
                self.style.WARNING("\nExecute sem --dry-run para aplicar as alterações.")
            )

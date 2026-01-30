from datetime import date, datetime, time

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from marketplace.models import Gig


class Command(BaseCommand):
    help = "Cria vagas exemplo para o marketplace de músicos freelancers"

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Gerando vagas de marketplace de exemplo..."))

        sample_gigs = [
            {
                "title": "Show corporativo em Uberlândia",
                "description": "Evento corporativo para 300 pessoas. Repertório pop/rock internacional, set de 2h45.",
                "city": "Uberlândia, MG",
                "location": "Espaço Horizonte",
                "event_date": "2026-01-20",
                "start_time": "20:00",
                "end_time": "23:00",
                "budget": "2500.00",
                "contact_name": "Mariana Silva",
                "contact_email": "contato@empresa.com",
                "contact_phone": "(34) 99999-1111",
                "genres": "pop, rock, internacional",
                "owner": "sara",
            },
            {
                "title": "Casamento acústico em Patos de Minas",
                "description": "Cerimônia e recepção ao ar livre. Voz e violão, setlist leve (MPB e pop acústico).",
                "city": "Patos de Minas, MG",
                "location": "Sítio Bela Vista",
                "event_date": "2026-02-14",
                "start_time": "18:00",
                "end_time": "21:00",
                "budget": "1800.00",
                "contact_name": "João e Ana",
                "contact_email": "cerimonial@casamento.com",
                "contact_phone": "(34) 98888-5555",
                "genres": "acústico, MPB, pop",
                "owner": "arthur",
            },
            {
                "title": "Festival universitário - Set autoral",
                "description": "Line-up com bandas independentes. Palco principal e som completo, busca banda autoral.",
                "city": "Uberaba, MG",
                "location": "Arena Campus",
                "event_date": "2026-03-05",
                "start_time": "21:00",
                "end_time": "23:30",
                "budget": "3200.00",
                "contact_name": "Produtora Horizonte",
                "contact_email": "booking@horizonte.com",
                "contact_phone": "(34) 97777-4444",
                "genres": "rock, indie, pop",
                "owner": "roberto",
            },
        ]

        def parse_date(value: str) -> date:
            return datetime.strptime(value, "%Y-%m-%d").date()

        def parse_time(value: str) -> time:
            return datetime.strptime(value, "%H:%M").time()

        owners_priority = ["sara", "roberto", "arthur"]
        default_owner = (
            User.objects.filter(username__in=owners_priority).first() or User.objects.first()
        )

        created, updated = 0, 0

        for data in sample_gigs:
            owner = User.objects.filter(username=data.get("owner")).first() or default_owner

            payload = {
                "description": data["description"],
                "city": data["city"],
                "location": data["location"],
                "event_date": parse_date(data["event_date"]),
                "start_time": parse_time(data["start_time"]),
                "end_time": parse_time(data["end_time"]),
                "budget": data["budget"],
                "contact_name": data["contact_name"],
                "contact_email": data["contact_email"],
                "contact_phone": data["contact_phone"],
                "genres": data["genres"],
                "status": "open",
                "created_by": owner,
            }

            gig, was_created = Gig.objects.update_or_create(
                title=data["title"],
                defaults=payload,
            )

            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Vagas criadas: {created} | atualizadas: {updated}"))
        self.stdout.write(self.style.SUCCESS("Marketplace pronto para testes rápidos."))

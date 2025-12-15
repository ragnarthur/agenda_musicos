from datetime import datetime, timedelta, time

from django.core.management.base import BaseCommand

from agenda.models import Musician, LeaderAvailability


class Command(BaseCommand):
    help = 'Cria disponibilidades fictícias para músicos demo (e base) para facilitar convites'

    def handle(self, *args, **options):
        # Agenda base: próxima semana, slots variados
        today = datetime.now().date()
        base_dates = [today + timedelta(days=delta) for delta in range(1, 8)]

        slots = [
            (time(18, 0), time(21, 0)),
            (time(20, 0), time(23, 0)),
            (time(14, 0), time(17, 0)),
        ]

        musicians = Musician.objects.filter(is_active=True)

        created = 0
        for musician in musicians:
            for d in base_dates:
                start_time, end_time = slots[(d.day + musician.id) % len(slots)]
                LeaderAvailability.objects.get_or_create(
                    leader=musician,
                    date=d,
                    start_time=start_time,
                    end_time=end_time,
                    defaults={
                        'notes': 'Disponível para gigs (slot demo)',
                        'is_public': True,
                    }
                )
                created += 1

        self.stdout.write(self.style.SUCCESS(f'Disponibilidades demo criadas para {musicians.count()} músicos (total de {created} slots).'))

from datetime import datetime, timedelta, time

from django.core.management.base import BaseCommand
from django.utils import timezone

from agenda.models import Musician, LeaderAvailability, Event


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
        events = Event.objects.filter(
            status__in=['proposed', 'approved', 'confirmed']
        ).only('start_datetime', 'end_datetime')
        buffer = timedelta(minutes=40)

        created = 0
        for musician in musicians:
            for d in base_dates:
                start_time, end_time = slots[(d.day + musician.id) % len(slots)]
                start_dt = timezone.make_aware(datetime.combine(d, start_time))
                end_dt = timezone.make_aware(datetime.combine(d, end_time))

                # pula se há conflito com evento existente (considerando buffer)
                conflict_exists = events.filter(
                    start_datetime__lt=end_dt + buffer,
                    end_datetime__gt=start_dt - buffer,
                ).exists()
                if conflict_exists:
                    continue

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

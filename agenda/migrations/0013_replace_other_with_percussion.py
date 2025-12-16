# Generated manually to atualizar instrumentos "other" para "percussion"
from django.db import migrations


def forwards(apps, schema_editor):
    Musician = apps.get_model('agenda', 'Musician')
    EventInstrument = apps.get_model('agenda', 'EventInstrument')
    Musician.objects.filter(instrument='other').update(instrument='percussion')
    EventInstrument.objects.filter(instrument='other').update(instrument='percussion')


def backwards(apps, schema_editor):
    Musician = apps.get_model('agenda', 'Musician')
    EventInstrument = apps.get_model('agenda', 'EventInstrument')
    Musician.objects.filter(instrument='percussion').update(instrument='other')
    EventInstrument.objects.filter(instrument='percussion').update(instrument='other')


class Migration(migrations.Migration):

    dependencies = [
        ('agenda', '0012_add_instruments_and_ratings'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]

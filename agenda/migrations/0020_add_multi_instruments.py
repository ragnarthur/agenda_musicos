from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('agenda', '0019_trial_fields'),
    ]

    operations = [
        migrations.add_field(
            model_name='musician',
            name='instruments',
            field=models.JSONField(blank=True, default=list, help_text='Lista de instrumentos (multi-instrumentista)'),
        ),
        migrations.add_field(
            model_name='pendingregistration',
            name='instruments',
            field=models.JSONField(blank=True, default=list),
        ),
    ]

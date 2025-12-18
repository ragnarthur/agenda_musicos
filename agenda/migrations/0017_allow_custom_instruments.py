from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('agenda', '0016_pending_registration'),
    ]

    operations = [
        migrations.AlterField(
            model_name='musician',
            name='instrument',
            field=models.CharField(max_length=50, help_text='Instrumento principal do músico'),
        ),
        migrations.AlterField(
            model_name='eventinstrument',
            name='instrument',
            field=models.CharField(max_length=50, help_text='Tipo de instrumento necessário'),
        ),
        migrations.AlterField(
            model_name='pendingregistration',
            name='instrument',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]

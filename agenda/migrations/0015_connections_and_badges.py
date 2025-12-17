from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('agenda', '0014_update_instrument_choices'),
    ]

    operations = [
        migrations.CreateModel(
            name='Connection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('connection_type', models.CharField(choices=[('follow', 'Seguir favorito'), ('call_later', 'Ligar depois'), ('recommend', 'Indicar para vaga'), ('played_with', 'Já toquei com')], default='follow', max_length=20)),
                ('verified', models.BooleanField(default=False, help_text='Marcação de "já toquei com" confirmada')),
                ('notes', models.CharField(blank=True, max_length=255, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('follower', models.ForeignKey(help_text='Músico que iniciou a conexão', on_delete=django.db.models.deletion.CASCADE, related_name='connections_from', to='agenda.musician')),
                ('target', models.ForeignKey(help_text='Músico alvo da conexão', on_delete=django.db.models.deletion.CASCADE, related_name='connections_to', to='agenda.musician')),
            ],
            options={
                'verbose_name': 'Conexão de Músico',
                'verbose_name_plural': 'Conexões de Músico',
                'ordering': ['-created_at'],
                'unique_together': {('follower', 'target', 'connection_type')},
            },
        ),
        migrations.CreateModel(
            name='MusicianBadge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.CharField(help_text='Identificador da badge (ex: first_show)', max_length=50)),
                ('name', models.CharField(max_length=100)),
                ('description', models.CharField(blank=True, max_length=255, null=True)),
                ('icon', models.CharField(blank=True, help_text='Emoji opcional', max_length=10, null=True)),
                ('awarded_at', models.DateTimeField(auto_now_add=True)),
                ('musician', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='badges', to='agenda.musician')),
            ],
            options={
                'verbose_name': 'Badge de Músico',
                'verbose_name_plural': 'Badges de Músico',
                'ordering': ['-awarded_at'],
                'unique_together': {('musician', 'slug')},
            },
        ),
    ]

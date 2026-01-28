# Generated manually - field already added to database
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("agenda", "0030_add_instrument_model"),
    ]

    operations = [
        # Campo avatar_url já foi adicionado manualmente ao auth_user
        migrations.RunSQL(sql="SELECT 1", reverse_sql="SELECT 1"),
    ]

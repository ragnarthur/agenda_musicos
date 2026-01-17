# Generated manually - add unique constraint on auth_user.email
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('agenda', '0026_add_profile_images'),
    ]

    operations = [
        migrations.RunSQL(
            sql='CREATE UNIQUE INDEX IF NOT EXISTS auth_user_email_unique ON auth_user (email);',
            reverse_sql='DROP INDEX IF EXISTS auth_user_email_unique;',
        ),
    ]

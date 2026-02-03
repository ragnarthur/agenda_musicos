# Generated on 2026-02-03

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("agenda", "0038_ensure_auditlog_table"),
    ]

    operations = [
        migrations.AlterField(
            model_name="eventlog",
            name="action",
            field=models.CharField(
                max_length=30,
                choices=[
                    ("created", "Criado"),
                    ("approved", "Aprovado"),
                    ("rejected", "Rejeitado"),
                    ("cancelled", "Cancelado"),
                    ("availability", "Disponibilidade"),
                    ("notification", "Notificacao"),
                    ("user_delete", "Usuario Deletado"),
                    ("organization_delete", "Organizacao Deletada"),
                ],
            ),
        ),
    ]

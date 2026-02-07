from django.db import migrations, models


def forwards_convert_maybe_to_pending(apps, schema_editor):
    Availability = apps.get_model("agenda", "Availability")
    # "maybe" deixou de existir: convertemos para "pending" para que o musico responda novamente.
    Availability.objects.filter(response="maybe").update(response="pending", responded_at=None)


def backwards_noop(apps, schema_editor):
    # Sem rollback automatico: nao ha como recuperar o estado "maybe" com seguranca.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("agenda", "0047_musician_name_changes_count_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="availability",
            name="response",
            field=models.CharField(
                choices=[
                    ("pending", "Pendente"),
                    ("available", "Disponível"),
                    ("unavailable", "Indisponível"),
                ],
                db_index=True,
                default="pending",
                max_length=20,
            ),
        ),
        migrations.RunPython(forwards_convert_maybe_to_pending, backwards_noop),
    ]


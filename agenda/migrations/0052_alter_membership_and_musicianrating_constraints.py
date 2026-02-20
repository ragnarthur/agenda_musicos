from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("agenda", "0051_pwaanalyticsevent"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Membership: unique_together → UniqueConstraint
        migrations.AlterUniqueTogether(
            name="membership",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="membership",
            constraint=models.UniqueConstraint(
                fields=["user", "organization"],
                name="unique_membership_user_org",
            ),
        ),
        # MusicianRating: unique_together → UniqueConstraint
        migrations.AlterUniqueTogether(
            name="musicianrating",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="musicianrating",
            constraint=models.UniqueConstraint(
                fields=["event", "musician", "rated_by"],
                name="unique_musician_rating_per_event",
            ),
        ),
    ]

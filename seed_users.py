from django.contrib.auth.models import User
from agenda.models import Musician, Organization, Membership

users = [
    {"username": "sara", "first": "Sara", "last": "Carmo", "password": "sara2025@", "instrument": "guitar", "role": "member", "bio": "Vocal e violão", "email": "saram.carmo@hotmail.com", "phone": "(17)99193-3859", "instagram": "@saracarmocantora"},
    {"username": "arthur", "first": "Arthur", "last": "Araújo", "password": "arthur2025@", "instrument": "guitar", "role": "member", "bio": "Vocal, violão e guitarra", "email": "catsinthegarden01@gmail.com", "phone": "(34) 98811-5465", "instagram": "@arthuraraujo07"},
    {"username": "roberto", "first": "Roberto", "last": "Guimarães", "password": "roberto2025@", "instrument": "drums", "role": "leader", "bio": "Baterista e líder", "email": "riguimaandroid@gmail.com", "phone": "(34) 99174-3948", "instagram": "@roberto.guimaraes.299"},
]

admin, _ = User.objects.get_or_create(username="admin", defaults={"email": "admin@example.com"})
admin.set_password("admin2025@")
admin.is_staff = True
admin.is_superuser = True
admin.save()

for u in users:
    user, _ = User.objects.get_or_create(username=u["username"], defaults={"first_name": u["first"], "last_name": u["last"], "email": u.get("email", "")})
    user.first_name = u["first"]
    user.last_name = u["last"]
    user.email = u.get("email", "") or user.email
    user.set_password(u["password"])
    user.save()
    org_defaults = {"subscription_status": "active"}
    if u["username"] == "roberto":
        org_defaults["owner"] = user
    org, _ = Organization.objects.get_or_create(name="Banda Principal", defaults=org_defaults)
    # Garante owner como Roberto se existir
    if org.owner is None and u["username"] == "roberto":
        org.owner = user
        org.save(update_fields=["owner"])

    Membership.objects.get_or_create(user=user, organization=org, defaults={"role": "owner" if u["username"] == "roberto" else "member", "status": "active"})
    Musician.objects.update_or_create(
        user=user,
        defaults={
            "instrument": u["instrument"],
            "role": u["role"],
            "bio": u.get("bio", ""),
            "phone": u.get("phone", ""),
            "instagram": u.get("instagram", ""),
            "is_active": True,
            "organization": org
        }
    )

print("usuarios seed ok")

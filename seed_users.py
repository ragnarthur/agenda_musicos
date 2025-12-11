from django.contrib.auth.models import User
from agenda.models import Musician

users = [
    {"username": "sara", "first": "Sara", "last": "Carmo", "password": "sara2025@", "instrument": "guitar", "role": "member", "bio": "Vocal e violão"},
    {"username": "arthur", "first": "Arthur", "last": "Araújo", "password": "arthur2025@", "instrument": "guitar", "role": "member", "bio": "Vocal, violão e guitarra"},
    {"username": "roberto", "first": "Roberto", "last": "Guimarães", "password": "roberto2025@", "instrument": "drums", "role": "leader", "bio": "Baterista e líder"},
]

admin, _ = User.objects.get_or_create(username="admin", defaults={"email": "admin@example.com"})
admin.set_password("admin2025@")
admin.is_staff = True
admin.is_superuser = True
admin.save()

for u in users:
    user, _ = User.objects.get_or_create(username=u["username"], defaults={"first_name": u["first"], "last_name": u["last"]})
    user.first_name = u["first"]
    user.last_name = u["last"]
    user.set_password(u["password"])
    user.save()
    Musician.objects.update_or_create(
        user=user,
        defaults={"instrument": u["instrument"], "role": u["role"], "bio": u.get("bio", ""), "is_active": True}
    )

print("usuarios seed ok")

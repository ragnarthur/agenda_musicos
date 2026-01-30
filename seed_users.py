import os
import secrets

from django.contrib.auth.models import User

from agenda.models import Membership, Musician, Organization

users = [
    {
        "username": "sara",
        "first": "Sara",
        "last": "Carmo",
        "instrument": "guitar",
        "role": "member",
        "bio": "Vocal e violão",
        "email": "saram.carmo@hotmail.com",
        "phone": "(17)99193-3859",
        "instagram": "@saracarmocantora",
    },
    {
        "username": "arthur",
        "first": "Arthur",
        "last": "Araújo",
        "instrument": "guitar",
        "role": "member",
        "bio": "Vocal, violão e guitarra",
        "email": "catsinthegarden01@gmail.com",
        "phone": "(34) 98811-5465",
        "instagram": "@arthuraraujo07",
    },
    {
        "username": "roberto",
        "first": "Roberto",
        "last": "Guimarães",
        "instrument": "drums",
        "role": "member",
        "bio": "Baterista",
        "email": "riguimaandroid@gmail.com",
        "phone": "(34) 99174-3948",
        "instagram": "@roberto.guimaraes.299",
    },
]


def get_password(username):
    """
    Obtém senha para usuário com prioridade:
    1. Variável de ambiente {USERNAME}_PASSWORD
    2. Senha padrão para desenvolvimento (somente se DEBUG=True)
    3. Gera senha aleatória segura para produção
    """
    env_key = f"{username.upper()}_PASSWORD"
    env_password = os.environ.get(env_key)

    if env_password:
        return env_password

    if os.environ.get("DEBUG") == "True":
        return f"{username}2026@"

    return secrets.token_urlsafe(16)


admin, _ = User.objects.get_or_create(username="admin", defaults={"email": "admin@example.com"})
admin_password = os.environ.get("ADMIN_PASSWORD") or (
    f"admin2026@" if os.environ.get("DEBUG") == "True" else secrets.token_urlsafe(16)
)
admin.set_password(admin_password)
admin.is_staff = True
admin.is_superuser = True
admin.save()

if os.environ.get("DEBUG") != "True":
    print(f"Admin password: {admin_password}")
    print(f"⚠️  Salve esta senha! Ela não será exibida novamente.")

for u in users:
    user, _ = User.objects.get_or_create(
        username=u["username"],
        defaults={
            "first_name": u["first"],
            "last_name": u["last"],
            "email": u.get("email", ""),
        },
    )
    user.first_name = u["first"]
    user.last_name = u["last"]
    user.email = u.get("email", "") or user.email

    password = get_password(u["username"])
    user.set_password(password)
    user.save()

    org_defaults = {"subscription_status": "active"}
    if u["username"] == "roberto":
        org_defaults["owner"] = user
    org, _ = Organization.objects.get_or_create(name="Banda Principal", defaults=org_defaults)
    if org.owner is None and u["username"] == "roberto":
        org.owner = user
        org.save(update_fields=["owner"])

    Membership.objects.get_or_create(
        user=user,
        organization=org,
        defaults={
            "role": "owner" if u["username"] == "roberto" else "member",
            "status": "active",
        },
    )
    Musician.objects.update_or_create(
        user=user,
        defaults={
            "instrument": u["instrument"],
            "role": u["role"],
            "bio": u.get("bio", ""),
            "phone": u.get("phone", ""),
            "instagram": u.get("instagram", ""),
            "is_active": True,
            "organization": org,
        },
    )

print("usuarios seed ok")

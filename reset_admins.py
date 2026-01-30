"""
Script para resetar administradores e criar com senha correta.
Usa set_password() para garantir que a senha seja criptografada corretamente.
"""

import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User

print("=== Resetando administradores ===")

# Deletar usuários existentes
User.objects.filter(is_superuser=True).delete()
print("Usuários administradores deletados.")

# Criar novos administradores
admin_1 = User(username="admin_1", email="admin_1@gigflow.com.br", is_superuser=True, is_staff=True)
admin_1.set_password("Teste123@")
admin_1.save()
print("✓ admin_1 criado")

admin_2 = User(username="admin_2", email="admin_2@gigflow.com.br", is_superuser=True, is_staff=True)
admin_2.set_password("Teste123@")
admin_2.save()
print("✓ admin_2 criado")

print("\n=== Verificando ===")
for u in User.objects.filter(is_superuser=True):
    print(f"Usuário: {u.username}, Email: {u.email}")

print("\n✓ Administradores criados com sucesso!")

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from agenda.models import Membership, Musician, Organization


class Command(BaseCommand):
    help = "Cria dados de exemplo para Monte Carmelo-MG (patrocinadores e musicos)"

    SPONSORS = [
        {
            "name": "Bar do Joao",
            "org_type": "venue",
            "sponsor_tier": "gold",
            "city": "Monte Carmelo",
            "state": "MG",
            "description": "O melhor bar de Monte Carmelo com musica ao vivo todo fim de semana.",
            "website": "https://bardojoao.com.br",
        },
        {
            "name": "Pizzaria Bella Monte",
            "org_type": "company",
            "sponsor_tier": "silver",
            "city": "Monte Carmelo",
            "state": "MG",
            "description": "Pizzaria tradicional com ambiente acolhedor.",
            "website": "https://pizzariabella.com.br",
        },
        {
            "name": "Loja Musical MC",
            "org_type": "company",
            "sponsor_tier": "bronze",
            "city": "Monte Carmelo",
            "state": "MG",
            "description": "Instrumentos musicais, acessorios e assistencia tecnica.",
            "website": "https://lojamusicalmc.com.br",
        },
    ]

    MUSICIANS = [
        {
            "username": "carlos_mc",
            "first_name": "Carlos",
            "last_name": "Silva",
            "instrument": "guitar",
            "instruments": ["guitar", "acoustic_guitar"],
            "bio": "Guitarrista e violonista em Monte Carmelo. Toco em bares, casamentos e eventos corporativos. Repertorio variado de MPB a rock.",
            "email": "carlos@montecarmelo.demo",
            "phone": "(34) 99888-1111",
            "instagram": "@carlossilva.music",
            "city": "Monte Carmelo",
            "state": "MG",
        },
        {
            "username": "maria_mc",
            "first_name": "Maria",
            "last_name": "Santos",
            "instrument": "vocal",
            "instruments": ["vocal"],
            "bio": "Cantora de Monte Carmelo. Especialista em musica sertaneja e MPB. Faco shows solos com playback ou com banda.",
            "email": "maria@montecarmelo.demo",
            "phone": "(34) 99777-2222",
            "instagram": "@mariasantos.voz",
            "city": "Monte Carmelo",
            "state": "MG",
        },
        {
            "username": "joao_mc",
            "first_name": "Joao",
            "last_name": "Oliveira",
            "instrument": "drums",
            "instruments": ["drums", "percussion", "cajon"],
            "bio": "Baterista e percussionista de Monte Carmelo. Disponivel para eventos, gravacoes e aulas. Experiencia em diversos estilos musicais.",
            "email": "joao@montecarmelo.demo",
            "phone": "(34) 99666-3333",
            "instagram": "@joaodrums",
            "city": "Monte Carmelo",
            "state": "MG",
        },
        {
            "username": "ana_mc",
            "first_name": "Ana",
            "last_name": "Costa",
            "instrument": "keyboard",
            "instruments": ["keyboard", "piano"],
            "bio": "Tecladista e pianista. Acompanho cantores, faco musica ambiente e participo de bandas de casamento.",
            "email": "ana@montecarmelo.demo",
            "phone": "(34) 99555-4444",
            "instagram": "@anacosta.keys",
            "city": "Monte Carmelo",
            "state": "MG",
        },
        {
            "username": "pedro_mc",
            "first_name": "Pedro",
            "last_name": "Ferreira",
            "instrument": "bass",
            "instruments": ["bass", "acoustic_guitar"],
            "bio": "Baixista de Monte Carmelo. Toco em bandas de baile, gravacoes e eventos. Tambem faco violao para rodas de amigos.",
            "email": "pedro@montecarmelo.demo",
            "phone": "(34) 99444-5555",
            "instagram": "@pedrobaixo",
            "city": "Monte Carmelo",
            "state": "MG",
        },
    ]

    def handle(self, *args, **options):
        self.stdout.write("Criando dados para Monte Carmelo-MG...\n")

        # Create sponsors
        sponsors_created = 0
        for data in self.SPONSORS:
            org, created = Organization.objects.update_or_create(
                name=data["name"],
                defaults={
                    "org_type": data["org_type"],
                    "is_sponsor": True,
                    "sponsor_tier": data["sponsor_tier"],
                    "city": data["city"],
                    "state": data["state"],
                    "description": data["description"],
                    "website": data.get("website"),
                },
            )
            if created:
                sponsors_created += 1
            self.stdout.write(f"  Patrocinador: {org.name} ({org.sponsor_tier})")

        # Create demo organization for musicians
        musicians_org, _ = Organization.objects.get_or_create(
            name="Musicos Monte Carmelo",
            defaults={
                "org_type": "band",
                "city": "Monte Carmelo",
                "state": "MG",
            },
        )

        # Create musicians
        musicians_created = 0
        for data in self.MUSICIANS:
            user, user_created = User.objects.get_or_create(
                username=data["username"],
                defaults={
                    "first_name": data["first_name"],
                    "last_name": data["last_name"],
                    "email": data["email"],
                },
            )
            user.first_name = data["first_name"]
            user.last_name = data["last_name"]
            user.email = data["email"]
            user.set_password(f"{data['username']}2026@")
            user.save()

            Membership.objects.get_or_create(
                user=user,
                organization=musicians_org,
                defaults={"role": "member", "status": "active"},
            )

            musician, musician_created = Musician.objects.update_or_create(
                user=user,
                defaults={
                    "instrument": data["instrument"],
                    "instruments": data.get("instruments", []),
                    "role": "member",
                    "bio": data["bio"],
                    "phone": data["phone"],
                    "instagram": data["instagram"],
                    "city": data["city"],
                    "state": data["state"],
                    "is_active": True,
                    "organization": musicians_org,
                },
            )
            if musician_created:
                musicians_created += 1
            self.stdout.write(f'  Musico: {musician.user.get_full_name()} ({data["instrument"]})')

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Patrocinadores criados: {sponsors_created} | Musicos criados: {musicians_created}"
            )
        )
        self.stdout.write(self.style.SUCCESS("Senhas: <username>2026@ (ex: carlos_mc2026@)"))
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Monte Carmelo-MG configurado com sucesso!"))

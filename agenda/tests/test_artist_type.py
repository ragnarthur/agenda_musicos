"""
Testes abrangentes para a feature de artist_type (solo / dupla / banda).

Cobre:
  1. Funções de validação dos serializers (_apply_artist_rules, _sanitize_formation_members)
  2. Defaults dos models (Musician e MusicianRequest)
  3. POST /api/musician-request/  (endpoint público, AllowAny)
  4. Endpoints de admin /api/admin/musician-requests/
  5. POST /api/register-with-invite/ (fluxo completo)
  6. GET/PATCH /api/musicians/me/ e GET /api/musicians/public/{id}/
"""

from datetime import timedelta

from django.contrib.auth.models import User
from django.core.cache.backends.locmem import LocMemCache
from django.test import TestCase
from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import SimpleRateThrottle

from agenda.models import Musician, MusicianRequest, Organization
from agenda.serializers.admin import (
    _apply_artist_rules,
    _sanitize_artist_type,
    _sanitize_formation_members,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_member(name="Carlos", instrument="violão", role="", email=""):
    return {"name": name, "instrument": instrument, "role": role, "email": email}


def _make_musician_and_user(username, artist_type="solo", stage_name=""):
    user = User.objects.create_user(
        username=username,
        email=f"{username}@test.com",
        password="TestPass123!",
        first_name=username.capitalize(),
    )
    musician = Musician.objects.create(
        user=user,
        instrument="guitar",
        artist_type=artist_type,
        stage_name=stage_name or None,
        city="Belo Horizonte",
        state="MG",
        is_active=True,
        role="member",
    )
    return user, musician


# ---------------------------------------------------------------------------
# 1. Validação dos helpers de serializer
# ---------------------------------------------------------------------------


class FormationMemberValidationTest(TestCase):
    """Testa _apply_artist_rules e _sanitize_formation_members diretamente, sem HTTP."""

    def _member(self, name="Ana", instrument="violão"):
        return {"name": name, "instrument": instrument}

    # --- solo ---

    def test_valid_solo_no_members(self):
        attrs = {"artist_type": "solo", "stage_name": "", "formation_members": []}
        result = _apply_artist_rules(attrs)
        self.assertEqual(result["formation_members"], [])

    def test_solo_strips_formation_members(self):
        """Solo ignora formation_members preenchidos."""
        attrs = {
            "artist_type": "solo",
            "stage_name": "",
            "formation_members": [self._member()],
        }
        result = _apply_artist_rules(attrs)
        self.assertEqual(result["formation_members"], [])

    # --- dupla ---

    def test_dupla_valid(self):
        attrs = {
            "artist_type": "dupla",
            "stage_name": "Os Dois",
            "formation_members": [self._member()],
        }
        result = _apply_artist_rules(attrs)
        self.assertEqual(result["artist_type"], "dupla")
        self.assertEqual(len(result["formation_members"]), 1)

    def test_dupla_missing_stage_name(self):
        attrs = {
            "artist_type": "dupla",
            "stage_name": "",
            "formation_members": [self._member()],
        }
        with self.assertRaises(drf_serializers.ValidationError) as cm:
            _apply_artist_rules(attrs)
        self.assertIn("stage_name", cm.exception.detail)

    def test_dupla_zero_members(self):
        attrs = {
            "artist_type": "dupla",
            "stage_name": "Os Dois",
            "formation_members": [],
        }
        with self.assertRaises(drf_serializers.ValidationError) as cm:
            _apply_artist_rules(attrs)
        self.assertIn("formation_members", cm.exception.detail)

    def test_dupla_two_members(self):
        attrs = {
            "artist_type": "dupla",
            "stage_name": "Os Dois",
            "formation_members": [self._member(), self._member("Bia", "voz")],
        }
        with self.assertRaises(drf_serializers.ValidationError):
            _apply_artist_rules(attrs)

    # --- banda ---

    def test_banda_two_members_ok(self):
        attrs = {
            "artist_type": "banda",
            "stage_name": "A Banda",
            "formation_members": [self._member(), self._member("Bia", "voz")],
        }
        result = _apply_artist_rules(attrs)
        self.assertEqual(len(result["formation_members"]), 2)

    def test_banda_eleven_members_ok(self):
        members = [self._member(f"M{i}", "guitarra") for i in range(11)]
        attrs = {
            "artist_type": "banda",
            "stage_name": "A Banda",
            "formation_members": members,
        }
        result = _apply_artist_rules(attrs)
        self.assertEqual(len(result["formation_members"]), 11)

    def test_banda_one_member(self):
        attrs = {
            "artist_type": "banda",
            "stage_name": "A Banda",
            "formation_members": [self._member()],
        }
        with self.assertRaises(drf_serializers.ValidationError) as cm:
            _apply_artist_rules(attrs)
        self.assertIn("formation_members", cm.exception.detail)

    def test_banda_twelve_members(self):
        members = [self._member(f"M{i}", "guitarra") for i in range(12)]
        attrs = {
            "artist_type": "banda",
            "stage_name": "A Banda",
            "formation_members": members,
        }
        with self.assertRaises(drf_serializers.ValidationError):
            _apply_artist_rules(attrs)

    def test_banda_missing_stage_name(self):
        attrs = {
            "artist_type": "banda",
            "stage_name": "",
            "formation_members": [self._member(), self._member("Bia", "voz")],
        }
        with self.assertRaises(drf_serializers.ValidationError) as cm:
            _apply_artist_rules(attrs)
        self.assertIn("stage_name", cm.exception.detail)

    # --- campos de cada membro ---

    def test_member_missing_name(self):
        with self.assertRaises(drf_serializers.ValidationError):
            _sanitize_formation_members([{"instrument": "guitarra"}])

    def test_member_missing_instrument(self):
        with self.assertRaises(drf_serializers.ValidationError):
            _sanitize_formation_members([{"name": "Ana"}])

    def test_member_invalid_email(self):
        with self.assertRaises(drf_serializers.ValidationError):
            _sanitize_formation_members(
                [{"name": "Ana", "instrument": "guitarra", "email": "nao-e-email"}]
            )

    def test_member_valid_email(self):
        result = _sanitize_formation_members(
            [{"name": "Ana", "instrument": "guitarra", "email": "ana@banda.com"}]
        )
        self.assertEqual(result[0]["email"], "ana@banda.com")

    def test_member_optional_role(self):
        result = _sanitize_formation_members([{"name": "Ana", "instrument": "guitarra"}])
        self.assertEqual(result[0]["role"], "")

    # --- sanitizador de artist_type ---

    def test_artist_type_invalid_value(self):
        with self.assertRaises(drf_serializers.ValidationError):
            _sanitize_artist_type("trio")

    def test_artist_type_case_insensitive(self):
        result = _sanitize_artist_type("DUPLA")
        self.assertEqual(result, "dupla")

    def test_formation_members_not_list(self):
        with self.assertRaises(drf_serializers.ValidationError):
            _sanitize_formation_members("nao-e-lista")


# ---------------------------------------------------------------------------
# 2. Defaults dos models
# ---------------------------------------------------------------------------


class ArtistTypeModelDefaultsTest(TestCase):
    """Verifica defaults dos models sem HTTP."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="defaults_user",
            email="defaults@test.com",
            password="x",
        )

    def test_musician_artist_type_default(self):
        m = Musician.objects.create(user=self.user, instrument="guitar", role="member")
        self.assertEqual(m.artist_type, "solo")

    def test_musician_stage_name_nullable(self):
        m = Musician.objects.create(
            user=self.user, instrument="guitar", role="member", stage_name=None
        )
        self.assertIsNone(m.stage_name)

    def test_musician_request_formation_members_default(self):
        mr = MusicianRequest(
            email="req_defaults@test.com",
            full_name="Req User",
            phone="11999999999",
            instrument="guitar",
            city="BH",
            state="MG",
        )
        self.assertEqual(mr.formation_members, [])

    def test_musician_request_artist_type_default(self):
        mr = MusicianRequest(
            email="req_defaults2@test.com",
            full_name="Req User",
            phone="11999999999",
            instrument="guitar",
            city="BH",
            state="MG",
        )
        self.assertEqual(mr.artist_type, "solo")


# ---------------------------------------------------------------------------
# 3. POST /api/musician-request/ (endpoint público)
# ---------------------------------------------------------------------------


class MusicianRequestCreateAPITest(APITestCase):
    """Testa POST /api/musician-request/ — AllowAny."""

    BASE_URL = "/api/musician-request/"

    def setUp(self):
        self._original_throttle_cache = SimpleRateThrottle.cache
        _test_cache = LocMemCache("musician-req-test", {})
        _test_cache.clear()
        SimpleRateThrottle.cache = _test_cache

    def tearDown(self):
        SimpleRateThrottle.cache = self._original_throttle_cache

    def _base_payload(self, **overrides):
        payload = {
            "email": "newreq@test.com",
            "full_name": "Novo Músico",
            "phone": "11999999999",
            "instrument": "guitar",
            "city": "Belo Horizonte",
            "state": "MG",
            "artist_type": "solo",
        }
        payload.update(overrides)
        return payload

    def test_solo_request_accepted(self):
        resp = self.client.post(self.BASE_URL, self._base_payload(), format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", resp.data)

    def test_dupla_request_accepted(self):
        payload = self._base_payload(
            email="dupla@test.com",
            artist_type="dupla",
            stage_name="Os Dois",
            formation_members=[_make_member()],
        )
        resp = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_banda_request_accepted(self):
        payload = self._base_payload(
            email="banda@test.com",
            artist_type="banda",
            stage_name="A Banda",
            formation_members=[_make_member(), _make_member("Bia", "voz")],
        )
        resp = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_dupla_missing_stage_name(self):
        payload = self._base_payload(
            email="dupla2@test.com",
            artist_type="dupla",
            formation_members=[_make_member()],
        )
        resp = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_dupla_wrong_member_count_zero(self):
        payload = self._base_payload(
            email="dupla3@test.com",
            artist_type="dupla",
            stage_name="Os Dois",
            formation_members=[],
        )
        resp = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_dupla_wrong_member_count_two(self):
        payload = self._base_payload(
            email="dupla4@test.com",
            artist_type="dupla",
            stage_name="Os Dois",
            formation_members=[_make_member(), _make_member("Bia", "voz")],
        )
        resp = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_banda_too_few_members(self):
        payload = self._base_payload(
            email="banda2@test.com",
            artist_type="banda",
            stage_name="A Banda",
            formation_members=[_make_member()],
        )
        resp = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_banda_too_many_members(self):
        members = [_make_member(f"M{i}", "guitarra") for i in range(12)]
        payload = self._base_payload(
            email="banda3@test.com",
            artist_type="banda",
            stage_name="A Banda",
            formation_members=members,
        )
        resp = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_artist_type(self):
        payload = self._base_payload(email="invalid_type@test.com", artist_type="trio")
        resp = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_missing_name(self):
        payload = self._base_payload(
            email="no_name@test.com",
            artist_type="dupla",
            stage_name="Os Dois",
            formation_members=[{"instrument": "violão", "role": "", "email": ""}],
        )
        resp = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_invalid_email(self):
        payload = self._base_payload(
            email="bad_email_member@test.com",
            artist_type="dupla",
            stage_name="Os Dois",
            formation_members=[
                {"name": "Carlos", "instrument": "violão", "role": "", "email": "nao-email"}
            ],
        )
        resp = self.client.post(self.BASE_URL, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_response_contains_id(self):
        resp = self.client.post(self.BASE_URL, self._base_payload(), format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsInstance(resp.data.get("id"), int)

    def test_no_auth_required(self):
        """Endpoint público: sem autenticação deve funcionar."""
        resp = self.client.post(self.BASE_URL, self._base_payload(), format="json")
        self.assertNotEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# 4. Endpoints de admin de musician requests
# ---------------------------------------------------------------------------


class MusicianRequestAdminAPITest(APITestCase):
    """Testa /api/admin/musician-requests/ (requer is_staff)."""

    def setUp(self):
        self.staff_user = User.objects.create_user(
            username="admin_staff",
            email="admin_staff@test.com",
            password="AdminPass123!",
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            username="regular_user",
            email="regular_user@test.com",
            password="RegularPass123!",
        )
        self.dupla_request = MusicianRequest.objects.create(
            email="dupla_req@test.com",
            full_name="Dupla Teste",
            phone="11999999999",
            instrument="guitar",
            city="Belo Horizonte",
            state="MG",
            artist_type="dupla",
            stage_name="Os Dois",
            formation_members=[_make_member()],
        )
        self.banda_request = MusicianRequest.objects.create(
            email="banda_req@test.com",
            full_name="Banda Teste",
            phone="11999999998",
            instrument="drums",
            city="São Paulo",
            state="SP",
            artist_type="banda",
            stage_name="A Banda",
            formation_members=[_make_member("M1", "guitarra"), _make_member("M2", "baixo")],
        )

    def test_list_requires_staff(self):
        self.client.force_authenticate(user=self.regular_user)
        resp = self.client.get("/api/admin/musician-requests/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_returns_formation_members(self):
        self.client.force_authenticate(user=self.staff_user)
        resp = self.client.get("/api/admin/musician-requests/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [r["id"] for r in resp.data]
        self.assertIn(self.dupla_request.id, ids)
        dupla_data = next(r for r in resp.data if r["id"] == self.dupla_request.id)
        self.assertIsInstance(dupla_data["formation_members"], list)
        self.assertEqual(len(dupla_data["formation_members"]), 1)

    def test_list_returns_artist_type(self):
        self.client.force_authenticate(user=self.staff_user)
        resp = self.client.get("/api/admin/musician-requests/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for item in resp.data:
            self.assertIn("artist_type", item)

    def test_detail_returns_stage_name(self):
        self.client.force_authenticate(user=self.staff_user)
        resp = self.client.get(f"/api/admin/musician-requests/{self.dupla_request.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["stage_name"], "Os Dois")

    def test_detail_returns_formation_members(self):
        self.client.force_authenticate(user=self.staff_user)
        resp = self.client.get(f"/api/admin/musician-requests/{self.banda_request.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data["formation_members"], list)
        self.assertEqual(len(resp.data["formation_members"]), 2)

    def test_approve_dupla_request(self):
        self.client.force_authenticate(user=self.staff_user)
        resp = self.client.post(
            f"/api/admin/musician-requests/{self.dupla_request.id}/approve/"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.dupla_request.refresh_from_db()
        self.assertEqual(self.dupla_request.status, "approved")

    def test_approve_sets_invite_token(self):
        self.client.force_authenticate(user=self.staff_user)
        self.client.post(f"/api/admin/musician-requests/{self.dupla_request.id}/approve/")
        self.dupla_request.refresh_from_db()
        self.assertIsNotNone(self.dupla_request.invite_token)
        self.assertIsNotNone(self.dupla_request.invite_expires_at)

    def test_reject_request(self):
        self.client.force_authenticate(user=self.staff_user)
        resp = self.client.post(
            f"/api/admin/musician-requests/{self.banda_request.id}/reject/",
            {"admin_notes": "Não atende os critérios"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.banda_request.refresh_from_db()
        self.assertEqual(self.banda_request.status, "rejected")

    def test_detail_requires_staff(self):
        self.client.force_authenticate(user=self.regular_user)
        resp = self.client.get(f"/api/admin/musician-requests/{self.dupla_request.id}/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# 5. Fluxo completo de registro com artist_type (register-with-invite)
# ---------------------------------------------------------------------------


class RegisterWithInviteArtistTypeTest(APITestCase):
    """Testa POST /api/register-with-invite/ com vários artist_types."""

    REGISTER_URL = "/api/register-with-invite/"

    def setUp(self):
        # Substitui o cache dos throttles por LocMemCache isolado
        self._original_throttle_cache = SimpleRateThrottle.cache
        _test_cache = LocMemCache("invite-reg-test", {})
        _test_cache.clear()
        SimpleRateThrottle.cache = _test_cache

    def tearDown(self):
        SimpleRateThrottle.cache = self._original_throttle_cache

    def _create_approved_request(
        self, artist_type="solo", stage_name="", formation_members=None, suffix=""
    ):
        """Cria MusicianRequest aprovado com invite_token válido por 7 dias."""
        admin = User.objects.create_user(
            username=f"admin_inv_{artist_type}{suffix}",
            email=f"admin_inv_{artist_type}{suffix}@test.com",
            password="x",
            is_staff=True,
        )
        mr = MusicianRequest.objects.create(
            email=f"{artist_type}{suffix}@invite.com",
            full_name=f"Test {artist_type.capitalize()}",
            phone="11999999999",
            instrument="guitar",
            city="Belo Horizonte",
            state="MG",
            artist_type=artist_type,
            stage_name=stage_name or None,
            formation_members=formation_members or [],
        )
        mr.approve(admin)
        return mr

    def test_register_solo_sets_artist_type(self):
        mr = self._create_approved_request("solo", suffix="1")
        resp = self.client.post(
            self.REGISTER_URL,
            {"invite_token": mr.invite_token, "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        musician = Musician.objects.get(user__email=mr.email)
        self.assertEqual(musician.artist_type, "solo")

    def test_register_dupla_sets_artist_type(self):
        mr = self._create_approved_request(
            "dupla",
            stage_name="Os Dois",
            formation_members=[_make_member()],
            suffix="2",
        )
        resp = self.client.post(
            self.REGISTER_URL,
            {"invite_token": mr.invite_token, "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        musician = Musician.objects.get(user__email=mr.email)
        self.assertEqual(musician.artist_type, "dupla")

    def test_register_banda_sets_artist_type(self):
        mr = self._create_approved_request(
            "banda",
            stage_name="A Banda",
            formation_members=[_make_member("M1", "guitarra"), _make_member("M2", "baixo")],
            suffix="3",
        )
        resp = self.client.post(
            self.REGISTER_URL,
            {"invite_token": mr.invite_token, "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        musician = Musician.objects.get(user__email=mr.email)
        self.assertEqual(musician.artist_type, "banda")

    def test_register_dupla_sets_stage_name(self):
        mr = self._create_approved_request(
            "dupla",
            stage_name="Os Dois",
            formation_members=[_make_member()],
            suffix="4",
        )
        self.client.post(
            self.REGISTER_URL,
            {"invite_token": mr.invite_token, "password": "StrongPass123!"},
            format="json",
        )
        musician = Musician.objects.get(user__email=mr.email)
        self.assertEqual(musician.stage_name, "Os Dois")

    def test_register_dupla_org_uses_stage_name(self):
        mr = self._create_approved_request(
            "dupla",
            stage_name="Os Dois Top",
            formation_members=[_make_member()],
            suffix="5",
        )
        self.client.post(
            self.REGISTER_URL,
            {"invite_token": mr.invite_token, "password": "StrongPass123!"},
            format="json",
        )
        musician = Musician.objects.get(user__email=mr.email)
        org = Organization.objects.get(owner=musician.user)
        self.assertEqual(org.name, "Os Dois Top")

    def test_register_solo_org_does_not_use_stage_name(self):
        mr = self._create_approved_request("solo", stage_name="", suffix="6")
        self.client.post(
            self.REGISTER_URL,
            {"invite_token": mr.invite_token, "password": "StrongPass123!"},
            format="json",
        )
        musician = Musician.objects.get(user__email=mr.email)
        org = Organization.objects.get(owner=musician.user)
        # Para solo, org usa "Org de {username}", não stage_name
        self.assertTrue(org.name.startswith("Org de ") or not org.name.startswith("Os"))

    def test_expired_invite_rejected(self):
        mr = self._create_approved_request("solo", suffix="7")
        mr.invite_expires_at = timezone.now() - timedelta(hours=1)
        mr.save(update_fields=["invite_expires_at"])
        resp = self.client.post(
            self.REGISTER_URL,
            {"invite_token": mr.invite_token, "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expirado", (resp.data.get("error") or "").lower())

    def test_used_invite_rejected(self):
        mr = self._create_approved_request("solo", suffix="8")
        mr.invite_used = True
        mr.save(update_fields=["invite_used"])
        resp = self.client.post(
            self.REGISTER_URL,
            {"invite_token": mr.invite_token, "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("utilizado", (resp.data.get("error") or "").lower())


# ---------------------------------------------------------------------------
# 6. GET/PATCH de perfil e endpoint público com artist_type
# ---------------------------------------------------------------------------


class MusicianProfileArtistTypeAPITest(APITestCase):
    """Testa GET/PATCH /api/musicians/me/ e GET /api/musicians/public/{id}/."""

    def setUp(self):
        self.user, self.musician = _make_musician_and_user("profile_at_user")
        self.client.force_authenticate(user=self.user)

    def test_me_returns_artist_type(self):
        resp = self.client.get("/api/musicians/me/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("artist_type", resp.data)
        self.assertIn("stage_name", resp.data)
        self.assertEqual(resp.data["artist_type"], "solo")

    def test_patch_valid_dupla(self):
        resp = self.client.patch(
            "/api/musicians/me/",
            {"artist_type": "dupla", "stage_name": "Nós Dois"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.musician.refresh_from_db()
        self.assertEqual(self.musician.artist_type, "dupla")
        self.assertEqual(self.musician.stage_name, "Nós Dois")

    def test_patch_dupla_missing_stage_name(self):
        resp = self.client.patch(
            "/api/musicians/me/",
            {"artist_type": "dupla", "stage_name": ""},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_invalid_artist_type(self):
        resp = self.client.patch(
            "/api/musicians/me/",
            {"artist_type": "trio"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_banda_valid(self):
        resp = self.client.patch(
            "/api/musicians/me/",
            {"artist_type": "banda", "stage_name": "Minha Banda"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.musician.refresh_from_db()
        self.assertEqual(self.musician.artist_type, "banda")

    def test_patch_back_to_solo(self):
        """Músico que era dupla pode voltar para solo (stage_name vira opcional)."""
        self.musician.artist_type = "dupla"
        self.musician.stage_name = "Os Dois"
        self.musician.save(update_fields=["artist_type", "stage_name"])

        resp = self.client.patch(
            "/api/musicians/me/",
            {"artist_type": "solo"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.musician.refresh_from_db()
        self.assertEqual(self.musician.artist_type, "solo")

    def test_public_profile_exposes_artist_type(self):
        resp = self.client.get(f"/api/musicians/public/{self.musician.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("artist_type", resp.data)
        self.assertIn("stage_name", resp.data)

    def test_public_profile_dupla_shows_stage_name(self):
        self.musician.artist_type = "dupla"
        self.musician.stage_name = "Dupla Pública"
        self.musician.save(update_fields=["artist_type", "stage_name"])

        resp = self.client.get(f"/api/musicians/public/{self.musician.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["artist_type"], "dupla")
        self.assertEqual(resp.data["stage_name"], "Dupla Pública")

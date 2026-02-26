"""
Garante que o split do serializers.py em package não quebrou nenhum import.
Todos os 43 nomes originais devem ser importáveis de agenda.serializers.
"""

from django.test import SimpleTestCase


class SerializerPackageImportsTest(SimpleTestCase):
    """Verifica que cada serializer pode ser importado do package."""

    def test_user_serializers_importable(self):
        from agenda.serializers import (  # noqa: F401
            ContractorProfileSerializer,
            ContractorRegisterSerializer,
            UserSerializer,
        )

    def test_musician_serializers_importable(self):
        from agenda.serializers import (  # noqa: F401
            MusicianPublicSerializer,
            MusicianSerializer,
            MusicianUpdateSerializer,
        )

    def test_event_serializers_importable(self):
        from agenda.serializers import (  # noqa: F401
            EventCreateSerializer,
            EventDetailSerializer,
            EventInstrumentSerializer,
            EventListSerializer,
            EventLogSerializer,
            EventUpdateSerializer,
            OwnerCalendarEventSerializer,
            PublicCalendarEventSerializer,
            PublicCalendarSerializer,
        )

    def test_availability_serializers_importable(self):
        from agenda.serializers import (  # noqa: F401
            AvailabilitySerializer,
            LeaderAvailabilitySerializer,
        )

    def test_connection_serializers_importable(self):
        from agenda.serializers import (  # noqa: F401
            ConnectionSerializer,
            MusicianBadgeSerializer,
            MusicianRatingSerializer,
            RatingSubmitSerializer,
        )

    def test_quote_booking_serializers_importable(self):
        from agenda.serializers import (  # noqa: F401
            BookingEventSerializer,
            BookingSerializer,
            QuoteProposalCreateSerializer,
            QuoteProposalSerializer,
            QuoteRequestCreateSerializer,
            QuoteRequestSerializer,
        )

    def test_admin_serializers_importable(self):
        from agenda.serializers import (  # noqa: F401
            AdminCreateSerializer,
            AdminUpdateSerializer,
            AdminUserSerializer,
            CityCreateSerializer,
            CitySerializer,
            CityStatsSerializer,
            CulturalNoticeSerializer,
            InstrumentCreateSerializer,
            InstrumentSerializer,
            MusicianRequestAdminSerializer,
            MusicianRequestCreateSerializer,
            MusicianRequestPublicStatusSerializer,
            MusicianRequestSerializer,
            OrganizationPublicSerializer,
            OrganizationSerializer,
            PremiumPortalItemSerializer,
        )

    def test_utility_function_importable(self):
        from agenda.serializers import normalize_genre_value  # noqa: F401

        self.assertTrue(callable(normalize_genre_value))

    def test_all_serializers_are_classes(self):
        """Verifica que os importados são classes (não None ou primitivos)."""
        import inspect

        from agenda import serializers as s

        expected = [
            "UserSerializer",
            "ContractorProfileSerializer",
            "ContractorRegisterSerializer",
            "MusicianSerializer",
            "MusicianUpdateSerializer",
            "MusicianPublicSerializer",
            "EventListSerializer",
            "EventLogSerializer",
            "EventDetailSerializer",
            "EventCreateSerializer",
            "EventUpdateSerializer",
            "EventInstrumentSerializer",
            "PublicCalendarEventSerializer",
            "OwnerCalendarEventSerializer",
            "PublicCalendarSerializer",
            "AvailabilitySerializer",
            "LeaderAvailabilitySerializer",
            "ConnectionSerializer",
            "MusicianRatingSerializer",
            "RatingSubmitSerializer",
            "MusicianBadgeSerializer",
            "QuoteRequestSerializer",
            "QuoteRequestCreateSerializer",
            "QuoteProposalSerializer",
            "QuoteProposalCreateSerializer",
            "BookingSerializer",
            "BookingEventSerializer",
            "OrganizationSerializer",
            "OrganizationPublicSerializer",
            "MusicianRequestSerializer",
            "MusicianRequestPublicStatusSerializer",
            "MusicianRequestCreateSerializer",
            "MusicianRequestAdminSerializer",
            "InstrumentSerializer",
            "InstrumentCreateSerializer",
            "CitySerializer",
            "CityCreateSerializer",
            "CityStatsSerializer",
            "AdminUserSerializer",
            "AdminCreateSerializer",
            "AdminUpdateSerializer",
            "CulturalNoticeSerializer",
            "PremiumPortalItemSerializer",
        ]

        for name in expected:
            with self.subTest(serializer=name):
                obj = getattr(s, name, None)
                self.assertIsNotNone(obj, f"{name} não encontrado em agenda.serializers")
                self.assertTrue(
                    inspect.isclass(obj),
                    f"{name} não é uma classe: {type(obj)}",
                )

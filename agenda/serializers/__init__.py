# agenda/serializers/__init__.py
# Re-exports all serializers to maintain backward compatibility.
# All existing `from agenda.serializers import X` imports continue to work unchanged.

from .admin import (
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
from .availability import AvailabilitySerializer, LeaderAvailabilitySerializer
from .connections import (
    ConnectionSerializer,
    MusicianBadgeSerializer,
    MusicianRatingSerializer,
    RatingSubmitSerializer,
)
from .events import (
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
from .musician import MusicianPublicSerializer, MusicianSerializer, MusicianUpdateSerializer
from .quote_booking import (
    BookingEventSerializer,
    BookingSerializer,
    QuoteProposalCreateSerializer,
    QuoteProposalSerializer,
    QuoteRequestCreateSerializer,
    QuoteRequestSerializer,
)
from .user import ContractorProfileSerializer, ContractorRegisterSerializer, UserSerializer
from .utils import normalize_genre_value

__all__ = [
    # user
    "UserSerializer",
    "ContractorProfileSerializer",
    "ContractorRegisterSerializer",
    # musician
    "MusicianSerializer",
    "MusicianUpdateSerializer",
    "MusicianPublicSerializer",
    # availability
    "AvailabilitySerializer",
    "LeaderAvailabilitySerializer",
    # events
    "EventListSerializer",
    "EventLogSerializer",
    "EventDetailSerializer",
    "EventCreateSerializer",
    "EventUpdateSerializer",
    "EventInstrumentSerializer",
    "PublicCalendarEventSerializer",
    "OwnerCalendarEventSerializer",
    "PublicCalendarSerializer",
    # connections
    "ConnectionSerializer",
    "MusicianRatingSerializer",
    "RatingSubmitSerializer",
    "MusicianBadgeSerializer",
    # quote_booking
    "QuoteRequestSerializer",
    "QuoteRequestCreateSerializer",
    "QuoteProposalSerializer",
    "QuoteProposalCreateSerializer",
    "BookingSerializer",
    "BookingEventSerializer",
    # admin
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
    # utils
    "normalize_genre_value",
]

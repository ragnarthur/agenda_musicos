# agenda/views/__init__.py
"""
Exports centralizados dos ViewSets.

Esta estrutura modular substitui o monolítico views_legacy.py (2.692 linhas).
Refatoração completa - todos os ViewSets foram migrados para módulos separados.
"""

# ViewSets menores
from .badges import BadgeViewSet
from .connections import ConnectionViewSet
from .instruments import InstrumentViewSet

# ViewSets médios
from .availabilities import AvailabilityViewSet
from .leader_availabilities import LeaderAvailabilityViewSet
from .musicians import MusicianViewSet

# ViewSets grandes
from .events import EventViewSet

__all__ = [
    # ViewSets menores
    "BadgeViewSet",
    "ConnectionViewSet",
    "InstrumentViewSet",
    # ViewSets médios
    "AvailabilityViewSet",
    "LeaderAvailabilityViewSet",
    "MusicianViewSet",
    # ViewSet grande (completo)
    "EventViewSet",
]

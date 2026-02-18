# agenda/views/__init__.py
"""
Exports centralizados dos ViewSets.

Esta estrutura modular substitui o monolítico views_legacy.py (2.692 linhas).
Refatoração completa - todos os ViewSets foram migrados para módulos separados.
"""

# ViewSets médios
from .availabilities import AvailabilityViewSet

# ViewSets menores
from .badges import BadgeViewSet
from .connections import ConnectionViewSet

# ViewSets grandes
from .events import EventViewSet
from .instruments import InstrumentViewSet
from .leader_availabilities import LeaderAvailabilityViewSet
from .musicians import MusicianViewSet

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

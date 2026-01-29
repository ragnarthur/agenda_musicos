# agenda/audit.py
"""
Compat: reexporta AuditLog do models para manter imports existentes.
"""

from .models import AuditLog

__all__ = ["AuditLog"]

from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any
from backend.core.vault_db import (
    get_telemetry_stats,
    get_all_screenshots,
)

router = APIRouter(prefix="/api/v1", tags=["Vault & Telemetry"])

@router.get("/telemetry")
async def get_telemetry():
    """Retrieve live KPI counters and system metrics."""
    return get_telemetry_stats()

@router.get("/vault/items")
async def list_vault_items(
    status: Optional[str] = Query(None, description="Filter by status: 'organized', 'quarantined', 'archived'"),
    limit: int = Query(50, ge=1, le=500),
):
    """Retrieve indexed screenshots from the local SQLite vault."""
    items = get_all_screenshots(status=status, limit=limit)
    return {
        "count": len(items),
        "items": items,
    }

@router.get("/vault/quarantine")
async def list_quarantine_items():
    """Retrieve locally quarantined files with verified chmod 0o600 Linux permissions."""
    items = get_all_screenshots(status="quarantined", limit=100)
    return {
        "quarantined_count": len(items),
        "items": items,
    }

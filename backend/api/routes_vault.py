from fastapi import APIRouter, Query
from typing import Optional
from backend.core.vault_db import (
    get_telemetry_stats,
    get_all_screenshots,
    get_category_counts,
)

router = APIRouter(prefix="/api/v1", tags=["Vault & Telemetry"])

@router.get("/telemetry")
async def get_telemetry():
    """Retrieve fast live KPI counters from database."""
    return get_telemetry_stats()

@router.get("/vault/items")
async def list_vault_items(
    status: Optional[str] = Query(None, description="Filter by status: 'organized', 'quarantined', 'archived'"),
    category: Optional[str] = Query(None, description="Filter by category: 'code_bug_or_terminal', 'architecture_or_slide', 'receipt_or_invoice', 'meme_or_clutter'"),
    limit: int = Query(50, ge=1, le=500),
):
    """Retrieve indexed screenshots from the local SQLite vault with status and category filters."""
    items = get_all_screenshots(status=status, category=category, limit=limit)
    return {
        "count": len(items),
        "items": items,
    }

@router.get("/vault/categories")
async def list_categories():
    """Retrieve counts for all semantic categories."""
    counts = get_category_counts()
    return {
        "categories": counts,
    }

@router.get("/vault/quarantine")
async def list_quarantine_items():
    """Retrieve locally quarantined files with verified owner-restricted permissions."""
    items = get_all_screenshots(status="quarantined", limit=100)
    return {
        "quarantined_count": len(items),
        "items": items,
    }

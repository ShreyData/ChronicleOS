from fastapi import APIRouter, Query
from typing import Optional
from backend.core.engine_system1 import System1Engine
from backend.core.vault_db import hybrid_search

router = APIRouter(prefix="/api/v1", tags=["Search"])

@router.get("/search")
async def search_vault(
    query: str = Query(..., min_length=1, description="Natural language search or keyword query"),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Sub-millisecond Zero-Extra-Model Hybrid Search:
    - Dot product cosine similarity across SigLIP 2 float32 embeddings
    - Keyword boost over extracted code & summaries via sanitized SQLite FTS5
    """
    query_emb = None
    try:
        engine1 = System1Engine.get_instance()
        query_emb = engine1.embed_text_query(query)
    except Exception as e:
        print(f"Warning embedding text query: {e}")

    results = hybrid_search(query=query, query_embedding=query_emb, limit=limit)
    return {
        "query": query,
        "count": len(results),
        "results": results,
    }

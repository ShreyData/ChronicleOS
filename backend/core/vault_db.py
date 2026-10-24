import sqlite3
import json
import re
import os
import shutil
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Any
from backend.core.config import (
    DB_PATH,
    ORGANIZED_DIR,
    QUARANTINE_DIR,
    ARCHIVE_DIR,
)

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn

def init_db() -> None:
    conn = get_db_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS screenshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sha256 TEXT UNIQUE NOT NULL,
                original_path TEXT NOT NULL,
                current_path TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                suggested_filename TEXT,
                file_size_bytes INTEGER NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                status TEXT NOT NULL,
                
                s1_latency_ms REAL NOT NULL,
                prob_code_bug REAL NOT NULL,
                prob_architecture REAL NOT NULL,
                prob_receipt REAL NOT NULL,
                prob_clutter REAL NOT NULL,
                prob_credential_leak REAL NOT NULL,
                dominant_category TEXT NOT NULL,
                patch_budget_patches INTEGER NOT NULL,
                patch_width INTEGER NOT NULL,
                patch_height INTEGER NOT NULL,
                embedding BLOB,
                
                s2_called BOOLEAN NOT NULL DEFAULT 0,
                s2_latency_ms REAL DEFAULT 0.0,
                thinking_level TEXT,
                summary_md TEXT,
                action_items_json TEXT,
                code_snippets_json TEXT,
                extracted_tags_json TEXT,
                cloud_tokens_saved BOOLEAN NOT NULL DEFAULT 0,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        conn.execute("CREATE INDEX IF NOT EXISTS idx_screenshots_status ON screenshots(status);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_screenshots_sha256 ON screenshots(sha256);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_screenshots_cat ON screenshots(dominant_category);")

        conn.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS screenshots_fts USING fts5(
                screenshot_id UNINDEXED,
                suggested_filename,
                summary_md,
                code_snippets,
                tags
            );
        """)
    conn.close()

def sanitize_fts5_query(query: str) -> str:
    if not query:
        return ""
    tokens = re.findall(r"\w+", query)
    if not tokens:
        return ""
    return " ".join([f'"{tok}"*' for tok in tokens])

def upsert_screenshot(record: Dict[str, Any]) -> int:
    conn = get_db_connection()
    with conn:
        cursor = conn.execute("""
            INSERT INTO screenshots (
                sha256, original_path, current_path, original_filename, suggested_filename,
                file_size_bytes, width, height, status, s1_latency_ms,
                prob_code_bug, prob_architecture, prob_receipt, prob_clutter, prob_credential_leak,
                dominant_category, patch_budget_patches, patch_width, patch_height, embedding,
                s2_called, s2_latency_ms, thinking_level, summary_md,
                action_items_json, code_snippets_json, extracted_tags_json, cloud_tokens_saved
            ) VALUES (
                :sha256, :original_path, :current_path, :original_filename, :suggested_filename,
                :file_size_bytes, :width, :height, :status, :s1_latency_ms,
                :prob_code_bug, :prob_architecture, :prob_receipt, :prob_clutter, :prob_credential_leak,
                :dominant_category, :patch_budget_patches, :patch_width, :patch_height, :embedding,
                :s2_called, :s2_latency_ms, :thinking_level, :summary_md,
                :action_items_json, :code_snippets_json, :extracted_tags_json, :cloud_tokens_saved
            )
            ON CONFLICT(sha256) DO UPDATE SET
                current_path = excluded.current_path,
                suggested_filename = excluded.suggested_filename,
                status = excluded.status,
                s1_latency_ms = excluded.s1_latency_ms,
                prob_code_bug = excluded.prob_code_bug,
                prob_architecture = excluded.prob_architecture,
                prob_receipt = excluded.prob_receipt,
                prob_clutter = excluded.prob_clutter,
                prob_credential_leak = excluded.prob_credential_leak,
                dominant_category = excluded.dominant_category,
                patch_budget_patches = excluded.patch_budget_patches,
                patch_width = excluded.patch_width,
                patch_height = excluded.patch_height,
                embedding = excluded.embedding,
                s2_called = excluded.s2_called,
                s2_latency_ms = excluded.s2_latency_ms,
                thinking_level = excluded.thinking_level,
                summary_md = excluded.summary_md,
                action_items_json = excluded.action_items_json,
                code_snippets_json = excluded.code_snippets_json,
                extracted_tags_json = excluded.extracted_tags_json,
                cloud_tokens_saved = excluded.cloud_tokens_saved,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id;
        """, record)
        row = cursor.fetchone()
        screenshot_id = row[0] if row else None

        if screenshot_id:
            conn.execute("DELETE FROM screenshots_fts WHERE screenshot_id = ?", (str(screenshot_id),))
            conn.execute("""
                INSERT INTO screenshots_fts (
                    screenshot_id, suggested_filename, summary_md, code_snippets, tags
                ) VALUES (?, ?, ?, ?, ?)
            """, (
                str(screenshot_id),
                record.get("suggested_filename", "") or record.get("original_filename", ""),
                record.get("summary_md", "") or "",
                record.get("code_snippets_json", "") or "",
                record.get("extracted_tags_json", "") or "",
            ))

    conn.close()
    return screenshot_id

def quarantine_file(source_path: Path, filename: str) -> Path:
    target_path = QUARANTINE_DIR / filename
    if source_path != target_path:
        shutil.move(str(source_path), str(target_path))
    try:
        os.chmod(target_path, 0o600)
    except Exception:
        pass
    return target_path

def archive_file(source_path: Path, filename: str) -> Path:
    target_path = ARCHIVE_DIR / filename
    if source_path != target_path:
        shutil.move(str(source_path), str(target_path))
    return target_path

def organize_file(source_path: Path, new_filename: str) -> Path:
    target_path = ORGANIZED_DIR / new_filename
    if source_path != target_path:
        shutil.move(str(source_path), str(target_path))
    return target_path

def get_file_permission_string(path: Path) -> str:
    try:
        mode = path.stat().st_mode
        return oct(mode & 0o777)
    except Exception:
        return "N/A"

def get_telemetry_stats() -> Dict[str, Any]:
    """Fast telemetry retrieval using indexed DB aggregates (no blocking disk scans)."""
    conn = get_db_connection()
    with conn:
        total = conn.execute("SELECT COUNT(*) FROM screenshots").fetchone()[0]
        quarantined = conn.execute("SELECT COUNT(*) FROM screenshots WHERE status = 'quarantined'").fetchone()[0]
        archived = conn.execute("SELECT COUNT(*) FROM screenshots WHERE status = 'archived'").fetchone()[0]
        organized = conn.execute("SELECT COUNT(*) FROM screenshots WHERE status = 'organized'").fetchone()[0]
        
        avg_s1_row = conn.execute("SELECT AVG(s1_latency_ms) FROM screenshots").fetchone()
        avg_s1_ms = round(avg_s1_row[0], 2) if avg_s1_row and avg_s1_row[0] is not None else 0.0

        size_row = conn.execute("SELECT SUM(file_size_bytes) FROM screenshots").fetchone()
        total_bytes = size_row[0] if size_row and size_row[0] is not None else 0
        total_mb = round(total_bytes / (1024 * 1024), 2)

        saved_count = quarantined + archived
        tokens_saved_pct = round((saved_count / total * 100.0), 1) if total > 0 else 0.0

    conn.close()

    return {
        "total_processed": total,
        "quarantined_count": quarantined,
        "archived_count": archived,
        "organized_count": organized,
        "cloud_tokens_saved_pct": tokens_saved_pct,
        "avg_s1_latency_ms": avg_s1_ms,
        "total_storage_mb": total_mb,
    }

def get_category_counts() -> Dict[str, int]:
    """Retrieve breakdown of screenshots by semantic category."""
    conn = get_db_connection()
    with conn:
        cursor = conn.execute("""
            SELECT dominant_category, COUNT(*) as count 
            FROM screenshots 
            GROUP BY dominant_category;
        """)
        counts = {row["dominant_category"]: row["count"] for row in cursor.fetchall()}
    conn.close()
    return counts

def get_all_screenshots(
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """
    Fast query: explicitly selects metadata columns without reading heavy vector embedding blobs.
    Supports filtering by status and semantic category.
    """
    conn = get_db_connection()
    with conn:
        query = """
            SELECT id, sha256, original_filename, suggested_filename, current_path,
                   file_size_bytes, width, height, status, dominant_category,
                   summary_md, code_snippets_json, extracted_tags_json,
                   s1_latency_ms, created_at
            FROM screenshots
        """
        params = []
        conditions = []

        if status:
            conditions.append("status = ?")
            params.append(status)
        if category:
            conditions.append("dominant_category = ?")
            params.append(category)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor = conn.execute(query, params)
        rows = [dict(row) for row in cursor.fetchall()]
    conn.close()

    for row in rows:
        row["file_permission"] = "0600" if row.get("status") == "quarantined" else "0644"
        row["file_exists"] = True
    return rows

def hybrid_search(query: str, query_embedding: Optional[np.ndarray], limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    with conn:
        fts_scores: Dict[int, float] = {}
        sanitized = sanitize_fts5_query(query)
        if sanitized:
            try:
                fts_cursor = conn.execute("""
                    SELECT screenshot_id, bm25(screenshots_fts) as rank
                    FROM screenshots_fts
                    WHERE screenshots_fts MATCH ?
                    ORDER BY rank ASC LIMIT 50;
                """, (sanitized,))
                for row in fts_cursor.fetchall():
                    s_id = int(row["screenshot_id"])
                    raw_rank = abs(float(row["rank"]))
                    norm_bm25 = 1.0 / (1.0 + raw_rank)
                    fts_scores[s_id] = norm_bm25
            except Exception:
                pass

        cursor = conn.execute("""
            SELECT id, sha256, original_filename, suggested_filename, current_path,
                   status, dominant_category, summary_md, code_snippets_json,
                   extracted_tags_json, embedding, s1_latency_ms
            FROM screenshots;
        """)
        all_rows = [dict(row) for row in cursor.fetchall()]

    conn.close()

    results = []
    for row in all_rows:
        screenshot_id = row["id"]
        visual_score = 0.0
        
        emb_bytes = row.get("embedding")
        if query_embedding is not None and emb_bytes:
            row_emb = np.frombuffer(emb_bytes, dtype=np.float32)
            dot = float(np.dot(row_emb, query_embedding))
            visual_score = max(0.0, min(1.0, (dot + 1.0) / 2.0))

        text_score = fts_scores.get(screenshot_id, 0.0)

        if query_embedding is not None and sanitized:
            hybrid_score = round((0.65 * visual_score) + (0.35 * text_score), 4)
        elif query_embedding is not None:
            hybrid_score = round(visual_score, 4)
        else:
            hybrid_score = round(text_score, 4)

        row.pop("embedding", None)
        row["similarity_score"] = hybrid_score
        row["visual_score"] = round(visual_score, 4)
        row["text_score"] = round(text_score, 4)
        row["file_permission"] = "0600" if row.get("status") == "quarantined" else "0644"
        results.append(row)

    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    return results[:limit]

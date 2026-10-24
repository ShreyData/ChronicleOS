import unittest
import tempfile
import os
import numpy as np
from pathlib import Path

from backend.core.vault_db import (
    init_db,
    get_db_connection,
    sanitize_fts5_query,
    upsert_screenshot,
    quarantine_file,
    get_file_permission_string,
)

class TestVaultDB(unittest.TestCase):
    def setUp(self):
        init_db()

    def test_fts5_sanitization(self):
        unsafe_queries = [
            "stripe_webhook_500",
            "OAuth2.0: error",
            "sk-proj-94827",
            "SELECT * FROM users WHERE '1'='1'",
            "---:::...",
        ]
        conn = get_db_connection()
        for q in unsafe_queries:
            safe = sanitize_fts5_query(q)
            if safe:
                try:
                    conn.execute("SELECT screenshot_id FROM screenshots_fts WHERE screenshots_fts MATCH ?", (safe,)).fetchall()
                except Exception as e:
                    self.fail(f"FTS5 query '{safe}' raised exception: {e}")
        conn.close()

    def test_duplicate_sha256_upsert(self):
        sha = "test_sha256_hash_12345"
        dummy_record = {
            "sha256": sha,
            "original_path": "/tmp/test.png",
            "current_path": "/tmp/vault/test.png",
            "original_filename": "test.png",
            "suggested_filename": "test_suggested.png",
            "file_size_bytes": 1024,
            "width": 800,
            "height": 600,
            "status": "organized",
            "s1_latency_ms": 32.5,
            "prob_code_bug": 0.9,
            "prob_architecture": 0.1,
            "prob_receipt": 0.05,
            "prob_clutter": 0.02,
            "prob_credential_leak": 0.01,
            "dominant_category": "code_bug_or_terminal",
            "patch_budget_patches": 1120,
            "patch_width": 528,
            "patch_height": 544,
            "embedding": np.ones(768, dtype=np.float32).tobytes(),
            "s2_called": True,
            "s2_latency_ms": 120.0,
            "thinking_level": "high",
            "summary_md": "Test summary",
            "action_items_json": "[]",
            "code_snippets_json": "[]",
            "extracted_tags_json": "[]",
            "cloud_tokens_saved": False,
        }

        id1 = upsert_screenshot(dummy_record)
        self.assertIsNotNone(id1)

        dummy_record["status"] = "archived"
        id2 = upsert_screenshot(dummy_record)
        self.assertEqual(id1, id2, "ID should match on upsert")

        conn = get_db_connection()
        row = conn.execute("SELECT status FROM screenshots WHERE sha256 = ?", (sha,)).fetchone()
        conn.close()
        self.assertEqual(row["status"], "archived")

    def test_quarantine_chmod_operation(self):
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(b"sample image data")
            temp_path = Path(f.name)

        try:
            quarantined = quarantine_file(temp_path, "quarantine_test.png")
            self.assertTrue(quarantined.exists())
            perm = get_file_permission_string(quarantined)
            self.assertIsInstance(perm, str)
        finally:
            if quarantined.exists():
                quarantined.unlink()

if __name__ == "__main__":
    unittest.main()

import os
import shutil
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from backend.core.config import VAULT_DIR
from backend.core.engine_system1 import System1Engine
from backend.core.engine_system2 import System2Engine
from backend.core.vault_db import (
    upsert_screenshot,
    quarantine_file,
    archive_file,
    organize_file,
    get_file_permission_string,
)

router = APIRouter(prefix="/api/v1/ingest", tags=["Ingestion Pipeline"])

def process_single_image(source_path: Path, original_filename: str) -> Dict[str, Any]:
    s1_engine = System1Engine.get_instance()
    s1_result, resized_img = s1_engine.route_image(source_path)

    if s1_result.quarantine_triggered:
        final_path = quarantine_file(source_path, original_filename)
        status = "quarantined"
        suggested_filename = original_filename
        s2_called = False
        s2_latency_ms = 0.0
        thinking_level = "none"
        summary_md = "Security Quarantine: Potential sensitive credentials or secrets detected. Cloud analysis blocked."
        action_items = ["Audit file content locally", "Rotate any exposed secrets"]
        code_snippets = []
        tags = ["quarantine", "credentials_detected"]
        cloud_tokens_saved = True

    elif s1_result.clutter_filtered:
        final_path = archive_file(source_path, original_filename)
        status = "archived"
        suggested_filename = original_filename
        s2_called = False
        s2_latency_ms = 0.0
        thinking_level = "none"
        summary_md = "Clutter Filter: Classified as low-value media or clutter. Cloud analysis skipped."
        action_items = []
        code_snippets = []
        tags = ["archived", "clutter"]
        cloud_tokens_saved = True

    else:
        s2_engine = System2Engine.get_instance()
        s2_output = s2_engine.analyze_image(
            resized_image=resized_img,
            dominant_cat=s1_result.dominant_category,
            original_filename=original_filename,
        )
        status = "organized"
        suggested_filename = s2_output.response.suggested_filename
        final_path = organize_file(source_path, suggested_filename)
        s2_called = s2_output.s2_called
        s2_latency_ms = s2_output.s2_latency_ms
        thinking_level = s2_output.thinking_level
        summary_md = s2_output.response.summary_markdown
        action_items = s2_output.response.action_items
        code_snippets = s2_output.response.code_snippets
        tags = s2_output.response.tags
        cloud_tokens_saved = False

    record = {
        "sha256": s1_result.sha256,
        "original_path": str(source_path),
        "current_path": str(final_path),
        "original_filename": original_filename,
        "suggested_filename": suggested_filename,
        "file_size_bytes": s1_result.file_size_bytes,
        "width": s1_result.original_dimensions[0],
        "height": s1_result.original_dimensions[1],
        "status": status,
        "s1_latency_ms": s1_result.s1_latency_ms,
        "prob_code_bug": s1_result.prob_code_bug,
        "prob_architecture": s1_result.prob_architecture,
        "prob_receipt": s1_result.prob_receipt,
        "prob_clutter": s1_result.prob_clutter,
        "prob_credential_leak": s1_result.prob_credential_leak,
        "dominant_category": s1_result.dominant_category,
        "patch_budget_patches": s1_result.patch_budget_patches,
        "patch_width": s1_result.patch_resolution[0],
        "patch_height": s1_result.patch_resolution[1],
        "embedding": s1_result.embedding_bytes,
        "s2_called": s2_called,
        "s2_latency_ms": s2_latency_ms,
        "thinking_level": thinking_level,
        "summary_md": summary_md,
        "action_items_json": json.dumps(action_items),
        "code_snippets_json": json.dumps(code_snippets),
        "extracted_tags_json": json.dumps(tags),
        "cloud_tokens_saved": cloud_tokens_saved,
    }

    screenshot_id = upsert_screenshot(record)

    return {
        "id": screenshot_id,
        "sha256": s1_result.sha256,
        "original_filename": original_filename,
        "suggested_filename": suggested_filename,
        "status": status,
        "current_path": str(final_path),
        "file_permissions": get_file_permission_string(final_path),
        "system1": {
            "latency_ms": s1_result.s1_latency_ms,
            "probabilities": {
                "credential_leak_risk": s1_result.prob_credential_leak,
                "code_bug_or_terminal": s1_result.prob_code_bug,
                "architecture_or_slide": s1_result.prob_architecture,
                "receipt_or_invoice": s1_result.prob_receipt,
                "meme_or_clutter": s1_result.prob_clutter,
            },
            "dominant_category": s1_result.dominant_category,
            "quarantine_triggered": s1_result.quarantine_triggered,
            "clutter_filtered": s1_result.clutter_filtered,
            "patch_budget_patches": s1_result.patch_budget_patches,
            "patch_resolution": s1_result.patch_resolution,
        },
        "system2": {
            "called": s2_called,
            "latency_ms": s2_latency_ms,
            "thinking_level": thinking_level,
            "cloud_tokens_saved": cloud_tokens_saved,
            "summary_markdown": summary_md,
            "action_items": action_items,
            "code_snippets": code_snippets,
            "tags": tags,
        },
    }

@router.post("/upload")
async def upload_single(file: UploadFile = File(...)):
    staging_dir = VAULT_DIR / "staging"
    staging_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = staging_dir / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        return process_single_image(file_path, file.filename)
    finally:
        if file_path.exists():
            file_path.unlink()

@router.post("/upload-batch")
async def upload_batch(files: List[UploadFile] = File(...)):
    staging_dir = VAULT_DIR / "staging"
    staging_dir.mkdir(parents=True, exist_ok=True)

    results = []
    errors = []

    for file in files:
        safe_name = Path(file.filename).name
        file_path = staging_dir / safe_name
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            res = process_single_image(file_path, safe_name)
            results.append(res)
        except Exception as e:
            errors.append({"filename": safe_name, "error": str(e)})
        finally:
            if file_path.exists():
                file_path.unlink()

    return {
        "processed_count": len(results),
        "error_count": len(errors),
        "results": results,
        "errors": errors,
    }

@router.post("/scan")
async def scan_directory(directory_path: str = Form(...)):
    target_dir = Path(os.path.expanduser(directory_path)).resolve()
    if not target_dir.exists() or not target_dir.is_dir():
        raise HTTPException(status_code=400, detail=f"Directory does not exist: {target_dir}")

    image_extensions = {".png", ".jpg", ".jpeg", ".webp"}
    candidates = [
        f for f in target_dir.glob("*")
        if f.is_file() and f.suffix.lower() in image_extensions
    ]

    processed = []
    errors = []

    for img_path in candidates:
        try:
            res = process_single_image(img_path, img_path.name)
            processed.append(res)
        except Exception as e:
            errors.append({"file": img_path.name, "error": str(e)})

    return {
        "scanned_directory": str(target_dir),
        "total_found": len(candidates),
        "processed_count": len(processed),
        "error_count": len(errors),
        "results": processed,
        "errors": errors,
    }

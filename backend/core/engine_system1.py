import time
import hashlib
import math
import numpy as np
from pathlib import Path
from PIL import Image
from typing import Tuple, Dict, Any, Optional

import torch
from transformers import AutoProcessor, AutoModel
from pydantic import BaseModel

from backend.core.config import (
    SIGLIP2_MODEL_ID,
    SECURITY_QUARANTINE_THRESHOLD,
    CLUTTER_FILTER_THRESHOLD,
)

CANDIDATE_LABELS = [
    "a screenshot of source code, terminal output, stack trace, or compiler error",
    "a screenshot of a software architecture diagram, system design, or presentation slide",
    "a screenshot of a financial receipt, invoice, billing statement, or expense report",
    "a meme, funny picture, social media clutter, or casual chat screenshot",
    "a screenshot containing private API keys, secrets, passwords, .env variables, or SSH private keys",
]

class System1Result(BaseModel):
    sha256: str
    original_dimensions: Tuple[int, int]
    file_size_bytes: int
    s1_latency_ms: float
    prob_code_bug: float
    prob_architecture: float
    prob_receipt: float
    prob_clutter: float
    prob_credential_leak: float
    dominant_category: str
    quarantine_triggered: bool
    clutter_filtered: bool
    patch_budget_patches: int
    patch_resolution: Tuple[int, int]
    embedding_bytes: bytes

class System1Engine:
    _instance: Optional["System1Engine"] = None

    def __init__(self):
        torch.set_num_threads(4)
        print(f"[System 1] Initializing SigLIP 2 Engine: {SIGLIP2_MODEL_ID} on CPU...")
        self.processor = AutoProcessor.from_pretrained(SIGLIP2_MODEL_ID)
        self.model = AutoModel.from_pretrained(
            SIGLIP2_MODEL_ID,
            dtype=torch.bfloat16,
        ).to("cpu")
        self.model.eval()
        print("[System 1] Engine loaded successfully in torch.bfloat16 on CPU.")

    @classmethod
    def get_instance(cls) -> "System1Engine":
        if cls._instance is None:
            cls._instance = System1Engine()
        return cls._instance

    def compute_patch_budget(self, width: int, height: int, dominant_cat: str) -> Tuple[int, Tuple[int, int]]:
        budget = 1120 if dominant_cat in ["code_bug_or_terminal", "architecture_or_slide"] else 280
        aspect_ratio = max(0.1, float(width) / max(1.0, float(height)))
        kh = max(1, int(math.sqrt(budget / aspect_ratio)))
        kw = max(1, int(budget / kh))

        patch_width = kw * 16
        patch_height = kh * 16
        total_patches = kw * kh
        return total_patches, (patch_width, patch_height)

    def route_image(self, image_path: Path) -> Tuple[System1Result, Image.Image]:
        start_time = time.perf_counter()

        with open(image_path, "rb") as f:
            raw_bytes = f.read()
            file_size = len(raw_bytes)
            sha256_hash = hashlib.sha256(raw_bytes).hexdigest()

        image = Image.open(image_path).convert("RGB")
        orig_w, orig_h = image.size

        inputs = self.processor(
            text=CANDIDATE_LABELS,
            images=image,
            padding="max_length",
            max_length=64,
            truncation=True,
            return_tensors="pt",
        )

        with torch.inference_mode():
            outputs = self.model(**inputs)
            logits = outputs.logits_per_image.float()
            probs = torch.sigmoid(logits).squeeze(0).cpu().numpy()

            img_embed = outputs.image_embeds.float()
            img_embed = img_embed / img_embed.norm(dim=-1, keepdim=True)
            emb_bytes = img_embed.squeeze(0).cpu().numpy().astype(np.float32).tobytes()

        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        prob_code = float(probs[0])
        prob_arch = float(probs[1])
        prob_receipt = float(probs[2])
        prob_clutter = float(probs[3])
        prob_cred = float(probs[4])

        quarantine = prob_cred >= SECURITY_QUARANTINE_THRESHOLD
        clutter = prob_clutter >= CLUTTER_FILTER_THRESHOLD

        semantic_scores = {
            "code_bug_or_terminal": prob_code,
            "architecture_or_slide": prob_arch,
            "receipt_or_invoice": prob_receipt,
            "meme_or_clutter": prob_clutter,
        }
        dominant_cat = max(semantic_scores, key=semantic_scores.get)

        total_patches, patch_res = self.compute_patch_budget(orig_w, orig_h, dominant_cat)
        resized_img = image.resize(patch_res, resample=Image.Resampling.LANCZOS)

        result = System1Result(
            sha256=sha256_hash,
            original_dimensions=(orig_w, orig_h),
            file_size_bytes=file_size,
            s1_latency_ms=latency_ms,
            prob_code_bug=round(prob_code, 4),
            prob_architecture=round(prob_arch, 4),
            prob_receipt=round(prob_receipt, 4),
            prob_clutter=round(prob_clutter, 4),
            prob_credential_leak=round(prob_cred, 4),
            dominant_category=dominant_cat,
            quarantine_triggered=quarantine,
            clutter_filtered=clutter,
            patch_budget_patches=total_patches,
            patch_resolution=patch_res,
            embedding_bytes=emb_bytes,
        )

        return result, resized_img

    def embed_text_query(self, query: str) -> np.ndarray:
        inputs = self.processor(
            text=[query],
            padding="max_length",
            max_length=64,
            truncation=True,
            return_tensors="pt",
        )

        with torch.inference_mode():
            text_embed = self.model.get_text_features(**inputs).float()
            text_embed = text_embed / text_embed.norm(dim=-1, keepdim=True)
            vec = text_embed.squeeze(0).cpu().numpy().astype(np.float32)

        return vec

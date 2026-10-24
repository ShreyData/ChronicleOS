import os
import time
import json
from datetime import datetime
from typing import List, Optional
from PIL import Image
from pydantic import BaseModel, Field

from backend.core.config import GEMINI_API_KEY, SYSTEM2_MODEL_ID

class System2AnalysisResponse(BaseModel):
    suggested_filename: str = Field(
        ...,
        description="Clean snake_case filename prefixed with date, e.g. '2026_10_24_auth_failure.png'",
    )
    summary_markdown: str = Field(
        ...,
        description="Markdown summary explaining screenshot content and context",
    )
    dominant_intent: str = Field(
        ...,
        description="Intent category: 'bug_fix', 'architecture_reference', 'financial_expense', or 'document'",
    )
    action_items: List[str] = Field(
        default_factory=list,
        description="Actionable next steps",
    )
    code_snippets: List[str] = Field(
        default_factory=list,
        description="Code blocks, terminal commands, or configurations",
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Categorical search tags",
    )

class System2Result(BaseModel):
    s2_called: bool
    s2_latency_ms: float
    thinking_level: str
    response: System2AnalysisResponse

class System2Engine:
    _instance: Optional["System2Engine"] = None

    def __init__(self):
        self.api_key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                print("[System 2] Google GenAI client initialized.")
            except Exception as e:
                print(f"[System 2] Initialization notice: {e}")

    @classmethod
    def get_instance(cls) -> "System2Engine":
        if cls._instance is None:
            cls._instance = System2Engine()
        return cls._instance

    def _generate_local_fallback(self, dominant_cat: str, original_filename: str) -> System2AnalysisResponse:
        today = datetime.now().strftime("%Y_%m_%d")
        base_name = Path(original_filename).stem
        clean_name = "".join(c if c.isalnum() else "_" for c in base_name.lower()).strip("_")
        suggested = f"{today}_{clean_name}.png"

        category_labels = {
            "code_bug_or_terminal": ("bug_fix", ["code", "terminal", "debug"]),
            "architecture_or_slide": ("architecture_reference", ["architecture", "diagram", "system"]),
            "receipt_or_invoice": ("financial_expense", ["finance", "receipt", "expense"]),
            "meme_or_clutter": ("document", ["clutter", "media"]),
        }
        intent, default_tags = category_labels.get(dominant_cat, ("document", ["screenshot"]))

        return System2AnalysisResponse(
            suggested_filename=suggested,
            summary_markdown=f"Indexed as `{dominant_cat}` from `{original_filename}`.",
            dominant_intent=intent,
            action_items=[],
            code_snippets=[],
            tags=default_tags,
        )

    def analyze_image(
        self,
        resized_image: Image.Image,
        dominant_cat: str,
        original_filename: str,
    ) -> System2Result:
        start_time = time.perf_counter()

        thinking_level = "DEFAULT"
        thinking_level_enum = None

        if dominant_cat in ["code_bug_or_terminal", "architecture_or_slide"]:
            thinking_level = "HIGH"
            thinking_level_enum = "HIGH"
        elif dominant_cat == "receipt_or_invoice":
            thinking_level = "MINIMAL"
            thinking_level_enum = "MINIMAL"

        if not self.client:
            fallback = self._generate_local_fallback(dominant_cat, original_filename)
            latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            return System2Result(
                s2_called=False,
                s2_latency_ms=latency_ms,
                thinking_level=thinking_level,
                response=fallback,
            )

        try:
            from google import genai
            from google.genai import types

            prompt = (
                f"You are System 2 of ChronicleOS. The screenshot is categorized as '{dominant_cat}'. "
                f"Today is {datetime.now().strftime('%Y-%m-%d')}. "
                f"1. Generate a descriptive snake_case filename starting with YYYY_MM_DD. "
                f"2. Provide an accurate Markdown summary of the screenshot. "
                f"3. Extract any code snippets, commands, or actionable items. "
                f"4. Provide 3-5 indexing tags."
            )

            config_kwargs = {
                "response_mime_type": "application/json",
                "response_schema": System2AnalysisResponse,
            }

            # Only configure thinking_config if a valid level is set (HIGH or MINIMAL)
            if thinking_level_enum:
                try:
                    config_kwargs["thinking_config"] = types.ThinkingConfig(thinking_level=thinking_level_enum)
                except Exception:
                    pass

            try:
                response = self.client.models.generate_content(
                    model=SYSTEM2_MODEL_ID,
                    contents=[resized_image, prompt],
                    config=types.GenerateContentConfig(**config_kwargs),
                )
            except Exception as call_err:
                # If model does not support thinking_config, retry without it
                if "thinking" in str(call_err).lower() and "thinking_config" in config_kwargs:
                    config_kwargs.pop("thinking_config", None)
                    response = self.client.models.generate_content(
                        model=SYSTEM2_MODEL_ID,
                        contents=[resized_image, prompt],
                        config=types.GenerateContentConfig(**config_kwargs),
                    )
                else:
                    raise call_err

            parsed = json.loads(response.text)
            analysis_resp = System2AnalysisResponse(**parsed)
            latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

            return System2Result(
                s2_called=True,
                s2_latency_ms=latency_ms,
                thinking_level=thinking_level,
                response=analysis_resp,
            )
        except Exception as e:
            print(f"[System 2] Inference error: {e}")
            fallback = self._generate_local_fallback(dominant_cat, original_filename)
            latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            return System2Result(
                s2_called=False,
                s2_latency_ms=latency_ms,
                thinking_level=thinking_level,
                response=fallback,
            )

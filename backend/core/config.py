import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Storage configuration
VAULT_DIR = Path(os.getenv("VAULT_DIR", BASE_DIR / "vault")).resolve()
ORGANIZED_DIR = VAULT_DIR / "organized"
QUARANTINE_DIR = VAULT_DIR / "quarantine"
ARCHIVE_DIR = VAULT_DIR / "archive"
DB_PATH = Path(os.getenv("DB_PATH", BASE_DIR / "chronicle_vault.db")).resolve()

# Ensure vault storage directories exist
for path in [ORGANIZED_DIR, QUARANTINE_DIR, ARCHIVE_DIR]:
    path.mkdir(parents=True, exist_ok=True)

# System 1 Local Edge Model
SIGLIP2_MODEL_ID = os.getenv("SIGLIP2_MODEL_ID", "google/siglip2-base-patch16-256")
SYSTEM1_DEVICE = "cpu"

# Routing and Security Thresholds
SECURITY_QUARANTINE_THRESHOLD = float(os.getenv("SECURITY_QUARANTINE_THRESHOLD", "0.35"))
CLUTTER_FILTER_THRESHOLD = float(os.getenv("CLUTTER_FILTER_THRESHOLD", "0.55"))

# System 2 Cloud Multimodal Reasoner
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SYSTEM2_MODEL_ID = os.getenv("SYSTEM2_MODEL_ID", "gemma-4-26b-a4b-it")

# Server settings
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

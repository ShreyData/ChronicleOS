# ChronicleOS

> Local-First Autonomous Screenshot Vault and Semantic Search Engine.

Chronicle is a privacy-focused screenshot management system designed to automatically categorize, secure, and index developer screenshots locally.

---

## Features

- **Local Multi-Label Routing:** Evaluates screenshots using SigLIP 2 (`google/siglip2-base-patch16-256`) on CPU to compute independent calibrated probabilities across code/terminals, architecture diagrams, receipts, and media clutter.
- **Security Quarantine Gate:** Detects potential credentials, API keys, or private secrets and immediately restricts access (`0o600` on POSIX systems) while preventing external API dispatch.
- **Clutter Filter:** Automatically archives memes and social media clutter locally to save cloud multimodal tokens.
- **Adaptive Patch-Token Budgeting:** Dynamically resizes images to exact multiples of 16x16 pixel patches matching Gemma 4's vision token buckets (280 patches for receipts/slides vs 1120 patches for code stack traces).
- **Zero-Extra-Model Hybrid Search:** Combines float32 visual embeddings from SigLIP 2 with SQLite FTS5 full-text keyword indexing for sub-millisecond local visual and semantic search.
- **Cross-Platform Ingestion:** Upload screenshots one-by-one, select multiple files, upload entire folders directly from the browser, or scan any directory path on the host.

---

## Architecture

```
ChronicleOS/
├── backend/
│   ├── api/
│   │   ├── routes_ingest.py    # File and folder ingestion endpoints
│   │   ├── routes_search.py    # Hybrid visual & semantic search
│   │   └── routes_vault.py     # Vault records & telemetry
│   ├── core/
│   │   ├── config.py           # Configuration and storage paths
│   │   ├── engine_system1.py   # SigLIP 2 CPU classifier & embedder
│   │   ├── engine_system2.py   # Gemma 4 multimodal reasoner
│   │   └── vault_db.py         # SQLite database with FTS5
│   └── main.py                 # FastAPI application
├── frontend/                   # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/         # IngestionPanel, SearchPanel, VaultPanel, TelemetryBar
│   │   └── App.tsx
│   └── package.json
└── vault/                      # Managed local storage
    ├── organized/              # Categorized and renamed screenshots
    ├── quarantine/             # Restricted access sensitive files
    └── archive/                # Archived clutter
```

---

## Quickstart

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ (for frontend development)

### 2. Environment Setup

```bash
# Clone the repository
git clone https://github.com/ShreyData/ChronicleOS.git
cd ChronicleOS

# Setup virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Pre-cache Local SigLIP 2 Model (One-Time)

```bash
python -c "
from transformers import AutoProcessor, AutoModel
import torch
AutoProcessor.from_pretrained('google/siglip2-base-patch16-256')
AutoModel.from_pretrained('google/siglip2-base-patch16-256', dtype=torch.bfloat16)
print('Model ready.')
"
```

### 4. Run the Application

The built frontend is embedded and served directly by the backend at `http://127.0.0.1:8000`:

```bash
source .venv/bin/activate
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Web Dashboard:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **API Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Frontend Development (Optional)

To run the Vite dev server with Hot Module Replacement:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Configuration

Set configuration variables in `.env`:

```env
# Optional: Google GenAI API Key for Gemma 4 structured reasoning
GEMINI_API_KEY=your_key_here

# Routing thresholds
SECURITY_QUARANTINE_THRESHOLD=0.35
CLUTTER_FILTER_THRESHOLD=0.55

# Server
HOST=127.0.0.1
PORT=8000
```

---

## Running Tests

```bash
source .venv/bin/activate
python -m unittest discover tests/
```

---

## License
MIT License

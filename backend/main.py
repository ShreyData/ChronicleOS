from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.core.config import (
    VAULT_DIR,
    HOST,
    PORT,
)
from backend.core.vault_db import init_db
from backend.api.routes_ingest import router as ingest_router
from backend.api.routes_search import router as search_router
from backend.api.routes_vault import router as vault_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="ChronicleOS API",
    description="Local-First Autonomous Screenshot Vault and Semantic Search Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(ingest_router)
app.include_router(search_router)
app.include_router(vault_router)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "ChronicleOS",
        "version": "1.0.0",
    }

# Mount vault storage for image rendering
app.mount("/vault/files", StaticFiles(directory=str(VAULT_DIR)), name="vault-files")

# Mount frontend build as fallback for root and client routing
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    @app.get("/")
    async def index():
        return {
            "service": "ChronicleOS API",
            "status": "online",
            "documentation": "/docs",
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)

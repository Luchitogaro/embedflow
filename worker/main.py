"""
Embedflow FastAPI Worker
AI-powered contract analysis pipeline.
"""

import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from routers import jobs, webhooks
from services.queue import process_next_job

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Embedflow worker starting up...")
    yield
    logger.info("Embedflow worker shutting down...")


app = FastAPI(
    title="Embedflow Worker",
    description="AI contract analysis pipeline",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "embedflow-worker"}


@app.post("/worker/poll")
async def poll_queue():
    """Poll the queue and process one job. Called by Railway/Render cron or external trigger."""
    try:
        result = await process_next_job()
        return {"processed": result}
    except Exception as e:
        logger.error(f"Poll error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("WORKER_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

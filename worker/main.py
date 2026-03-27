"""
Embedflow FastAPI Worker
AI-powered contract analysis pipeline.
"""

import os
import asyncio
import logging
from dotenv import load_dotenv
load_dotenv()
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


@app.post("/worker/retry-pending")
async def retry_pending():
    """Re-process all documents stuck in pending/processing status. Useful after worker restart."""
    from services.db import get_client
    from services.extractor import run_analysis
    from services.db import update_document_status
    from services.queue import enqueue_job, _memory_jobs
    client = get_client()

    # Find stuck documents
    result = client.table("documents").select("id, file_url, user_id").in_(
        "status", ["pending", "processing"]
    ).execute()

    retried = 0
    for doc in result.data:
        doc_id = doc["id"]
        logger.info(f"Retrying stuck document: {doc_id}")

        # Process inline
        try:
            await update_document_status(doc_id, "processing")
            analysis = await run_analysis(
                document_id=doc_id,
                file_url=doc["file_url"],
                user_id=doc["user_id"],
                locale="en",
            )
            await update_document_status(doc_id, "done")
            logger.info(f"Document {doc_id} analysis complete")
        except Exception as e:
            logger.error(f"Document {doc_id} failed: {e}")
            await update_document_status(doc_id, "error", str(e))

        retried += 1

    return {"retried": retried, "documents": [d["id"] for d in result.data]}


if __name__ == "__main__":
    import uvicorn

    # Railway sets PORT; local dev often uses WORKER_PORT.
    port = int(os.environ.get("PORT") or os.environ.get("WORKER_PORT", "8000"))
    dev = os.environ.get("ENVIRONMENT", "development").lower() in ("development", "dev", "local")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=dev)

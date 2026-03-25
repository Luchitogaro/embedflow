"""
Job router — enqueue and poll document analysis jobs.
"""

import os
import logging
import secrets
from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
from pydantic import BaseModel
from services.queue import enqueue_job, get_job_status, _memory_jobs
from services.extractor import run_analysis
from services.db import update_document_status

logger = logging.getLogger(__name__)
router = APIRouter()

WORKER_SHARED_SECRET = (os.getenv("WORKER_SHARED_SECRET") or "").strip()


def _require_worker_secret(x_worker_secret: str | None) -> None:
    if not WORKER_SHARED_SECRET:
        raise HTTPException(status_code=500, detail="Worker secret is not configured")
    provided = (x_worker_secret or "").strip()
    if not provided or not secrets.compare_digest(provided, WORKER_SHARED_SECRET):
        raise HTTPException(status_code=401, detail="Unauthorized worker request")


async def process_job(
    job_id: str,
    document_id: str,
    file_url: str,
    user_id: str,
    locale: str = "en",
):
    """Process a single analysis job."""
    try:
        _memory_jobs[job_id]["status"] = "processing"
        await update_document_status(document_id, "processing")
        logger.info(f"[{job_id}] Processing document {document_id}")

        result = await run_analysis(
            document_id=document_id,
            file_url=file_url,
            user_id=user_id,
            locale=locale,
        )

        _memory_jobs[job_id]["status"] = "done"
        _memory_jobs[job_id]["result"] = result
        logger.info(f"[{job_id}] Completed successfully")
    except Exception as e:
        logger.error(f"[{job_id}] Failed: {e}")
        _memory_jobs[job_id]["status"] = "error"
        _memory_jobs[job_id]["error"] = str(e)
        await update_document_status(document_id, "error", str(e))


class EnqueueRequest(BaseModel):
    document_id: str
    file_url: str
    user_id: str
    org_id: str | None = None
    locale: str | None = None


class EnqueueResponse(BaseModel):
    job_id: str
    status: str


@router.post("/", response_model=EnqueueResponse)
async def enqueue(
    req: EnqueueRequest,
    background_tasks: BackgroundTasks,
    x_worker_secret: str | None = Header(default=None, alias="x-worker-secret"),
):
    """
    Enqueue a document for analysis.
    Registers the job and schedules processing via FastAPI BackgroundTasks (same process).
    Optional Redis/BullMQ push is for future external workers only.
    """
    _require_worker_secret(x_worker_secret)
    loc = (req.locale or "en").strip() or "en"

    job_id = await enqueue_job(
        document_id=req.document_id,
        file_url=req.file_url,
        user_id=req.user_id,
        org_id=req.org_id,
        locale=loc,
    )

    # Always run analysis in this process (BackgroundTasks). Redis enqueue is optional telemetry;
    # there is no standalone BullMQ worker in-tree, so USE_REDIS=true previously left jobs stuck.
    background_tasks.add_task(
        process_job, job_id, req.document_id, req.file_url, req.user_id, loc
    )

    return EnqueueResponse(job_id=job_id, status="queued")


@router.get("/{job_id}")
async def poll_job(
    job_id: str,
    x_worker_secret: str | None = Header(default=None, alias="x-worker-secret"),
):
    """Poll the status of a job."""
    _require_worker_secret(x_worker_secret)
    status = await get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status

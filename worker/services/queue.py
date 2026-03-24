"""
Job queue service — uses Redis + BullMQ for job management.
Falls back to in-memory queue for local dev without Redis.
"""

import os
import json
import uuid
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
USE_REDIS = os.getenv("USE_REDIS", "true").lower() == "true"

# In-memory fallback for local dev
_memory_queue: list[dict] = []
_memory_jobs: dict[str, dict] = {}


def _get_redis():
    try:
        import redis
        return redis.from_url(REDIS_URL, decode_responses=True)
    except Exception:
        return None


def _get_bullmq():
    try:
        from bullmq import Queue, Worker
        return Queue, Worker
    except Exception:
        return None, None


Queue_class, Worker_class = None, None
redis_client = None

if USE_REDIS:
    redis_client = _get_redis()
    Queue_class, Worker_class = _get_bullmq()


async def enqueue_job(document_id: str, file_url: str, user_id: str, org_id: str | None) -> str:
    """Add a document analysis job to the queue."""
    job_id = str(uuid.uuid4())
    job_data = {
        "id": job_id,
        "document_id": document_id,
        "file_url": file_url,
        "user_id": user_id,
        "org_id": org_id,
        "status": "queued",
        "created_at": datetime.utcnow().isoformat(),
    }

    if Queue_class and redis_client:
        queue = Queue_class("embedflow-jobs", connection=redis_client)
        await queue.add(job_id, job_data, remove_on_complete=True)
        logger.info(f"Enqueued job {job_id} for document {document_id}")
    else:
        _memory_queue.append(job_id)
        _memory_jobs[job_id] = job_data
        logger.info(f"[DEV] Enqueued job {job_id} (in-memory)")

    return job_id


async def get_job_status(job_id: str) -> Optional[dict]:
    """Get the current status of a job."""
    if Queue_class and redis_client:
        queue = Queue_class("embedflow-jobs", connection=redis_client)
        job = await queue.get_job(job_id)
        if not job:
            return None
        return {
            "job_id": job_id,
            "status": job.status,
            "result": job.data,
        }
    else:
        return _memory_jobs.get(job_id)


async def process_next_job() -> bool:
    """Poll queue and process one job. Returns True if a job was processed."""
    from services.extractor import run_analysis

    if Queue_class and redis_client:
        queue = Queue_class("embedflow-jobs", connection=redis_client)
        job_id = await queue.get_next_job_id()
        if not job_id:
            return False
        job = await queue.get_job(job_id)
        if not job:
            return False
    else:
        if not _memory_queue:
            return False
        job_id = _memory_queue.pop(0)
        job = _memory_jobs.get(job_id)
        if not job:
            return False

    logger.info(f"Processing job {job_id}")
    job["status"] = "processing"

    try:
        result = await run_analysis(
            document_id=job["document_id"],
            file_url=job["file_url"],
            user_id=job["user_id"],
        )
        job["status"] = "done"
        job["result"] = result
        logger.info(f"Job {job_id} completed successfully")
        return True
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        job["status"] = "error"
        job["error"] = str(e)
        return False

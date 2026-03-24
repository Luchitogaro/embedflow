"""
Job router — enqueue and poll document analysis jobs.
"""

import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.queue import enqueue_job, get_job_status

logger = logging.getLogger(__name__)
router = APIRouter()


class EnqueueRequest(BaseModel):
    document_id: str
    file_url: str
    user_id: str
    org_id: str | None = None


class EnqueueResponse(BaseModel):
    job_id: str
    status: str


@router.post("/", response_model=EnqueueResponse)
async def enqueue(req: EnqueueRequest):
    """Add a document analysis job to the queue."""
    job_id = await enqueue_job(
        document_id=req.document_id,
        file_url=req.file_url,
        user_id=req.user_id,
        org_id=req.org_id,
    )
    return EnqueueResponse(job_id=job_id, status="queued")


@router.get("/{job_id}")
async def poll_job(job_id: str):
    """Poll the status of a job."""
    status = await get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status

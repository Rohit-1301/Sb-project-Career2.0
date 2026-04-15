"""
routes/job_fit.py
─────────────────
POST /api/job-fit
  Trigger the full RAG pipeline for a given user and return structured AI insights.
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.rag_pipeline import run_job_fit_pipeline

logger = logging.getLogger(__name__)
router = APIRouter()


class JobFitRequest(BaseModel):
    user_id: str


@router.post("/job-fit")
async def job_fit(request: JobFitRequest):
    """
    Run the RAG pipeline for a user:
      1. Embed their profile (all-MiniLM-L6-v2)
      2. Retrieve top-10 similar jobs from pgvector
      3. Generate insights via Gemini 3 Flash Preview
      4. Cache results in Supabase
      5. Return structured JSON
    """
    if not request.user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    try:
        result = run_job_fit_pipeline(user_id=request.user_id)
        return result
    except Exception as exc:
        logger.error(f"job_fit pipeline error for user={request.user_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

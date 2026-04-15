"""
routes/jobs.py
──────────────
POST /api/jobs/upload       → ingest & embed job data from /data/ files
GET  /api/jobs/recommendations → return cached top-k matches for a user
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from core.database import get_supabase
from services.retrieval_service import format_jobs_for_frontend
from utils.data_loader import load_jobs_from_source, get_jobs_count

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Models ────────────────────────────────────────────────────────────────

class JobUploadRequest(BaseModel):
    source: str = "naukri"   # 'naukri' | 'indeed' | 'wellfound'
    limit: int = 500


# ── Routes ────────────────────────────────────────────────────────────────

@router.post("/jobs/upload")
async def upload_jobs(request: JobUploadRequest):
    """
    Trigger data ingestion + embedding for a given source.
    Reads JSON files from /data/, embeds with all-MiniLM-L6-v2,
    and inserts into the Supabase `jobs` table.
    """
    valid_sources = ["naukri", "indeed", "wellfound"]
    if request.source not in valid_sources:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source. Must be one of: {valid_sources}"
        )

    limit = max(1, min(request.limit, 5000))   # clamp 1–5000

    try:
        inserted = load_jobs_from_source(source=request.source, limit=limit)
        total = get_jobs_count()
        return {
            "status": "success",
            "source": request.source,
            "inserted": inserted,
            "total_jobs_in_db": total,
        }
    except Exception as exc:
        logger.error(f"Job upload error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/jobs/recommendations")
async def get_recommendations(
    user_id: str = Query(..., description="Clerk user ID"),
    limit: int = Query(10, ge=1, le=50, description="Max jobs to return"),
):
    """
    Return cached job recommendations for a user from the `job_matches` table.
    If no cache exists, returns an empty list (client should call POST /api/job-fit first).
    """
    supabase = get_supabase()
    try:
        # Fetch from insights_cache (contains full job list as JSONB)
        cache_res = supabase.table("insights_cache") \
            .select("top_jobs, match_score, matching_skills, missing_skills, suggestions, updated_at") \
            .eq("user_id", user_id) \
            .execute()

        if not cache_res.data:
            return {
                "status": "no_cache",
                "message": "No recommendations yet. Please trigger /api/job-fit first.",
                "jobs": [],
                "insights": {},
            }

        row = cache_res.data[0]
        top_jobs = row.get("top_jobs") or []

        # top_jobs from Supabase JSONB may be a list or string
        if isinstance(top_jobs, str):
            import json
            top_jobs = json.loads(top_jobs)

        return {
            "status": "success",
            "jobs": top_jobs[:limit],
            "insights": {
                "match_score": row.get("match_score", 0),
                "matching_skills": row.get("matching_skills", []),
                "missing_skills": row.get("missing_skills", []),
                "suggestions": row.get("suggestions", []),
            },
            "cached_at": row.get("updated_at"),
        }

    except Exception as exc:
        logger.error(f"get_recommendations error for user={user_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/jobs/stats")
async def jobs_stats():
    """Quick stats endpoint — total jobs per source in Supabase."""
    supabase = get_supabase()
    try:
        res = supabase.table("jobs").select("source", count="exact").execute()
        total = get_jobs_count()
        return {"status": "success", "total_jobs": total}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

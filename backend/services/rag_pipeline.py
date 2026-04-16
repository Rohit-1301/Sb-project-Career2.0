"""
rag_pipeline.py
───────────────
Orchestrates the full RAG flow:
  1. Fetch user profile from Supabase
  2. Build profile text & embed it
  3. Cache user embedding in `user_embeddings`
  4. Retrieve top-k similar jobs via pgvector
  5. Call Gemini Flash for insights
  6. Enrich job list with per-job matched skills from insights
  7. Cache results in `job_matches` + `insights_cache`
  8. Return unified response dict

All caching uses a 1-hour TTL to minimise redundant API calls.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict

from core.database import get_supabase
from services.embedding_service import encode_text, build_profile_text
from services.retrieval_service import search_similar_jobs, format_jobs_for_frontend
from services.llm_service import generate_insights

logger = logging.getLogger(__name__)

CACHE_TTL_HOURS = 1


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_cache_fresh(updated_at_str: str | None) -> bool:
    if not updated_at_str:
        return False
    try:
        updated_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
        age = datetime.now(timezone.utc) - updated_at
        return age < timedelta(hours=CACHE_TTL_HOURS)
    except Exception:
        return False


def _fetch_profile(supabase, user_id: str) -> dict:
    """Merge users + profiles into a single dict."""
    try:
        user_res = supabase.table("users").select("*").eq("id", user_id).single().execute()
        profile_res = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        merged = {**(user_res.data or {}), **(profile_res.data or {})}
        return merged
    except Exception as exc:
        logger.error(f"Profile fetch error for {user_id}: {exc}")
        return {"id": user_id, "skills": [], "title": "", "bio": "", "experience": ""}


# ---------------------------------------------------------------------------
# Cache read/write
# ---------------------------------------------------------------------------

def _get_cached_insights(supabase, user_id: str) -> dict | None:
    try:
        res = supabase.table("insights_cache").select("*").eq("user_id", user_id).execute()
        if res.data:
            row = res.data[0]
            if _is_cache_fresh(row.get("updated_at")):
                logger.info(f"✅ Cache HIT for user {user_id}")
                return row
    except Exception as exc:
        logger.warning(f"Cache read error: {exc}")
    return None


def _save_insights_cache(supabase, user_id: str, insights: dict, top_jobs: list):
    try:
        import json
        supabase.table("insights_cache").upsert({
            "user_id": user_id,
            "match_score": insights.get("match_score", 0),
            "matching_skills": insights.get("matching_skills", []),
            "missing_skills": insights.get("missing_skills", []),
            "suggestions": insights.get("suggestions", []),
            "top_jobs": top_jobs,   # stored as JSONB
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        logger.info(f"✅ Insights cache saved for user {user_id}")
    except Exception as exc:
        logger.warning(f"Cache write error: {exc}")


def _save_job_matches(supabase, user_id: str, top_jobs: list):
    try:
        # Delete old matches for this user
        supabase.table("job_matches").delete().eq("user_id", user_id).execute()
        rows = []
        for rank, job in enumerate(top_jobs, start=1):
            job_id = job.get("id")
            if not job_id:
                continue
            rows.append({
                "user_id": user_id,
                "job_id": job_id,
                "match_score": job.get("match", 0) / 100,
                "rank": rank,
                "computed_at": datetime.now(timezone.utc).isoformat(),
            })
        if rows:
            supabase.table("job_matches").insert(rows).execute()
    except Exception as exc:
        logger.warning(f"job_matches write error: {exc}")


def _save_user_embedding(supabase, user_id: str, embedding: list):
    try:
        supabase.table("user_embeddings").upsert({
            "user_id": user_id,
            "embedding": embedding,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as exc:
        logger.warning(f"user_embeddings write error: {exc}")


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run_job_fit_pipeline(user_id: str) -> Dict[str, Any]:
    """
    Full RAG pipeline. Returns a dict ready to be sent as the API response.
    """
    supabase = get_supabase()

    # ── 1. Check cache ────────────────────────────────────────────────────
    cached = _get_cached_insights(supabase, user_id)
    if cached:
        top_jobs = cached.get("top_jobs") or []
        # top_jobs is stored as JSONB list in Supabase
        if isinstance(top_jobs, str):
            import json
            top_jobs = json.loads(top_jobs)
        return {
            "status": "success",
            "cached": True,
            "match_score": cached.get("match_score", 0),
            "matching_skills": cached.get("matching_skills", []),
            "missing_skills": cached.get("missing_skills", []),
            "suggestions": cached.get("suggestions", []),
            "top_jobs": top_jobs,
        }

    # ── 2. Fetch profile ──────────────────────────────────────────────────
    profile = _fetch_profile(supabase, user_id)
    profile_text = build_profile_text(profile)

    if not profile_text.strip():
        return {
            "status": "incomplete_profile",
            "message": "Please complete your profile (title, skills, experience) before running job fit.",
            "match_score": 0,
            "matching_skills": [],
            "missing_skills": [],
            "suggestions": ["Add your job title, skills, and experience level to your profile."],
            "top_jobs": [],
        }

    # ── 3. Embed user profile ─────────────────────────────────────────────
    logger.info(f"Embedding profile for user {user_id}…")
    user_embedding = encode_text(profile_text)
    _save_user_embedding(supabase, user_id, user_embedding)

    # ── 4. Vector similarity search ───────────────────────────────────────
    logger.info("Running pgvector similarity search…")
    raw_jobs = search_similar_jobs(query_embedding=user_embedding, top_k=10)
    top_jobs = format_jobs_for_frontend(raw_jobs, user_skills=profile.get("skills", []))

    if not top_jobs:
        return {
            "status": "no_jobs",
            "message": "No jobs in database yet. Please run /api/jobs/upload first.",
            "match_score": 0,
            "matching_skills": [],
            "missing_skills": [],
            "suggestions": ["Ask your admin to upload the job dataset."],
            "top_jobs": [],
        }

    # ── 5. LLM generation ─────────────────────────────────────────────────
    logger.info("Calling Gemini for structured insights…")
    insights = generate_insights(
        profile=profile,
        retrieved_jobs=top_jobs,
        profile_text=profile_text,
    )

    # ── 6. Enrich jobs with per-job matched skills & insights ─────────────
    job_insights_map = {
        ji["job_id"]: {
            "matched_skills": ji.get("matched_skills", []),
            "missing_skills": ji.get("missing_skills", []),
            "improvement_tips": ji.get("improvement_tips", "")
        }
        for ji in insights.get("job_insights", [])
    }
    for job in top_jobs:
        ji = job_insights_map.get(str(job["id"]), {})
        job["skills"] = ji.get("matched_skills", [])
        job["missing_skills"] = ji.get("missing_skills", [])
        job["improvement_tips"] = ji.get("improvement_tips", "")

    # ── 7. Persist to Supabase ────────────────────────────────────────────
    _save_job_matches(supabase, user_id, top_jobs)
    _save_insights_cache(supabase, user_id, insights, top_jobs)

    # ── 8. Return response ────────────────────────────────────────────────
    return {
        "status": "success",
        "cached": False,
        "match_score": insights.get("match_score", 0),
        "matching_skills": insights.get("matching_skills", []),
        "missing_skills": insights.get("missing_skills", []),
        "suggestions": insights.get("suggestions", []),
        "top_jobs": top_jobs,
    }

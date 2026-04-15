"""
retrieval_service.py
────────────────────
Performs pgvector cosine similarity search against the `jobs` table.
Uses Supabase's `rpc()` to call a SQL function we define in Supabase.

The Supabase SQL function `match_jobs` must be created once:

  CREATE OR REPLACE FUNCTION match_jobs(
      query_embedding vector(384),
      match_count      int   DEFAULT 10,
      match_threshold  float DEFAULT 0.2
  )
  RETURNS TABLE (
      id          uuid,
      title       text,
      company     text,
      location    text,
      salary      text,
      work_type   text,
      job_type    text,
      experience  text,
      url         text,
      description text,
      source      text,
      similarity  float
  )
  LANGUAGE sql STABLE
  AS $$
      SELECT
          id, title, company, location, salary, work_type,
          job_type, experience, url, description, source,
          1 - (embedding <=> query_embedding) AS similarity
      FROM public.jobs
      WHERE 1 - (embedding <=> query_embedding) > match_threshold
      ORDER BY embedding <=> query_embedding
      LIMIT match_count;
  $$;
"""

from __future__ import annotations

import logging
from typing import List

from core.database import get_supabase

logger = logging.getLogger(__name__)


def search_similar_jobs(
    query_embedding: List[float],
    top_k: int = 10,
    threshold: float = 0.20,
) -> List[dict]:
    """
    Call the Supabase `match_jobs` RPC function.
    Returns a list of job dicts with an added `similarity` float field.
    Falls back to a simple ORDER BY query if the RPC function is not yet created.
    """
    supabase = get_supabase()

    try:
        # Primary path: use the fast ivfflat-indexed RPC function
        result = supabase.rpc(
            "match_jobs",
            {
                "query_embedding": query_embedding,
                "match_count": top_k,
                "match_threshold": threshold,
            },
        ).execute()

        jobs = result.data or []
        logger.info(f"🔍 match_jobs RPC returned {len(jobs)} results.")
        return jobs

    except Exception as rpc_exc:
        # Fallback: fetch a random sample if RPC not yet installed
        logger.warning(
            f"match_jobs RPC failed ({rpc_exc}). Falling back to plain select."
        )
        try:
            result = supabase.table("jobs").select(
                "id, title, company, location, salary, work_type, job_type, "
                "experience, url, description, source"
            ).limit(top_k).execute()
            jobs = result.data or []
            # Attach a dummy similarity so downstream code doesn't break
            for job in jobs:
                job["similarity"] = 0.5
            return jobs
        except Exception as fallback_exc:
            logger.error(f"Fallback retrieval also failed: {fallback_exc}")
            return []


def format_jobs_for_frontend(jobs: list, user_skills: list = None) -> list:
    """
    Map Supabase job rows to the shape expected by the React frontend:
    { id, title, company, location, salary, match, skills, type, posted, description, logo, url }
    """
    import datetime

    now = datetime.datetime.utcnow()
    formatted = []

    for rank, job in enumerate(jobs, start=1):
        similarity = job.get("similarity", 0.5)
        match_pct = round(similarity * 100)

        # Derive a short logo string from company initials
        company = job.get("company", "N/A")
        logo = "".join(w[0].upper() for w in company.split()[:2]) if company else "??"

        formatted.append({
            "id": str(job.get("id", rank)),
            "title": job.get("title", "Unknown Role"),
            "company": company,
            "location": job.get("location", "N/A"),
            "salary": job.get("salary", "N/A"),
            "match": max(min(match_pct, 99), 50),   # clamp 50–99 for UX
            "skills": [],                             # enriched by LLM downstream
            "type": job.get("job_type", "full-time"),
            "posted": _relative_time(job.get("created_at")),
            "description": (job.get("description") or "")[:400],
            "logo": logo,
            "url": job.get("url", ""),
            "experience": job.get("experience", "N/A"),
            "source": job.get("source", ""),
        })

    return formatted


def _relative_time(iso_str: str | None) -> str:
    if not iso_str:
        return "Recently"
    import datetime
    try:
        dt = datetime.datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        delta = datetime.datetime.now(datetime.timezone.utc) - dt
        days = delta.days
        if days == 0:
            return "Today"
        if days == 1:
            return "Yesterday"
        if days < 7:
            return f"{days} days ago"
        if days < 30:
            return f"{days // 7} week{'s' if days >= 14 else ''} ago"
        return f"{days // 30} month{'s' if days >= 60 else ''} ago"
    except Exception:
        return "Recently"

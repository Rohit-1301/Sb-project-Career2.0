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
    user_experience: str = "",
) -> List[dict]:
    """
    Call the Supabase `match_jobs` RPC function.
    Returns a list of job dicts with an added `similarity` float field.
    Falls back to a simple ORDER BY query if the RPC function is not yet created.
    """
    supabase = get_supabase()

    # Fetch a larger pool if we need to filter by experience
    fetch_count = top_k * 4 if user_experience else top_k

    try:
        # Primary path: use the fast ivfflat-indexed RPC function
        result = supabase.rpc(
            "match_jobs",
            {
                "query_embedding": query_embedding,
                "match_count": fetch_count,
                "match_threshold": threshold,
            },
        ).execute()

        jobs = result.data or []
        
        # Apply experience heuristic filter
        if user_experience and jobs:
            import re
            user_exp_lower = user_experience.lower()
            is_fresher = "0-1" in user_exp_lower or "0" in user_exp_lower or "fresher" in user_exp_lower
            
            processed = []
            for job in jobs:
                job_exp = str(job.get("experience") or "").lower()
                job_desc = str(job.get("description") or "").lower()
                combined_text = job_exp + " " + job_desc
                
                # STRICT FILTER: If user is a fresher/junior, completely drop jobs asking for senior experience (3+ years)
                if is_fresher:
                    # Also drop typical senior keywords
                    if re.search(r'(3|4|5|6|7|8|9|10)\+?\s*(years|yrs|y)\s+(of\s+)?(experience|exp|professional)', combined_text) or "senior" in job_exp or "manager" in job_exp:
                        continue # Drop job entirely
                        
                processed.append(job)
                
            # Fallback if strict filtering removed too many jobs (e.g. all jobs were senior)
            if len(processed) < top_k and len(jobs) >= top_k:
                # We need top_k results. If strict filtering failed, add back the penalized ones
                for job in jobs:
                    if job not in processed and len(processed) < top_k:
                        job["similarity"] -= 0.3 # Heavy penalty but keeping it to fill quota
                        processed.append(job)

            # Re-sort and slice to top_k
            processed.sort(key=lambda x: x["similarity"], reverse=True)
            jobs = processed[:top_k]

        logger.info(f"🔍 match_jobs RPC returned {len(jobs)} results after experience filter.")
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

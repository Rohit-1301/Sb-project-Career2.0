"""
routes/analyze.py
─────────────────
POST /api/analyze-job
  Analyzes a custom provided Job Description against a given user's profile.
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.database import get_supabase
from services.rag_pipeline import _fetch_profile, build_profile_text
from services.llm_service import generate_insights

logger = logging.getLogger(__name__)
router = APIRouter()


class AnalyzeJobRequest(BaseModel):
    user_id: str
    job_description: str


@router.post("/analyze-job")
async def analyze_job(request: AnalyzeJobRequest):
    """
    Analyzes a user-provided job description against their profile using Gemini.
    """
    if not request.user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if not request.job_description or not request.job_description.strip():
        raise HTTPException(status_code=400, detail="job_description is required")

    try:
        supabase = get_supabase()
        # 1. Fetch user profile
        profile = _fetch_profile(supabase, request.user_id)
        profile_text = build_profile_text(profile)

        has_profile_signal = any([
            profile.get("title", "").strip(),
            profile.get("skills"),
            profile.get("bio", "").strip(),
            profile.get("experience", "").strip() not in ("", "0-1 years"),
        ])

        if not has_profile_signal:
            return {
                "status": "incomplete_profile",
                "message": "Please complete your profile (title, skills) before using the analyzer."
            }

        # 2. Mock a retrieved job containing this JD
        mock_job = {
            "id": "custom-jd",
            "title": "Custom Opportunity",
            "company": "External Company",
            "location": "Any",
            "experience": "Any",
            "match": "N/A",  # Tell AI to calculate this purely from text
            "description": request.job_description
        }

        # 3. Call LLM to run the 5-section analysis
        insights = generate_insights(
            profile=profile,
            retrieved_jobs=[mock_job],
            profile_text=profile_text,
        )

        # Ensure we get our specific job insights back
        job_insight = next((j for j in insights.get("job_insights", []) if j.get("job_id") == "custom-jd"), None)
        
        if not job_insight or not job_insight.get("alignment_review"):
            # Provide fallback safety if LLM choked
            job_insight = {
                "matched_skills": insights.get("matching_skills", []),
                "missing_skills": insights.get("missing_skills", []),
                "alignment_review": "AI Analysis failed to generate. Please ensure the job description is clear and try again."
            }

        return {
            "status": "success",
            "match_score": job_insight.get("match_score", insights.get("match_score", 0)),
            "matched_skills": job_insight.get("matched_skills", []),
            "missing_skills": job_insight.get("missing_skills", []),
            "alignment_review": job_insight.get("alignment_review", ""),
        }

    except Exception as exc:
        logger.error(f"Analyze job error for user={request.user_id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

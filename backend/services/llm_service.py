"""
llm_service.py
──────────────
LangChain + Gemini orchestration.
Primary model: gemini-3-flash-preview (user preference)
Fallback model: gemini-2.0-flash (if primary is unavailable)

Produces a structured JSON response containing:
  - match_score       : int (0-100)
  - matching_skills   : List[str]
  - missing_skills    : List[str]
  - suggestions       : List[str]
  - job_insights      : List[dict] (with per-job alignment_review, matched/missing skills)
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Models — tried in order until one works. gemini-3-flash-preview is primary.
# ---------------------------------------------------------------------------
_MODELS_TO_TRY = [
    "gemini-3-flash-preview",         # primary (user preference)
    "gemini-3.1-flash-lite-preview",  # secondary
    "gemini-2.0-flash",               # proven working fallback
    "gemini-1.5-flash",               # last resort
]

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = (
    "You are CareerSathi AI — a world-class career strategist and coach. "
    "Your job is to give candidates deep, honest, encouraging, and actionable career feedback "
    "based on their actual profile and the job requirements. "
    "Return ONLY the valid JSON object requested. No markdown, no code fences, no preamble."
)

_HUMAN_PROMPT = """USER PROFILE:
{profile_text}

RETRIEVED JOB LISTINGS (top {job_count}):
{jobs_text}

For EACH job in the list above, generate a comprehensive coaching breakdown in the alignment_review field.
The alignment_review MUST follow this exact 5-section structure, with each section separated by a blank line:

SECTION 1 — WHY YOU MATCH:
Start with "You are a [X]% match for this role because..." then explain specifically which of the user's skills, experience, and background directly satisfy this job's requirements. Be specific.

SECTION 2 — YOUR STRENGTHS FOR THIS ROLE:
Call out 2-3 specific strengths the user brings to this exact job. Reference actual technologies, domains, or qualities from their profile that align with the job description.

SECTION 3 — AREAS TO BRIDGE:
If there are missing skills, explain each one clearly: what the skill is, why this specific role needs it, and how critical the gap is (minor/moderate/critical). If there are no gaps, say: "You have no critical skill gaps for this role — your profile is a strong match."

SECTION 4 — YOUR GROWTH ROADMAP:
Give a concrete 2-3 step learning plan to close skill gaps. Recommend specific platforms, tools, or hands-on projects. If no gaps, suggest what would elevate the candidate from good to exceptional for this role.

SECTION 5 — BEFORE YOU HIT APPLY:
Give 2-3 specific, personalized tips to maximize their application success. E.g., which projects to highlight, how to tailor their resume headline, what to include in the cover letter, or which keywords to add.

Respond with ONLY this JSON object (no other text):
{{
  "match_score": <integer 0-100 overall career market match>,
  "matching_skills": [<skills from user profile that match the overall market>],
  "missing_skills": [<skills user lacks across the market>],
  "suggestions": [<2-4 high-level career improvement suggestions>],
  "job_insights": [
    {{
      "job_id": "<exact job id as provided above>",
      "matched_skills": [<skills the user HAS that match THIS specific job>],
      "missing_skills": [<skills the user LACKS for THIS specific job>],
      "alignment_review": "<The full 5-section coaching analysis, with sections separated by \\n\\n>"
    }}
  ]
}}

CRITICAL RULES:
- job_insights MUST include one entry for EVERY job listed, using the EXACT job id.
- alignment_review MUST always be a non-empty string — write a full detailed review even for strong matches.
- Do NOT skip any section in the alignment_review.
- Return ONLY valid JSON. No text outside the JSON object."""


# ---------------------------------------------------------------------------
# LangChain chain builder with model fallback
# ---------------------------------------------------------------------------

def _build_chain(model_name: str):
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY is not set in environment variables.")

    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=0.4,
        max_output_tokens=4096,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", _SYSTEM_PROMPT),
        ("human", _HUMAN_PROMPT),
    ])

    return prompt | llm | StrOutputParser()


def _invoke_with_fallback(payload: dict) -> str:
    """Try each model in _MODELS_TO_TRY in order until one succeeds."""
    last_exc = None
    for model in _MODELS_TO_TRY:
        try:
            chain = _build_chain(model)
            raw = chain.invoke(payload)
            logger.info(f"✅ Gemini response from model={model}, length={len(raw)} chars")
            return raw
        except Exception as exc:
            last_exc = exc
            logger.warning(f"⚠️ Model '{model}' failed: {type(exc).__name__}: {exc}. Trying next...")
    raise RuntimeError(f"All Gemini models failed. Last error: {last_exc}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_insights(
    profile: dict,
    retrieved_jobs: list,
    profile_text: str,
) -> Dict[str, Any]:
    """Run the LangChain + Gemini chain to produce structured career insights."""
    if not retrieved_jobs:
        return _empty_insights()

    # Build compact job listing text for the prompt
    jobs_lines = []
    for i, job in enumerate(retrieved_jobs[:10], start=1):
        jobs_lines.append(
            f"{i}. [{job['id']}] {job['title']} at {job['company']} "
            f"({job['location']}) | {job['experience']} | Match: {job['match']}%\n"
            f"   Description: {(job.get('description') or '')[:300]}"
        )
    jobs_text = "\n\n".join(jobs_lines)

    raw = ""
    try:
        raw = _invoke_with_fallback({
            "profile_text": profile_text,
            "job_count": len(retrieved_jobs[:10]),
            "jobs_text": jobs_text,
        })

        # Strip any accidental markdown fences
        cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
        insights = json.loads(cleaned)
        enriched_count = len(insights.get("job_insights", []))
        logger.info(f"✅ Insights parsed: match_score={insights.get('match_score')}, jobs_enriched={enriched_count}")
        return insights

    except json.JSONDecodeError as exc:
        logger.error(f"❌ JSON parse error: {exc}\nRaw snippet: {raw[:800]}")
        return _empty_insights()
    except Exception as exc:
        logger.error(f"❌ generate_insights failed ({type(exc).__name__}): {exc}", exc_info=True)
        return _empty_insights()


def _empty_insights() -> Dict[str, Any]:
    return {
        "match_score": 0,
        "matching_skills": [],
        "missing_skills": [],
        "suggestions": ["Please complete your profile for personalised AI insights."],
        "job_insights": [],
    }


def extract_skills_from_resume(resume_text: str) -> List[str]:
    """Extract a list of professional skills from a raw resume text block."""
    if not resume_text or not resume_text.strip():
        return []

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import StrOutputParser

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return []

        # Use fallback model for skill extraction too
        for model in [_PRIMARY_MODEL, _FALLBACK_MODEL]:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model,
                    google_api_key=api_key,
                    temperature=0.1,
                )
                prompt = ChatPromptTemplate.from_messages([
                    ("system", "Extract all professional skills (technical, tools, methodologies, soft skills) from the provided resume text. Return ONLY a JSON array of strings. Example: [\"Python\", \"Data Analysis\"]. No markdown, no code fences."),
                    ("human", "RESUME TEXT:\n{resume_text}")
                ])
                chain = prompt | llm | StrOutputParser()
                raw = chain.invoke({"resume_text": resume_text[:8000]})
                cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
                skills = json.loads(cleaned)
                if isinstance(skills, list):
                    return [str(s).strip() for s in skills if str(s).strip()]
                return []
            except Exception as exc:
                logger.warning(f"Skill extraction failed on model {model}: {exc}")
                continue
        return []
    except Exception as exc:
        logger.error(f"extract_skills_from_resume fatal error: {exc}", exc_info=True)
        return []

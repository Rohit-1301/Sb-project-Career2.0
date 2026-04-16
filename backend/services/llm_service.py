"""
llm_service.py
──────────────
LangChain + Gemini 3 Flash Preview orchestration.
Produces a structured JSON response containing:
  - match_score       : int (0-100)
  - matching_skills   : List[str]
  - missing_skills    : List[str]
  - suggestions       : List[str]
  - top_jobs          : List[dict]  (enriched with matched skills per job)
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LangChain chain builder
# ---------------------------------------------------------------------------

def _build_chain():
    """
    Build and return a LangChain chain:
      PromptTemplate | ChatGoogleGenerativeAI | StrOutputParser
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY is not set in environment variables.")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",        # gemini-3-flash-preview maps to this SDK alias
        google_api_key=api_key,
        temperature=0.3,
        max_output_tokens=2048,
    )

    system_prompt = (
        "You are CareerSathi AI, an expert career coach and job matching assistant. "
        "Analyse the user profile and the retrieved job listings, then return a "
        "structured JSON object — and ONLY that JSON object, with no markdown fences, "
        "no extra commentary."
    )

    human_prompt = """USER PROFILE:
{profile_text}

RETRIEVED JOB LISTINGS (top {job_count}):
{jobs_text}

Based on the user profile and the jobs above, respond with ONLY the following JSON structure:
{{
  "match_score": <integer 0-100 representing overall career match quality>,
  "matching_skills": [<list of skills the user has that match these roles>],
  "missing_skills": [<list of important skills the user lacks for these roles>],
  "suggestions": [<list of 2-4 actionable career improvement suggestions>],
  "job_insights": [
    {{
      "job_id": "<job id string>",
      "matched_skills": [<skills from user profile that match this specific job>]
    }}
  ]
}}

Rules:
- match_score must reflect how well the user fits the retrieved jobs overall.
- matching_skills and missing_skills must be concrete technical or domain skills.
- suggestions must be concise, actionable, and specific (not generic advice).
- job_insights must include one entry per job, using the exact job id provided.
- Return ONLY valid JSON. No prose, no backticks, no markdown."""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", human_prompt),
    ])

    chain = prompt | llm | StrOutputParser()
    return chain


_CHAIN = None


def _get_chain():
    global _CHAIN
    if _CHAIN is None:
        _CHAIN = _build_chain()
    return _CHAIN


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_insights(
    profile: dict,
    retrieved_jobs: list,
    profile_text: str,
) -> Dict[str, Any]:
    """
    Run the LangChain + Gemini chain to produce structured career insights.

    Args:
        profile:        Dict with user keys (name, skills, title, bio, experience).
        retrieved_jobs: List of job dicts already formatted for the frontend.
        profile_text:   Pre-built text representation of the user profile.

    Returns:
        Dict with keys: match_score, matching_skills, missing_skills,
                        suggestions, job_insights.
    """
    if not retrieved_jobs:
        return _empty_insights()

    # Build compact job listing text for the prompt
    jobs_lines = []
    for i, job in enumerate(retrieved_jobs[:10], start=1):
        jobs_lines.append(
            f"{i}. [{job['id']}] {job['title']} at {job['company']} "
            f"({job['location']}) | {job['experience']} | Match: {job['match']}%\n"
            f"   Description: {job['description'][:200]}…"
        )
    jobs_text = "\n\n".join(jobs_lines)

    try:
        chain = _get_chain()
        raw: str = chain.invoke({
            "profile_text": profile_text,
            "job_count": len(retrieved_jobs[:10]),
            "jobs_text": jobs_text,
        })

        # Strip any accidental markdown fences
        cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
        insights = json.loads(cleaned)
        logger.info(f"✅ Gemini insights generated. match_score={insights.get('match_score')}")
        return insights

    except json.JSONDecodeError as exc:
        logger.error(f"JSON parse error from Gemini response: {exc}\nRaw: {raw[:500]}")
        return _empty_insights()
    except Exception as exc:
        logger.error(f"LLM chain error: {exc}")
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
    """
    Extract a list of professional skills from a raw resume text block.
    """
    if not resume_text or not resume_text.strip():
        return []

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import StrOutputParser

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return []

        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview",
            google_api_key=api_key,
            temperature=0.1,
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", "Extract all professional skills (technical, tools, methodologies, soft skills) from the provided resume text. Return ONLY a JSON array of strings. Example: [\"Python\", \"Data Analysis\", \"Communication\"]. Do not wrap the response in markdown blocks like ```json."),
            ("human", "RESUME TEXT:\n{resume_text}")
        ])

        chain = prompt | llm | StrOutputParser()
        raw = chain.invoke({"resume_text": resume_text[:8000]})  # constrain size

        cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
        skills = json.loads(cleaned)
        
        if isinstance(skills, list):
            return [str(s).strip() for s in skills if str(s).strip()]
        return []
    except Exception as exc:
        logger.error(f"Error extracting skills from resume: {exc}", exc_info=True)
        return []

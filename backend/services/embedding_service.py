"""
embedding_service.py
────────────────────
Singleton wrapper around `all-MiniLM-L6-v2` from sentence-transformers.
Used for BOTH job ingestion (batch encoding) and per-request user-profile encoding.
Dimension: 384  (matches pgvector column type vector(384))
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import List, Union

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model singleton — loaded once at import time, reused on every request
# ---------------------------------------------------------------------------
_MODEL = None


def _get_model():
    global _MODEL
    if _MODEL is None:
        logger.info("Loading all-MiniLM-L6-v2 model (first run may take ~30 s)…")
        try:
            from sentence_transformers import SentenceTransformer
            _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("✅ all-MiniLM-L6-v2 loaded successfully.")
        except Exception as exc:
            logger.error(f"❌ Failed to load SentenceTransformer: {exc}")
            raise
    return _MODEL


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def encode_text(text: str) -> List[float]:
    """
    Encode a single text string into a 384-dim float list.
    Returns a plain Python list of floats (JSON-serialisable, Supabase-compatible).
    """
    model = _get_model()
    vec: np.ndarray = model.encode(text, normalize_embeddings=True)
    return vec.tolist()


def encode_batch(texts: List[str], batch_size: int = 64) -> List[List[float]]:
    """
    Encode multiple texts in batches.
    Returns a list of 384-dim float lists.
    """
    model = _get_model()
    embeddings: np.ndarray = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=True,
    )
    return embeddings.tolist()


def build_job_text(job: dict) -> str:
    """
    Concatenate job fields into a single string for embedding.
    Order matters — title + company are most discriminative.
    """
    parts = [
        job.get("title", ""),
        job.get("company", ""),
        job.get("location", ""),
        job.get("experience", ""),
        job.get("job_type", ""),
        job.get("description", ""),
    ]
    return " | ".join(p for p in parts if p and p.lower() != "n/a")


def build_profile_text(profile: dict) -> str:
    """
    Concatenate user-profile fields into a single string for embedding.
    """
    skills_str = ", ".join(profile.get("skills", []))
    parts = [
        profile.get("title", ""),
        profile.get("experience", ""),
        f"Skills: {skills_str}" if skills_str else "",
        profile.get("bio", ""),
        profile.get("resume_text", ""),
    ]
    return " | ".join(p for p in parts if p)

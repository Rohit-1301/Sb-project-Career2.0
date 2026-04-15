"""
data_loader.py
──────────────
Loads job JSON files from /data/ directory and ingests them into Supabase.
Generates all-MiniLM-L6-v2 embeddings in batches before inserting.

Supported sources:
  - naukri   → data/naukri_jobs*.json
  - indeed   → data/indeed_*.json
  - wellfound → data/wellfound_*.json

Usage (from backend API or CLI):
  from utils.data_loader import load_jobs_from_source
  inserted = load_jobs_from_source("naukri", limit=2000)
"""

from __future__ import annotations

import json
import logging
import os
import glob
from typing import List

from core.database import get_supabase
from services.embedding_service import encode_batch, build_job_text

logger = logging.getLogger(__name__)

# Path to the data directory (one level up from backend/)
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

# Source → glob pattern mapping
SOURCE_PATTERNS = {
    "naukri":    "naukri_jobs*.json",
    "indeed":    "indeed_*.json",
    "wellfound": "wellfound_*.json",
}


def _load_json_files(pattern: str) -> List[dict]:
    """Load all JSON files matching a glob pattern inside DATA_DIR."""
    full_pattern = os.path.join(DATA_DIR, pattern)
    files = sorted(glob.glob(full_pattern))
    logger.info(f"Found {len(files)} files matching pattern: {pattern}")

    all_records = []
    for filepath in files:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    all_records.extend(data)
                elif isinstance(data, dict):
                    all_records.append(data)
        except Exception as exc:
            logger.warning(f"Skipping {filepath}: {exc}")

    return all_records


def _normalize(record: dict, source: str) -> dict | None:
    """Normalize a raw job record to our Supabase schema."""
    title = (record.get("title") or "").strip()
    if not title or title.lower() == "n/a":
        return None  # skip records with no title

    return {
        "title": title,
        "company": (record.get("company") or "N/A").strip(),
        "location": (record.get("location") or "N/A").strip(),
        "salary": (record.get("salary") or "N/A").strip(),
        "work_type": (record.get("work_type") or "ONSITE").strip(),
        "job_type": (record.get("job_type") or "full-time").strip(),
        "experience": (record.get("experience") or "N/A").strip(),
        "url": (record.get("url") or "").strip(),
        "description": (record.get("job_description") or record.get("description") or "").strip()[:2000],
        "source": source,
    }


def load_jobs_from_source(source: str, limit: int = 2000, batch_size: int = 50) -> int:
    """
    Load, deduplicate, embed, and insert jobs from a given source into Supabase.

    Args:
        source:     One of 'naukri', 'indeed', 'wellfound'.
        limit:      Maximum number of records to process.
        batch_size: Number of records per embedding batch (memory-safe).

    Returns:
        Number of records actually inserted.
    """
    if source not in SOURCE_PATTERNS:
        raise ValueError(f"Unknown source '{source}'. Valid: {list(SOURCE_PATTERNS.keys())}")

    pattern = SOURCE_PATTERNS[source]
    raw_records = _load_json_files(pattern)
    logger.info(f"Loaded {len(raw_records)} raw records from source='{source}'")

    # Normalize & filter
    normalized = []
    seen_titles = set()
    for rec in raw_records:
        norm = _normalize(rec, source)
        if norm is None:
            continue
        # Simple dedup by title+company
        key = f"{norm['title'].lower()}|{norm['company'].lower()}"
        if key in seen_titles:
            continue
        seen_titles.add(key)
        normalized.append(norm)
        if len(normalized) >= limit:
            break

    logger.info(f"After dedup & limit: {len(normalized)} records to embed & insert.")

    if not normalized:
        return 0

    supabase = get_supabase()
    total_inserted = 0

    # Process in batches
    for i in range(0, len(normalized), batch_size):
        chunk = normalized[i: i + batch_size]
        texts = [build_job_text(j) for j in chunk]

        try:
            embeddings = encode_batch(texts, batch_size=batch_size)
        except Exception as exc:
            logger.error(f"Embedding batch {i}–{i+batch_size} failed: {exc}")
            continue

        rows = []
        for job_dict, embedding in zip(chunk, embeddings):
            rows.append({**job_dict, "embedding": embedding})

        try:
            supabase.table("jobs").insert(rows).execute()
            total_inserted += len(rows)
            logger.info(f"  Inserted batch {i}–{i+len(chunk)}: {len(rows)} rows (total so far: {total_inserted})")
        except Exception as exc:
            logger.error(f"  Insert batch {i}–{i+batch_size} failed: {exc}")

    logger.info(f"✅ load_jobs_from_source('{source}') complete. Total inserted: {total_inserted}")
    return total_inserted


def get_jobs_count(source: str | None = None) -> int:
    """Returns the count of jobs in Supabase, optionally filtered by source."""
    supabase = get_supabase()
    try:
        query = supabase.table("jobs").select("id", count="exact")
        if source:
            query = query.eq("source", source)
        result = query.execute()
        return result.count or 0
    except Exception:
        return 0

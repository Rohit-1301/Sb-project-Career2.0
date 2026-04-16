-- ==============================================================================
-- CareerSathi Production Fixes: Embeddings, Caching & Vector Matches
-- Run this entire script in your Supabase SQL Editor.
-- It will safely create the missing tables and functions without destroying data.
-- ==============================================================================

-- 1. Ensure Postgres Vector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create user_embeddings table
CREATE TABLE IF NOT EXISTS public.user_embeddings (
    user_id    TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    embedding  vector(384),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can manage user_embeddings" ON public.user_embeddings FOR ALL USING (true) WITH CHECK (true);

-- 3. Create job_matches table
CREATE TABLE IF NOT EXISTS public.job_matches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    job_id      UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    match_score FLOAT DEFAULT 0,
    rank        INT DEFAULT 0,
    computed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_matches_user_idx ON public.job_matches(user_id);

ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can manage job_matches" ON public.job_matches FOR ALL USING (true) WITH CHECK (true);

-- 4. Create insights_cache table
CREATE TABLE IF NOT EXISTS public.insights_cache (
    user_id         TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    match_score     FLOAT DEFAULT 0,
    matching_skills TEXT[] DEFAULT '{}',
    missing_skills  TEXT[] DEFAULT '{}',
    suggestions     TEXT[] DEFAULT '{}',
    top_jobs        JSONB DEFAULT '[]',
    updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.insights_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can manage insights_cache" ON public.insights_cache FOR ALL USING (true) WITH CHECK (true);

-- 5. Create or Replace the match_jobs AI Vector search function
CREATE OR REPLACE FUNCTION match_jobs(
    query_embedding  vector(384),
    match_count      int   DEFAULT 10,
    match_threshold  float DEFAULT 0.20
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
    created_at  timestamptz,
    similarity  float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        id, title, company, location, salary,
        work_type, job_type, experience, url,
        description, source, created_at,
        1 - (embedding <=> query_embedding) AS similarity
    FROM public.jobs
    WHERE 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;

-- 6. Reload PostgREST API schema cache
NOTIFY pgrst, 'reload schema';

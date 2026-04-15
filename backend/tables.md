# tables.md — CareerSathi Supabase Database Schema
## All tables, SQL definitions, column descriptions & relationships

---

## Setup: Enable pgvector Extension

Run this **first** in Supabase SQL Editor before creating any tables:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Existing Tables (Keep As-Is)

### `public.users`
Synced from Clerk webhooks on sign-in/sign-up.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `TEXT` PK | Clerk user ID (e.g. `user_2abc...`) |
| `email` | `TEXT` UNIQUE | Primary email address |
| `first_name` | `TEXT` | First name from Clerk |
| `last_name` | `TEXT` | Last name from Clerk |
| `image_url` | `TEXT` | Profile photo URL from Clerk |
| `created_at` | `TIMESTAMPTZ` | Auto-set on insert |

```sql
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can read users" ON public.users FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can upsert users" ON public.users FOR ALL USING (true) WITH CHECK (true);
```

---

### `public.profiles`
Career-specific data for each user. One-to-one with `users`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `TEXT` PK → FK `users.id` | Same as Clerk user ID |
| `title` | `TEXT` | Job title (e.g. "Data Scientist") |
| `bio` | `TEXT` | Short professional bio |
| `experience` | `TEXT` | Experience range (e.g. "2-5 years") |
| `skills` | `TEXT[]` | Array of skill strings |
| `resume_url` | `TEXT` | Public URL to uploaded resume |
| `resume_name` | `TEXT` | Original filename of uploaded resume |
| `updated_at` | `TIMESTAMPTZ` | Last profile update time |

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    experience TEXT DEFAULT '0-1 years',
    skills TEXT[] DEFAULT '{}',
    resume_url TEXT DEFAULT '',
    resume_name TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can upsert profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
```

---

## New Tables (Create These)

### `public.jobs`
Stores scraped job listings with pgvector embeddings for similarity search.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` PK | Auto-generated UUID |
| `title` | `TEXT` | Job title |
| `company` | `TEXT` | Company name |
| `location` | `TEXT` | Job location or "Remote" |
| `salary` | `TEXT` | Salary string or "N/A" |
| `work_type` | `TEXT` | "ONSITE", "REMOTE", "HYBRID" |
| `job_type` | `TEXT` | "full-time", "part-time", "internship", "contract" |
| `experience` | `TEXT` | Experience required (e.g. "2-5 Yrs") |
| `url` | `TEXT` | Original job listing URL |
| `description` | `TEXT` | Job description text (truncated to 2000 chars) |
| `source` | `TEXT` | Data source: "naukri", "indeed", "wellfound" |
| `embedding` | `vector(384)` | **all-MiniLM-L6-v2** embedding of title+company+description |
| `created_at` | `TIMESTAMPTZ` | Insertion timestamp |

```sql
CREATE TABLE IF NOT EXISTS public.jobs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    company     TEXT DEFAULT '',
    location    TEXT DEFAULT '',
    salary      TEXT DEFAULT 'N/A',
    work_type   TEXT DEFAULT 'ONSITE',
    job_type    TEXT DEFAULT 'full-time',
    experience  TEXT DEFAULT 'N/A',
    url         TEXT DEFAULT '',
    description TEXT DEFAULT '',
    source      TEXT DEFAULT '',
    embedding   vector(384),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS jobs_embedding_idx
    ON public.jobs
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can read jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Service role can insert jobs" ON public.jobs FOR INSERT WITH CHECK (true);
```

---

### `public.user_embeddings`
Caches the user profile embedding to avoid re-encoding on every request.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | `TEXT` PK → FK `users.id` | Clerk user ID |
| `embedding` | `vector(384)` | Profile text embedding (MiniLM) |
| `updated_at` | `TIMESTAMPTZ` | When the embedding was last computed |

```sql
CREATE TABLE IF NOT EXISTS public.user_embeddings (
    user_id    TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    embedding  vector(384),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can manage user_embeddings" ON public.user_embeddings FOR ALL USING (true) WITH CHECK (true);
```

---

### `public.job_matches`
Stores the ranked list of matched jobs per user (one row per job-user pair).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` PK | Auto-generated UUID |
| `user_id` | `TEXT` → FK `users.id` | Matches owner |
| `job_id` | `UUID` → FK `jobs.id` | Matched job |
| `match_score` | `FLOAT` | Cosine similarity score (0.0–1.0) |
| `rank` | `INT` | Rank within this user's results (1 = best) |
| `computed_at` | `TIMESTAMPTZ` | When match was computed |

```sql
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
```

---

### `public.chat_history`
Persists per-user conversation turns with the AI chatbot.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` PK | Auto-generated UUID |
| `user_id` | `TEXT` → FK `users.id` | Conversation owner |
| `role` | `TEXT` | Either `'user'` or `'ai'` |
| `message` | `TEXT` | Message content |
| `created_at` | `TIMESTAMPTZ` | Timestamp of message |

```sql
CREATE TABLE IF NOT EXISTS public.chat_history (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('user', 'ai')),
    message    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_history_user_idx ON public.chat_history(user_id);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can manage chat_history" ON public.chat_history FOR ALL USING (true) WITH CHECK (true);
```

---

### `public.insights_cache`
Caches the full AI-generated insights per user with a 1-hour TTL to minimise Gemini API calls.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | `TEXT` PK → FK `users.id` | Cache owner |
| `match_score` | `FLOAT` | Overall AI career match score |
| `matching_skills` | `TEXT[]` | Skills the user has that match market demand |
| `missing_skills` | `TEXT[]` | Skills missing for top job roles |
| `suggestions` | `TEXT[]` | AI-generated actionable career suggestions |
| `top_jobs` | `JSONB` | Full list of top-k job objects (frontend-ready) |
| `updated_at` | `TIMESTAMPTZ` | Cache timestamp — stale after 1 hour |

```sql
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
```

---

## pgvector Similarity Search Function

Create this SQL function once in Supabase to enable the fast `match_jobs` RPC:

```sql
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
```

---

## Relationships Diagram

```
users (1) ──────────────── (1) profiles
  │
  ├── (1) ──── (0..1) user_embeddings
  ├── (1) ──── (0..1) insights_cache
  ├── (1) ──── (0..N) job_matches ──── (N..1) jobs
  └── (1) ──── (0..N) chat_history
```

---

## Notes

- The `jobs` table uses **IVFFlat** index with `lists=100` — suitable for up to ~100K rows. For larger datasets, switch to HNSW: `USING hnsw (embedding vector_cosine_ops)`.
- All embeddings use **384 dimensions** matching `all-MiniLM-L6-v2`.
- The `insights_cache.top_jobs` JSONB column stores the complete frontend-ready job list including match scores, so the React app can render job cards directly without additional joins.
- RLS policies are open for development — tighten them with `auth.uid()` checks in production.

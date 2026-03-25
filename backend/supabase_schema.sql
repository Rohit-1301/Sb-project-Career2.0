-- =============================================
-- PASTE THIS IN YOUR SUPABASE SQL EDITOR
-- =============================================

-- Step 1: Create users table (if not already done)
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

-- Step 2: Create profiles table (if not already done)
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

-- Step 3: Create Supabase Storage bucket for resumes
-- Supabase Storage is managed via the Dashboard, but we can insert into the buckets table:
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Allow public access to read files in the resumes bucket
CREATE POLICY IF NOT EXISTS "Public read resumes"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes');

-- Step 5: Allow anyone to upload (for demo - tighten in production)
CREATE POLICY IF NOT EXISTS "Allow upload resumes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resumes');

-- Step 6: Allow anyone to delete their resume
CREATE POLICY IF NOT EXISTS "Allow delete resumes"
ON storage.objects FOR DELETE
USING (bucket_id = 'resumes');

# CareerSathi AI Platform 🚀

A modern, full-stack AI Career Intelligence Platform built with React (Vite), FastAPI, Clerk Authentication, and Supabase. The project features a stunning SaaS-style glassmorphic UI, real-time resume uploads, an AI chatbot interface, and personalized job recommendations.

## 🌟 Features

- **Authentication:** Secure user login and registration powered by **Clerk**.
- **User Profiles:** Manage career information, skills, and experience.
- **Resume Uploads:** Upload resumes (PDF/DOCX) securely to **Supabase Storage**.
- **AI Chatbot:** An interactive assistant for career guidance.
- **Job Recommendations:** AI-driven job matching based on user profiles.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js with Vite
- **Styling:** Tailwind CSS (Glassmorphism & Dark Mode)
- **State Management:** Zustand
- **Authentication:** Clerk React SDK
- **Routing:** React Router DOM
- **HTTP Client:** Axios

### Backend
- **Framework:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (Buckets)
- **Authentication Sync:** Svix (Clerk Webhooks) / Direct API Sync

---

## ⚡ Quick Start Guide

Follow these steps to run the project locally on your machine.

### Prerequisites
- Node.js (v18+ recommended)
- Miniconda or Anaconda (for Python environment)
- A Supabase account
- A Clerk account

### 1. Supabase Setup (Database & Storage)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Open the **SQL Editor**, and run the following queries to create the tables:

```sql
-- TABLE: users
CREATE TABLE public.users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- TABLE: profiles
CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    experience TEXT DEFAULT '0-1 years',
    skills TEXT[] DEFAULT '{}',
    resume_url TEXT DEFAULT '',
    resume_name TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
```

3. Open **Storage** in Supabase and create a new bucket named exactly `resumes`. **Make sure to mark it as PUBLIC**.

---

### 2. Backend Setup (FastAPI)

1. Navigate to the `backend` folder:
```bash
cd backend
```

2. Create and activate a Conda environment:
```bash
conda create -n fastapi-env python=3.10 -y
conda activate fastapi-env
```

3. Install the required Python packages:
```bash
pip install -r requirements.txt
```

4. Configure Environment Variables:
Create a `.env` file inside the `backend` directory (copy from `.env.example` if available):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret
```
*(The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security so your backend can safely manage users).*

5. Run the FastAPI server:
```bash
uvicorn main:app --reload
```
The backend will run on `http://localhost:8000`.

---

### 3. Frontend Setup (React + Vite)

1. Open a new terminal and navigate to the `frontend` folder:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Configure Environment Variables:
Create a `.env` file inside the `frontend` directory:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
VITE_API_BASE_URL=http://localhost:8000/api
```
*(You can get your Clerk Publishable Key from the Clerk Dashboard under API Keys).*

4. Run the development server:
```bash
npm run dev
```
The frontend will run on `http://localhost:5173`.

---

## 🚀 How to Use the App

1. Open `http://localhost:5173` in your browser.
2. Sign up or log in using Clerk.
3. Upon login, the app will automatically sync your Clerk identity to the Supabase Postgres database via the backend API!
4. Navigate to the **Profile** tab to upload your resume to Supabase Storage and manage your career details.

import axios from 'axios';

// ── Axios instance ─────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('supabase-auth-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Job Fit (RAG Pipeline) ─────────────────────────────────────────────────
/**
 * Trigger the full RAG pipeline for a user.
 * Returns: { match_score, matching_skills, missing_skills, suggestions, top_jobs }
 */
export const runJobFit = async (userId) => {
  const res = await api.post('/job-fit', { user_id: userId });
  return res.data;
};

/**
 * Trigger custom job analysis for a specific JD.
 */
export const analyzeCustomJob = async (userId, jobDescription) => {
  const res = await api.post('/analyze-job', { user_id: userId, job_description: jobDescription });
  return res.data;
};

// ── Job Recommendations (cached) ───────────────────────────────────────────
/**
 * Fetch cached job recommendations from Supabase for a user.
 * Returns: { jobs: [...], insights: { match_score, ... }, cached_at }
 */
export const getRecommendations = async (userId, limit = 10) => {
  const res = await api.get('/jobs/recommendations', {
    params: { user_id: userId, limit },
  });
  return res.data;
};

// ── Job Upload (admin / data ingestion) ────────────────────────────────────
/**
 * Trigger data ingestion from a given source (naukri | indeed | wellfound).
 */
export const uploadJobs = async (source = 'naukri', limit = 500) => {
  const res = await api.post('/jobs/upload', { source, limit });
  return res.data;
};

// ── Jobs Stats ─────────────────────────────────────────────────────────────
export const getJobsStats = async () => {
  const res = await api.get('/jobs/stats');
  return res.data;
};

// ── Legacy helpers for dev ─────────────────────────────────────────────────
export const mockApiCall = async (data, delay = 800) =>
  new Promise((resolve) => setTimeout(() => resolve({ data }), delay));

export default api;

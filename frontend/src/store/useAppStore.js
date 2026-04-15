import { create } from 'zustand';
import toast from 'react-hot-toast';
import axios from 'axios';
import { runJobFit, getRecommendations } from '../services/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const useAppStore = create((set, get) => ({
  // ── Profile ────────────────────────────────────────────────────────────
  profile: {
    name: '',
    email: '',
    skills: [],
    experience: '0-1 years',
    title: '',
    bio: '',
    image_url: '',
    resume_url: '',
    resume_name: '',
  },
  profileLoading: false,

  // ── Jobs & Insights (now real AI data) ────────────────────────────────
  jobs: [],
  jobsLoading: false,
  insights: [],
  aiInsights: {           // full AI response from /api/job-fit
    match_score: 0,
    matching_skills: [],
    missing_skills: [],
    suggestions: [],
  },
  activity: [
    { id: 1, action: 'Signed in', target: 'CareerSathi AI Platform', time: 'Just now' },
  ],

  // ── Chat ───────────────────────────────────────────────────────────────
  chatHistory: [
    {
      id: '1',
      role: 'ai',
      text: "Hello! I'm your CareerSathi AI. How can I help you advance your career today?",
    },
  ],
  isChatLoading: false,

  // ────────────────────────────────────────────────────────────────────────
  // fetchProfile — fetch user + career profile from backend
  // ────────────────────────────────────────────────────────────────────────
  fetchProfile: async (userId) => {
    if (!userId) return;
    set({ profileLoading: true });
    try {
      const res = await axios.get(`${API_BASE}/profile/${userId}`);
      const p = res.data.profile;
      set({
        profile: {
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'User',
          email: p.email || '',
          title: p.title || '',
          bio: p.bio || '',
          experience: p.experience || '0-1 years',
          skills: p.skills || [],
          image_url: p.image_url || '',
          resume_url: p.resume_url || '',
          resume_name: p.resume_name || '',
        },
        profileLoading: false,
      });
    } catch (e) {
      console.warn('Could not fetch profile from backend, using defaults.', e);
      set({ profileLoading: false });
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // fetchRecommendations — load cached AI job matches from backend
  // Falls back to running the full RAG pipeline if no cache exists
  // ────────────────────────────────────────────────────────────────────────
  fetchRecommendations: async (userId) => {
    if (!userId) return;
    set({ jobsLoading: true });
    try {
      // 1. Try cached results first
      const cached = await getRecommendations(userId, 10);

      if (cached.status === 'success' && cached.jobs?.length > 0) {
        set({
          jobs: cached.jobs,
          aiInsights: cached.insights || {},
          insights: _insightsToProgressBars(cached.insights),
          jobsLoading: false,
        });
        return;
      }

      // 2. No cache → run the full RAG pipeline
      toast.loading('Running AI job matching… this may take ~10 seconds.', {
        id: 'rag-loading',
        duration: 15000,
      });

      const result = await runJobFit(userId);
      toast.dismiss('rag-loading');

      if (result.status === 'success' || result.top_jobs?.length > 0) {
        set({
          jobs: result.top_jobs || [],
          aiInsights: {
            match_score: result.match_score || 0,
            matching_skills: result.matching_skills || [],
            missing_skills: result.missing_skills || [],
            suggestions: result.suggestions || [],
          },
          insights: _insightsToProgressBars({
            match_score: result.match_score,
            matching_skills: result.matching_skills,
          }),
          jobsLoading: false,
        });
        toast.success('AI job matching complete!');
      } else if (result.status === 'incomplete_profile') {
        toast.error('Please complete your profile first (title + skills).');
        set({ jobsLoading: false });
      } else if (result.status === 'no_jobs') {
        toast.error('Job database is empty. Contact admin to upload jobs.');
        set({ jobsLoading: false });
      } else {
        set({ jobsLoading: false });
      }
    } catch (err) {
      toast.dismiss('rag-loading');
      console.error('fetchRecommendations error:', err);
      toast.error('Could not load recommendations. Is the backend running?');
      set({ jobsLoading: false });
    }
  },

  // ────────────────────────────────────────────────────────────────────────
  // saveProfile — persist profile to backend
  // ────────────────────────────────────────────────────────────────────────
  saveProfile: async (userId, updates) => {
    const current = get().profile;
    const merged = { ...current, ...updates };
    set({ profile: merged });
    try {
      await axios.post(`${API_BASE}/profile/${userId}`, {
        title: merged.title,
        bio: merged.bio,
        experience: merged.experience,
        skills: merged.skills,
        resume_url: merged.resume_url || '',
      });
      toast.success('Profile saved to Supabase!');
      return true;
    } catch (e) {
      console.error('Save profile error:', e);
      toast.error('Could not save profile. Check backend.');
      return false;
    }
  },

  // ── Skill helpers ──────────────────────────────────────────────────────
  addSkill: (skill) => {
    if (!skill.trim()) return;
    const current = get().profile.skills;
    if (!current.includes(skill)) {
      set((state) => ({
        profile: { ...state.profile, skills: [...state.profile.skills, skill] },
      }));
    }
  },

  removeSkill: (skillToRemove) => {
    set((state) => ({
      profile: {
        ...state.profile,
        skills: state.profile.skills.filter((s) => s !== skillToRemove),
      },
    }));
  },

  // ── Chat helpers ───────────────────────────────────────────────────────
  addChatMessage: (message) => {
    set((state) => ({ chatHistory: [...state.chatHistory, message] }));
  },
  setChatLoading: (status) => set({ isChatLoading: status }),
  clearChat: () => {
    set({
      chatHistory: [
        { id: Date.now().toString(), role: 'ai', text: "Chat cleared. What's on your mind?" },
      ],
    });
  },
}));

// ── Util: convert AI insights to Dashboard progress bar format ─────────────
function _insightsToProgressBars(insights) {
  if (!insights) return [];
  const bars = [];
  if (insights.match_score != null) {
    bars.push({ id: 1, category: 'Overall Match Score', value: `${insights.match_score}%`, percentage: insights.match_score });
  }
  const topSkill = (insights.matching_skills || [])[0];
  if (topSkill) {
    bars.push({ id: 2, category: 'Top Matched Skill', value: topSkill, percentage: 90 });
  }
  const missing = (insights.missing_skills || [])[0];
  if (missing) {
    bars.push({ id: 3, category: 'Skill to Acquire', value: missing, percentage: 40 });
  }
  return bars;
}

export default useAppStore;

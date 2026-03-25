import { create } from 'zustand';
import { mockJobs, mockActivity, mockInsights } from '../services/mockData';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const useAppStore = create((set, get) => ({
  profile: {
    name: '',
    email: '',
    skills: [],
    experience: '0-1 years',
    title: '',
    bio: '',
    image_url: ''
  },
  profileLoading: false,
  
  jobs: mockJobs,
  insights: mockInsights,
  activity: mockActivity,
  
  chatHistory: [
    { id: '1', role: 'ai', text: "Hello! I'm your CareerSathi AI. How can I help you advance your career today? Try asking about 'jobs' or 'skills'." }
  ],
  isChatLoading: false,

  // ── Fetch profile from backend ─────────────────────────────────────────
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
          resume_name: p.resume_name || ''
        },
        profileLoading: false
      });
    } catch (e) {
      console.warn('Could not fetch profile from backend, using defaults.', e);
      set({ profileLoading: false });
    }
  },

  // ── Save profile to backend ────────────────────────────────────────────
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
        resume_url: ''
      });
      toast.success('Profile saved to Supabase!');
      return true;
    } catch (e) {
      console.error('Save profile error:', e);
      toast.error('Could not save profile. Check backend.');
      return false;
    }
  },

  // ── Local-only helpers ─────────────────────────────────────────────────
  addSkill: (skill) => {
    if (!skill.trim()) return;
    const current = get().profile.skills;
    if (!current.includes(skill)) {
      set((state) => ({ profile: { ...state.profile, skills: [...state.profile.skills, skill] } }));
    }
  },

  removeSkill: (skillToRemove) => {
    set((state) => ({
      profile: { ...state.profile, skills: state.profile.skills.filter(s => s !== skillToRemove) }
    }));
  },

  addChatMessage: (message) => {
    set((state) => ({ chatHistory: [...state.chatHistory, message] }));
  },

  setChatLoading: (status) => set({ isChatLoading: status }),

  clearChat: () => {
    set({ chatHistory: [{ id: Date.now().toString(), role: 'ai', text: "Chat cleared. What's on your mind?" }] });
  }
}));

export default useAppStore;

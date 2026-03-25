import { create } from 'zustand';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

const useAuthStore = create((set) => ({
  user: null,
  isInitialized: false,
  loading: false,

  initAuth: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      set({ user, isInitialized: true });
    } catch (error) {
      console.error('Error init auth:', error);
      set({ user: null, isInitialized: true });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user || null });
    });
  },

  signUp: async (email, password) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast.success('Sign up valid! Welcome to CareerSathi.');
      set({ user: data.user, loading: false });
      return true;
    } catch (error) {
      toast.error(error.message || 'Sign up failed');
      set({ loading: false });
      return false;
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      // Small mockup delay in UI feeling
      await new Promise(resolve => setTimeout(resolve, 800));
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Successfully logged in.');
      set({ user: data.user, loading: false });
      return true;
    } catch (error) {
      toast.error(error.message || 'Login failed. Provide any email and password.');
      set({ loading: false });
      return false;
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out.');
      set({ user: null, loading: false });
    } catch (error) {
      toast.error('Logout failed');
      set({ loading: false });
    }
  },
}));

export default useAuthStore;

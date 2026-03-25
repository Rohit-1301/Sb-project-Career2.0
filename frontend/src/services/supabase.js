import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock-project-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key';

// Mock client logic if real config is missing to ensure demo runs perfectly
const isConfigured = supabaseUrl !== 'https://mock-project-url.supabase.co' && import.meta.env.VITE_SUPABASE_URL;

class MockSupabaseAuth {
  constructor() {
    this.user = null;
  }

  async signUp({ email, password }) {
    this.user = { id: 'mock-1', email };
    return { data: { user: this.user }, error: null };
  }
  
  async signInWithPassword({ email, password }) {
    if (password) {
       this.user = { id: 'mock-1', email };
       return { data: { user: this.user }, error: null };
    }
    return { data: null, error: { message: 'Password is required' } };
  }

  async signOut() {
    this.user = null;
    return { error: null };
  }
  
  async getUser() {
    return { data: { user: this.user }, error: null };
  }
  
  onAuthStateChange(callback) {
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
}

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : { auth: new MockSupabaseAuth(), isMock: true };

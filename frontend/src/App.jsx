import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { Show, SignInButton, SignUpButton, useUser } from "@clerk/react";
import { BrainCircuit } from 'lucide-react';
import axios from 'axios';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Chatbot from './pages/Chatbot';
import Jobs from './pages/Jobs';
import Profile from './pages/Profile';

import useAppStore from './store/useAppStore';

// Dedicated Component to Sync User with backend and then load their profile
const UserSyncer = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { fetchProfile } = useAppStore();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      axios.post("http://localhost:8000/api/users/sync", {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        first_name: user.firstName || "",
        last_name: user.lastName || "",
        image_url: user.imageUrl || ""
      }).then(() => {
        // After syncing, fetch the full profile (career data) from Supabase
        fetchProfile(user.id);
      }).catch(err => console.error("Sync error:", err));
    }
  }, [user, isLoaded, isSignedIn]);
  
  return null;
};

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check system preference for dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: darkMode ? '#1f2937' : '#ffffff',
            color: darkMode ? '#f9fafb' : '#111827',
          }
        }}
      />
      
      {/* CLERK AUTHENTICATION GUARDRAILS */}
      <Show when="signed-out">
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dark:bg-gray-950 relative overflow-hidden">
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
          
          <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
            <div className="flex justify-center flex-col items-center">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl shadow-lg flex items-center justify-center text-white mb-6">
                <BrainCircuit size={40} className="drop-shadow-sm" />
              </div>
              <h2 className="mt-2 text-center text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Career<span className="text-primary-600 dark:text-primary-400">Sathi</span> AI
              </h2>
              <p className="mt-4 text-center text-base text-gray-600 dark:text-gray-400 font-medium">
                Please sign in to access your dashboard.
              </p>
            </div>

            <div className="mt-8 glass-panel py-8 px-6 shadow-2xl sm:rounded-3xl sm:px-10 flex flex-col gap-4">
              <SignInButton mode="modal">
                <button className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none transition-all">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="w-full flex justify-center py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none transition-all">
                  Create Account
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </Show>

      {/* SECURE ROUTES */}
      <Show when="signed-in">
        {/* SYNC USER TO BACKEND AUTOMATICALLY ON LOGIN */}
        <UserSyncer />
        <BrowserRouter>
          <Routes>
            <Route element={<DashboardLayout toggleDarkMode={toggleDarkMode} darkMode={darkMode} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<Chatbot />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </Show>
    </>
  );
}

export default App;

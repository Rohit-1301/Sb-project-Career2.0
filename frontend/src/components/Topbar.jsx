import { Menu, Moon, Sun, Search } from 'lucide-react';
import { UserButton } from "@clerk/react";
import useAppStore from '../store/useAppStore';

const Topbar = ({ setSidebarOpen, toggleDarkMode, darkMode }) => {
  const { profile } = useAppStore();

  return (
    <header className="h-20 glass-panel border-b-0 border-x-0 border-t-0 shadow-sm z-30 sticky top-0 px-4 sm:px-6 lg:px-8 border-b dark:border-gray-800/60 transition-all">
      <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
        
        <div className="flex items-center flex-1">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 mr-4 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <Menu size={24} />
          </button>

          <div className="relative w-full max-w-md hidden md:block group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400 group-focus-within:text-primary-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search jobs, skills, companies..."
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-full leading-5 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all sm:text-sm backdrop-blur-md hover:bg-white dark:hover:bg-gray-900"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-5">
          <button 
            onClick={toggleDarkMode} 
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 focus:outline-none transition-colors"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          


          <div className="flex items-center pl-2 sm:pl-4 border-l border-gray-200 dark:border-gray-800">
             {/* Use Clerk's UserButton! */}
             <UserButton />
            <div className="hidden sm:block text-left ml-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {profile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {profile.title}
              </p>
            </div>
          </div>
        </div>
        
      </div>
    </header>
  );
};

export default Topbar;

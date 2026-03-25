import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const DashboardLayout = ({ toggleDarkMode, darkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden text-gray-900 dark:text-gray-100 selection:bg-primary-200 selection:dark:bg-primary-900 font-sans">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-blue-400/5 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none -z-0"></div>
        <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-primary-400/5 dark:bg-primary-600/5 rounded-full blur-3xl pointer-events-none -z-0"></div>
        
        <Topbar 
          setSidebarOpen={setSidebarOpen} 
          toggleDarkMode={toggleDarkMode}
          darkMode={darkMode}
        />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar z-10 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto h-full space-y-6">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

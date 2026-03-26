import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquareText, Briefcase, UserRound, LogOut, X, BrainCircuit, LineChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import clsx from 'clsx';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const { signOut } = useAuthStore();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
    { name: 'AI Chatbot', path: '/chat', icon: MessageSquareText },
    { name: 'Recommended Jobs', path: '/jobs', icon: Briefcase },
    { name: 'Profile', path: '/profile', icon: UserRound },
  ];

  const NavLinks = () => (
    <div className="flex flex-col space-y-2 py-4">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={clsx(
              'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative',
              isActive 
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            {isActive && (
              <motion.div 
                layoutId="active-indicator"
                className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r-full"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <Icon size={20} className={clsx("transition-transform group-hover:scale-110", isActive && "text-primary-600 dark:text-primary-400")} />
            <span className="font-medium">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar content */}
      <motion.aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 glass-panel flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 overflow-y-auto rounded-r-[2rem] lg:rounded-none lg:border-r lg:border-l-0 lg:border-y-0",
          sidebarOpen ? "translate-x-0 shadow-2xl sm:w-80" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-gradient-to-br from-primary-500 to-blue-600 rounded-lg shadow-sm text-white">
                <BrainCircuit size={24} />
             </div>
             <span className="text-xl font-bold tracking-tight">Career<span className="text-primary-600 dark:text-primary-500">Sathi</span></span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-4 py-6">
          <div className="mb-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Menu
          </div>
          <NavLinks />
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={signOut}
            className="flex w-full items-center space-x-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;

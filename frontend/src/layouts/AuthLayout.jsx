import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dark:bg-gray-950 relative overflow-hidden">
      {/* Decorative background blobs - SaaS aesthetic */}
      <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-3xl opacity-50 animate-blob pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl opacity-50 animate-blob animation-delay-2000 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="sm:mx-auto sm:w-full sm:max-w-md z-10"
      >
        <div className="flex justify-center flex-col items-center">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl shadow-lg flex items-center justify-center text-white mb-6 transform hover:scale-105 transition-transform duration-300">
            <BrainCircuit size={40} className="drop-shadow-sm" />
          </div>
          <h2 className="mt-2 text-center text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Career<span className="text-primary-600 dark:text-primary-400">Sathi</span> AI
          </h2>
          <p className="mt-4 text-center text-base text-gray-600 dark:text-gray-400 font-medium">
            Your intelligent career copilot
          </p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10"
      >
        <div className="glass-panel py-8 px-6 shadow-2xl sm:rounded-3xl sm:px-10">
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLayout;

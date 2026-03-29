import { motion } from 'framer-motion';
import { MessageSquareText, Construction } from 'lucide-react';

const Chatbot = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center">
            Opportunity Analyzer
            <span className="ml-3 px-2.5 py-1 text-xs font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 rounded-full">
              COMING SOON
            </span>
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Advanced AI career guidance and resume parsing.
          </p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex-1 glass-card overflow-hidden flex flex-col shadow-xl justify-center items-center text-center p-8"
      >
        <div className="w-24 h-24 bg-primary-50 dark:bg-primary-900/30 rounded-full flex justify-center items-center mb-6 shadow-inner text-primary-600 dark:text-primary-400">
          <Construction size={48} />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Feature Under Construction
        </h2>
        
        <p className="text-gray-500 dark:text-gray-400 max-w-md text-lg leading-relaxed">
          The <strong className="text-primary-600 dark:text-primary-400">Opportunity Analyzer</strong> is currently being upgraded with more powerful AI models. 
          <br/><br/>
          This feature will be updated and available very soon! Stay tuned.
        </p>
        
      </motion.div>
    </div>
  );
};

export default Chatbot;

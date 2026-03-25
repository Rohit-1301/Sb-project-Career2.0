import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAppStore from '../store/useAppStore';
import { generateAiResponse } from '../services/mockData';
import clsx from 'clsx';

const Chatbot = () => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const { chatHistory, addChatMessage, isChatLoading, setChatLoading, clearChat, profile } = useAppStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isChatLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    addChatMessage({ id: Date.now().toString(), role: 'user', text: userMessage });
    setChatLoading(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse = generateAiResponse(userMessage);
      addChatMessage({ id: (Date.now() + 1).toString(), role: 'ai', text: aiResponse });
      setChatLoading(false);
    }, 1500); // Realistic feeling delay
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center">
            Career Copilot
            <span className="ml-3 px-2.5 py-1 text-xs font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 rounded-full">
              BETA
            </span>
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Ask me anything about your career path, skills, or job matches.
          </p>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center space-x-2 text-sm text-gray-500 hover:text-red-500 transition-colors bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800"
          title="Clear Conversation"
        >
          <Trash2 size={16} />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      <div className="flex-1 glass-card overflow-hidden flex flex-col shadow-xl">
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar scroll-smooth">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={clsx(
                  "flex items-start max-w-[85%] sm:max-w-2xl",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={clsx(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md",
                  msg.role === 'user' 
                    ? "ml-4 bg-gradient-to-tr from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 border border-gray-300 dark:border-gray-500" 
                    : "mr-4 bg-gradient-to-tr from-primary-500 to-blue-600 text-white"
                )}>
                  {msg.role === 'user' ? (
                     <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{profile.name.charAt(0)}</span>
                  ) : <BrainCircuit size={16} />}
                </div>

                <div className={clsx(
                  "px-5 py-3.5 rounded-2xl shadow-sm leading-relaxed text-[15px]",
                  msg.role === 'user'
                    ? "bg-primary-600 text-white rounded-tr-sm"
                    : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                )}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isChatLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 bg-gradient-to-tr from-primary-500 to-blue-600 text-white shadow-md">
                <BrainCircuit size={16} />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-tl-sm flex items-center shadow-sm">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              className="w-full pl-5 pr-14 py-4 bg-gray-50/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-full text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-medium text-[15px] shadow-inner"
              placeholder="Ask about your career, skills, or specific job matches..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isChatLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isChatLoading}
              className="absolute right-2 p-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Send size={18} className={clsx("transform transition-transform", !input.trim() ? "" : "translate-x-0.5 -translate-y-0.5")} />
            </button>
          </form>
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-400">
              AI insights are generated using a simulated model. For future integration, the backend will call OpenAI/FastAPI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

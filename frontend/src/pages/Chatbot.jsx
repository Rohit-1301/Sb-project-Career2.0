import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, AlertCircle, Sparkles, Loader2, Briefcase } from 'lucide-react';
import { useUser } from '@clerk/react';
import toast from 'react-hot-toast';
import { analyzeCustomJob } from '../services/api';

const Chatbot = () => {
  const { user } = useUser();
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description first.');
      return;
    }
    if (!user?.id) {
      toast.error('You must be signed in.');
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const res = await analyzeCustomJob(user.id, jobDescription);
      if (res.status === 'success') {
        setResult(res);
        toast.success('Analysis complete!');
      } else if (res.status === 'incomplete_profile') {
        toast.error(res.message || 'Please complete your profile first.');
      } else {
        toast.error('Failed to analyze the job.');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-8rem)] pb-12">
      <div className="flex justify-between items-end mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center">
            Opportunity Analyzer
            <Sparkles className="ml-3 text-primary-500" size={24} />
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-2xl">
            Paste any external job description below. CareerSathi AI will evaluate your profile against the requirements and provide a personalized alignment strategy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        {/* Left Column: Input */}
        <div className="flex flex-col gap-4">
          <div className="glass-card flex-1 flex flex-col p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Briefcase size={16} className="text-primary-500" />
              Job Description
            </label>
            <textarea
              className="flex-1 w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all resize-none text-sm text-gray-800 dark:text-gray-200"
              placeholder="Paste the full job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !jobDescription.trim()}
              className="mt-4 w-full py-3.5 px-6 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 dark:disabled:bg-primary-800 text-white font-semibold rounded-xl shadow-md disabled:shadow-none transition-all flex justify-center items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Analyzing Opportunity...
                </>
              ) : (
                <>
                  <Target size={20} />
                  Analyze Match
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            {!result && !isAnalyzing && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card flex-1 flex flex-col justify-center items-center text-center p-12 shadow-sm border border-gray-100 dark:border-gray-800"
              >
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex justify-center items-center mb-6 text-gray-400">
                  <Target size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ready to Analyze</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                  Paste a job description on the left and click Analyze to see your custom alignment report.
                </p>
              </motion.div>
            )}

            {isAnalyzing && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card flex-1 flex flex-col justify-center items-center text-center p-12 border border-gray-100 dark:border-gray-800"
              >
                <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/30 rounded-full flex justify-center items-center mb-6 text-primary-500">
                  <Loader2 size={40} className="animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AI is evaluating...</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Comparing your profile against the job requirements.
                </p>
              </motion.div>
            )}

            {result && !isAnalyzing && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card flex-1 p-0 overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-full"
              >
                <div className="p-6 bg-gradient-to-r from-primary-600 to-indigo-600 flex justify-between items-center">
                  <h3 className="text-white font-bold text-lg">Alignment Report</h3>
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex justify-center items-center shadow-inner border border-white/30">
                    <span className="text-2xl font-extrabold text-white">{result.match_score}%</span>
                  </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-gray-50 dark:bg-gray-900/40">
                  
                  {/* Matched Skills */}
                  {(result.matched_skills || []).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">✅ Matching Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {result.matched_skills.map((skill) => (
                          <span key={skill} className="px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50 rounded-md flex items-center gap-1">
                            <CheckCircle2 size={10} /> {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">⚠️ Skills to Develop</p>
                    <div className="flex flex-wrap gap-2">
                      {(result.missing_skills || []).length > 0 ? (
                        result.missing_skills.map((skill) => (
                          <span key={skill} className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50 rounded-md flex items-center gap-1">
                            <AlertCircle size={10} /> {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">🎉 Strong candidate! No obvious critical gaps.</span>
                      )}
                    </div>
                  </div>

                  {/* AI Coaching Review */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 mt-2">🤖 Detailed AI Analysis</p>
                    {result.alignment_review ? (
                      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4 shadow-sm">
                        {result.alignment_review.split('\n\n').filter(Boolean).map((section, idx) => {
                          // Simple formatting: bold the section headers
                          const isHeader = section.includes('SECTION') || section.match(/^[A-Z\s\:]+$/);
                          return (
                            <p key={idx} className={`text-sm leading-relaxed ${isHeader ? 'font-bold text-gray-900 dark:text-white mb-1 uppercase tracking-wide border-b pb-1 dark:border-gray-700' : 'text-gray-700 dark:text-gray-300'}`}>
                              {section}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No detailed analysis provided.</p>
                    )}
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

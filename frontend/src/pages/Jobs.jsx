import { useState, useEffect } from 'react';
import { Search, Briefcase, MapPin, DollarSign, Star, Target, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/react';
import useAppStore from '../store/useAppStore';

const Jobs = () => {
  const { user } = useUser();
  const { jobs, jobsLoading, aiInsights, profile, fetchRecommendations } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  const [expandedJobId, setExpandedJobId] = useState(null);

  // Fetch real AI-powered recommendations on mount
  useEffect(() => {
    if (user?.id) {
      fetchRecommendations(user.id);
    }
  }, [user?.id]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company?.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'High Match') return matchesSearch && job.match >= 85;
    return matchesSearch;
  });

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };

  const item = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  const handleRefresh = () => {
    if (user?.id) fetchRecommendations(user.id);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Recommended Jobs
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            AI-powered opportunities matched to your profile via RAG pipeline.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search jobs..."
              className="pl-10 px-4 py-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 backdrop-blur-sm sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter pills */}
          <div className="flex bg-white/50 dark:bg-gray-800/50 rounded-xl p-1 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
            {['All', 'High Match'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filter === f
                    ? f === 'High Match'
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={jobsLoading}
            title="Re-run AI matching"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={jobsLoading ? 'animate-spin' : ''} />
            {jobsLoading ? 'Matching…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* AI Summary Card */}
      {aiInsights.match_score > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-2 grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
              <Target size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Match Score</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{aiInsights.match_score}%</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Your Matching Skills</p>
            <div className="flex flex-wrap gap-1">
              {(aiInsights.matching_skills || []).slice(0, 4).map((s) => (
                <span key={s} className="px-2 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50 rounded-md flex items-center gap-1">
                  <CheckCircle2 size={10} /> {s}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Skills to Acquire</p>
            <div className="flex flex-wrap gap-1">
              {(aiInsights.missing_skills || []).slice(0, 4).map((s) => (
                <span key={s} className="px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50 rounded-md flex items-center gap-1">
                  <AlertCircle size={10} /> {s}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Profile context */}
      {profile.skills.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <Target size={16} className="text-primary-500 shrink-0" />
          <span>Matching against <strong className="text-gray-900 dark:text-white">{profile.skills.length}</strong> skills: {profile.skills.slice(0, 4).join(', ')}{profile.skills.length > 4 ? '…' : ''}</span>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {jobsLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="glass-card p-6 animate-pulse space-y-4">
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            </div>
          ))}
        </motion.div>
      )}

      {/* Job cards */}
      {!jobsLoading && (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <motion.div key={job.id} variants={item} className="glass-card overflow-hidden flex flex-col group hover:border-primary-500/30 dark:hover:border-primary-500/30">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 shadow-inner group-hover:shadow-md transition-shadow text-sm">
                          {job.logo || (job.company || 'JB').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                            {job.title}
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{job.company}</p>
                        </div>
                      </div>

                      {/* Match badge */}
                      {job.match >= 85 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800/50 shadow-sm whitespace-nowrap">
                          <Star size={11} className="mr-1 fill-current" /> {job.match}% Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 shadow-sm whitespace-nowrap">
                          {job.match}% Match
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400 mb-4">
                      <span className="flex items-center bg-gray-50 dark:bg-gray-800/60 px-2 py-1 rounded-md">
                        <MapPin size={12} className="mr-1 text-gray-400" /> {job.location || 'N/A'}
                      </span>
                      <span className="flex items-center bg-gray-50 dark:bg-gray-800/60 px-2 py-1 rounded-md">
                        <DollarSign size={12} className="mr-1 text-gray-400" /> {job.salary || 'N/A'}
                      </span>
                      <span className="flex items-center bg-gray-50 dark:bg-gray-800/60 px-2 py-1 rounded-md">
                        <Briefcase size={12} className="mr-1 text-gray-400" /> {job.type || job.job_type || 'full-time'}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                      {job.description || 'No description available.'}
                    </p>

                    {/* AI-matched skills */}
                    {(job.skills || []).length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">AI Matched Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {job.skills.map((skill) => {
                            const hasSkill = profile.skills.some((s) => s.toLowerCase() === skill.toLowerCase());
                            return (
                              <span
                                key={skill}
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${
                                  hasSkill
                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                                }`}
                              >
                                {hasSkill && <CheckCircle2 size={11} className="mr-1" />}
                                {skill}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center backdrop-blur-md">
                    <span className="text-xs text-gray-500 font-medium">Posted {job.posted || 'Recently'}</span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-xl transition-all"
                        >
                            {expandedJobId === job.id ? 'Show Less' : 'Know More'}
                        </button>
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Apply Now
                          </a>
                        )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedJobId === job.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700/50 flex flex-col gap-4 overflow-hidden"
                      >
                        <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Areas to Improve</p>
                            <div className="flex flex-wrap gap-2">
                              {(job.missing_skills || []).length > 0 ? job.missing_skills.map((skill) => (
                                <span key={skill} className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50 rounded-md flex items-center gap-1">
                                  <AlertCircle size={10} /> {skill}
                                </span>
                              )) : (
                                <span className="text-sm text-gray-500">You matched perfectly! No critical missing skills.</span>
                              )}
                            </div>
                        </div>
                        {job.improvement_tips && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">AI Coach Tip</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                   {job.improvement_tips}
                                </p>
                            </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center glass-card">
                <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No jobs found</h3>
                <p className="mt-1 text-gray-500">
                  {jobs.length === 0
                    ? 'Complete your profile and click Refresh to get AI-powered job matches.'
                    : 'Try adjusting your search or filters.'}
                </p>
                {jobs.length === 0 && (
                  <button
                    onClick={handleRefresh}
                    className="mt-4 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow transition-all"
                  >
                    Run AI Matching
                  </button>
                )}
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default Jobs;

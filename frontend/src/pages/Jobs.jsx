import { useState } from 'react';
import { Search, Filter, Briefcase, MapPin, DollarSign, Star, Target, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import useAppStore from '../store/useAppStore';

const Jobs = () => {
  const { jobs, profile } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'High Match') return matchesSearch && job.match >= 90;
    return matchesSearch;
  });

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Recommended Jobs
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
             Tailored opportunities based on your profile and skills.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
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
          <div className="flex bg-white/50 dark:bg-gray-800/50 rounded-xl p-1 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
             <button
              onClick={() => setFilter('All')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === 'All' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
             >
               All
             </button>
             <button
              onClick={() => setFilter('High Match')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === 'High Match' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
             >
               High Match
             </button>
          </div>
        </div>
      </div>

      {/* Profile Summary Card for context */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 mb-8 flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
         <div className="flex items-start gap-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl hidden sm:block">
              <Target size={24} />
            </div>
            <div>
               <h3 className="text-lg font-bold text-gray-900 dark:text-white">Matching against your profile</h3>
               <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                 We are using your {profile.skills.length} active skills ({profile.skills.slice(0,3).join(', ')}...) to find the best opportunities.
               </p>
            </div>
         </div>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredJobs.length > 0 ? filteredJobs.map((job) => (
          <motion.div key={job.id} variants={item} className="glass-card overflow-hidden flex flex-col group hover:border-primary-500/30 dark:hover:border-primary-500/30">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 shadow-inner group-hover:shadow-md transition-shadow">
                    {job.logo}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {job.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {job.company}
                    </p>
                  </div>
                </div>
                {job.match >= 90 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800/50 shadow-sm leading-none pt-1.5 pb-1">
                    <Star size={12} className="mr-1 fill-current" /> {job.match}% Match
                  </span>
                )}
                {job.match < 90 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 shadow-sm leading-none pt-1.5 pb-1">
                    {job.match}% Match
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mt-5 mb-5 font-medium">
                <div className="flex items-center bg-gray-50 dark:bg-gray-800/60 px-2 py-1 rounded-md">
                  <MapPin size={16} className="mr-1.5 text-gray-400" />
                  {job.location}
                </div>
                <div className="flex items-center bg-gray-50 dark:bg-gray-800/60 px-2 py-1 rounded-md">
                  <DollarSign size={16} className="mr-1.5 text-gray-400" />
                  {job.salary}
                </div>
                <div className="flex items-center bg-gray-50 dark:bg-gray-800/60 px-2 py-1 rounded-md">
                  <Briefcase size={16} className="mr-1.5 text-gray-400" />
                  {job.type}
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                {job.description}
              </p>

              <div className="mt-5">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map(skill => {
                    // Check if user has this skill
                    const hasSkill = profile.skills.some(s => s.toLowerCase() === skill.toLowerCase());
                    return (
                      <span 
                        key={skill} 
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${hasSkill ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'}`}
                      >
                        {hasSkill && <CheckCircle2 size={12} className="mr-1" />}
                        {skill}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center backdrop-blur-md">
              <span className="text-xs text-gray-500 font-medium">Posted {job.posted}</span>
              <button className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                Apply Now
              </button>
            </div>
          </motion.div>
        )) : (
          <div className="col-span-full py-12 text-center glass-card">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
               <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No jobs found</h3>
            <p className="mt-1 text-gray-500">Try adjusting your search or filters.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Jobs;

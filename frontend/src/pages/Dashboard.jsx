import { motion } from 'framer-motion';
import { TrendingUp, Target, BrainCircuit, Activity, ChevronRight, Briefcase } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { profile, insights, jobs, activity } = useAppStore();

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, scale: 0.95, y: 15 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      <motion.div variants={item} className="flex justify-between items-end mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Hi, {profile.name.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Here's what's happening with your career trajectory today.
          </p>
        </div>
        <Link to="/chat" className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
           <BrainCircuit size={18} />
           <span className="font-semibold text-sm">Ask AI</span>
        </Link>
      </motion.div>

      {/* Top Cards Array */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={item} className="glass-card p-6 flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute -right-6 -top-6 text-primary-500/10 group-hover:scale-110 transition-transform duration-500 rotate-12">
            <Target size={120} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Profile Match</h3>
              <span className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <Target size={20} />
              </span>
            </div>
            <div className="mt-4 flex items-baseline">
              <p className="text-4xl font-extrabold text-gray-900 dark:text-white">High</p>
              <p className="ml-2 text-sm text-green-600 dark:text-green-400 flex items-center font-medium">
                <TrendingUp size={14} className="mr-1" /> +5%
              </p>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Competitiveness score</p>
          </div>
        </motion.div>

        <motion.div variants={item} className="glass-card p-6 flex flex-col justify-between overflow-hidden relative group">
           <div className="absolute -right-6 -top-6 text-blue-500/10 group-hover:scale-110 transition-transform duration-500 rotate-12">
            <BrainCircuit size={120} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Active Skills</h3>
              <span className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <BrainCircuit size={20} />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-4xl font-extrabold text-gray-900 dark:text-white">{profile.skills.length}</p>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {profile.skills.slice(0, 2).map(skill => (
                <span key={skill} className="px-2 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-gray-700">
                  {skill}
                </span>
              ))}
              {profile.skills.length > 2 && <span className="text-xs text-gray-500">+{profile.skills.length - 2} more</span>}
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="glass-card p-6 flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute -right-6 -top-6 text-purple-500/10 group-hover:scale-110 transition-transform duration-500 rotate-12">
            <Briefcase size={120} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Job Matches</h3>
              <span className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <Briefcase size={20} />
              </span>
            </div>
            <div className="mt-4 flex items-baseline">
              <p className="text-4xl font-extrabold text-gray-900 dark:text-white">{jobs.filter(j => j.match > 80).length}</p>
              <p className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-medium">Excellent</p>
            </div>
            <Link to="/jobs" className="mt-2 inline-flex items-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 group-hover:translate-x-1 transition-transform font-medium">
              View recommendations <ChevronRight size={14} className="ml-1" />
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Jobs */}
        <motion.div variants={item} className="lg:col-span-2 glass-card overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center backdrop-blur-md bg-white/40 dark:bg-gray-900/40">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Top Recommendations</h2>
            <Link to="/jobs" className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">See all</Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {jobs.slice(0, 3).map((job) => (
              <div key={job.id} className="p-6 hover:bg-white/60 dark:hover:bg-gray-800/80 transition-colors group cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                     <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 shadow-inner">
                        {job.logo}
                     </div>
                     <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{job.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{job.company} • {job.location}</p>
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {job.skills.slice(0, 3).map(skill => (
                            <span key={skill} className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md">
                              {skill}
                            </span>
                          ))}
                        </div>
                     </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-2.5 py-1 text-xs font-bold bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800 whitespace-nowrap">
                      {job.match}% Match
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">{job.salary}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Career Insights */}
          <motion.div variants={item} className="glass-card overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 backdrop-blur-md bg-white/40 dark:bg-gray-900/40">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Insights</h2>
            </div>
            <div className="p-6 space-y-5">
              {insights.map((insight) => (
                <div key={insight.id}>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="font-semibold text-gray-600 dark:text-gray-300">{insight.category}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{insight.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary-500 to-blue-500 h-2 rounded-full" 
                      style={{ width: `${insight.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={item} className="glass-card overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 backdrop-blur-md bg-white/40 dark:bg-gray-900/40">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {activity.map((item, itemIdx) => (
                    <li key={item.id}>
                      <div className="relative pb-8">
                        {itemIdx !== activity.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ring-8 ring-white dark:ring-[#111827] border border-gray-200 dark:border-gray-700 z-10 relative">
                              <Activity className="h-4 w-4 text-gray-500" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">
                                {item.action} 
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 break-words line-clamp-2">
                                {item.target}
                              </p>
                            </div>
                            <div className="text-right text-xs whitespace-nowrap text-gray-500">
                              <time>{item.time}</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;

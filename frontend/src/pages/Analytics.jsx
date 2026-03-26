import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, BarChart3, Map, Filter, Briefcase } from 'lucide-react';
import axios from 'axios';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [platform, setPlatform] = useState('all'); // all, wellfound, internshala

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`http://localhost:8000/api/analytics/dashboard?platform=${platform}`);
        setData(response.data);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [platform]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pt-4 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="text-primary-600 dark:text-primary-400" size={32} />
            Market Analytics
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Data-driven insights from live job postings across top platforms.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <Filter size={18} className="text-gray-500 ml-2" />
          <select 
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-700 dark:text-gray-200 cursor-pointer pr-8 pl-2 w-36 outline-none appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
          >
            <option value="all">All Platforms</option>
            <option value="wellfound">Wellfound</option>
            <option value="internshala">Internshala</option>
          </select>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
             <motion.div variants={item} className="glass-card p-6 flex flex-col justify-center items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl mb-3">
                  <Activity size={24} />
                </div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Jobs Analyzed</h3>
                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{data.total_jobs?.toLocaleString() || 0}</p>
             </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Salary Chart */}
            <motion.div variants={item} className="glass-card p-6 min-h-[400px]">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center mr-3">₹</span>
                Average Salary by Role
              </h2>
              {data.salary_distribution?.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.salary_distribution} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{fill: '#6B7280', fontSize: 12}} />
                      <YAxis tickFormatter={(val) => `₹${val/1000}k`} tick={{fill: '#6B7280', fontSize: 12}} />
                      <RechartsTooltip 
                        formatter={(value) => [`₹${value.toLocaleString()}`, 'Avg Salary']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="avg_salary" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {data.salary_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">No salary data available</div>
              )}
            </motion.div>

            {/* Job Types Pie Chart */}
            <motion.div variants={item} className="glass-card p-6 min-h-[400px]">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mr-3">
                  <Briefcase size={16} />
                </span>
                Job Type Distribution
              </h2>
              {data.job_types?.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.job_types}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.job_types.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value) => [value.toLocaleString(), 'Count']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">No job type data available</div>
              )}
            </motion.div>

            {/* Top Locations */}
            <motion.div variants={item} className="glass-card p-6 lg:col-span-2 min-h-[400px]">
               <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mr-3">
                  <Map size={16} />
                </span>
                Top Locations
              </h2>
              {data.locations?.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={data.locations} margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                      <XAxis type="number" tick={{fill: '#6B7280', fontSize: 12}} />
                      <YAxis dataKey="name" type="category" tick={{fill: '#6B7280', fontSize: 12}} width={100} />
                      <RechartsTooltip 
                        formatter={(value) => [value, 'Jobs']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20}>
                        {data.locations.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">No location data available</div>
              )}
            </motion.div>

          </div>
        </>
      ) : null}
    </motion.div>
  );
};

export default Analytics;

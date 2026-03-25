import { useState, useRef } from 'react';
import { User, Mail, Briefcase, Plus, X, UploadCloud, Save, Loader2, CheckCircle2, FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/react';
import axios from 'axios';
import useAppStore from '../store/useAppStore';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const Profile = () => {
  const { user } = useUser();
  const { profile, saveProfile, addSkill, removeSkill, profileLoading, fetchProfile } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ title: '', bio: '', experience: '0-1 years' });
  const [newSkill, setNewSkill] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Resume upload states
  const fileInputRef = useRef(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeProgress, setResumeProgress] = useState(0);
  const [deletingResume, setDeletingResume] = useState(false);

  const handleEdit = () => {
    setFormData({ title: profile.title || '', bio: profile.bio || '', experience: profile.experience || '0-1 years' });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    await saveProfile(user.id, formData);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleAddSkill = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      if (newSkill.trim()) { addSkill(newSkill.trim()); setNewSkill(''); }
    }
  };

  // ── Resume handlers ────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and Word (.docx) files are allowed!');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be smaller than 5 MB');
      return;
    }

    setUploadingResume(true);
    setResumeProgress(0);
    const formDataFile = new FormData();
    formDataFile.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/profile/${user.id}/resume`, formDataFile, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setResumeProgress(Math.round((e.loaded * 100) / e.total));
        }
      });
      toast.success('Resume uploaded successfully!');
      // Refresh profile to get new resume_url and resume_name
      await fetchProfile(user.id);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploadingResume(false);
      setResumeProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteResume = async () => {
    if (!user) return;
    setDeletingResume(true);
    try {
      await axios.delete(`${API_BASE}/profile/${user.id}/resume`);
      toast.success('Resume removed');
      await fetchProfile(user.id);
    } catch (err) {
      toast.error('Could not delete resume');
    } finally {
      setDeletingResume(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 pt-4">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">My Profile</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Manage your career profile. Changes are saved to Supabase.</p>
        </div>
        {!isEditing ? (
          <button onClick={handleEdit} className="px-5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => setIsEditing(false)} className="px-5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 bg-primary-600 text-white font-semibold rounded-xl shadow-sm hover:bg-primary-700 transition-colors flex items-center disabled:opacity-50">
              {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Identity (Clerk) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 backdrop-blur-md bg-white/40 dark:bg-gray-900/40">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><User className="mr-2 h-5 w-5 text-gray-400" /> Identity (from Clerk)</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-5">
            {profile.image_url ? (
              <img src={profile.image_url} alt={profile.name} className="w-20 h-20 rounded-2xl shadow-md object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-blue-500 flex items-center justify-center text-3xl font-bold text-white shadow-md">
                {profile.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{profile.name || 'Your Name'}</p>
              <div className="flex items-center mt-1 text-gray-500 dark:text-gray-400">
                <Mail size={14} className="mr-1.5" />
                <span className="text-sm">{profile.email}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2 dark:text-gray-500">Edit name/picture via the user button (top-right).</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Career Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 backdrop-blur-md bg-white/40 dark:bg-gray-900/40">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center"><Briefcase className="mr-2 h-5 w-5 text-gray-400" /> Career Information</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Job Title</label>
            {isEditing ? (
              <input type="text" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 font-medium" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
            ) : (
              <div className="text-gray-900 dark:text-white font-medium px-4 py-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl">{profile.title || '—'}</div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Experience Level</label>
            {isEditing ? (
              <select className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 font-medium" value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})}>
                <option value="0-1 years">0-1 years (Entry)</option>
                <option value="1-3 years">1-3 years (Junior)</option>
                <option value="3-5 years">3-5 years (Mid)</option>
                <option value="5+ years">5+ years (Senior)</option>
              </select>
            ) : (
              <div className="text-gray-900 dark:text-white font-medium px-4 py-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl">{profile.experience || '—'}</div>
            )}
          </div>
          <div className="col-span-full">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bio / Summary</label>
            {isEditing ? (
              <textarea rows={4} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 font-medium resize-none" value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} />
            ) : (
              <div className="text-gray-900 dark:text-white font-medium px-4 py-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl min-h-[4rem]">{profile.bio || 'No summary provided.'}</div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Skills */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 backdrop-blur-md bg-white/40 dark:bg-gray-900/40">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Skills & Competencies</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2 mb-6">
            {(profile.skills || []).map((skill) => (
              <span key={skill} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                {skill}
                {isEditing && (
                  <button onClick={() => removeSkill(skill)} className="ml-2 text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                )}
              </span>
            ))}
            {(profile.skills || []).length === 0 && !isEditing && (
              <p className="text-sm text-gray-400">No skills added yet. Click Edit Profile to add skills.</p>
            )}
          </div>
          {isEditing && (
            <div className="flex max-w-sm">
              <input type="text" placeholder="e.g. AWS, Node.js" className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={handleAddSkill} />
              <button type="button" onClick={handleAddSkill} className="px-4 py-2 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 font-semibold rounded-r-xl border border-l-0 border-gray-200 dark:border-gray-700 hover:bg-primary-200 transition-colors flex items-center">
                <Plus size={18} className="mr-1" /> Add
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Resume Upload */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 backdrop-blur-md bg-white/40 dark:bg-gray-900/40">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Resume / CV</h2>
          <p className="text-xs text-gray-400 mt-0.5">PDF or Word (.docx), max 5 MB. Stored in Supabase Storage.</p>
        </div>
        <div className="p-6 space-y-4">

          {/* Upload zone - only show if no resume uploaded */}
          {!profile.resume_url && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div
                onClick={() => !uploadingResume && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors group ${uploadingResume ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700' : 'border-primary-300 dark:border-primary-700 hover:border-primary-500 dark:hover:border-primary-500 cursor-pointer hover:bg-primary-50/40 dark:hover:bg-primary-900/10'}`}
              >
                <div className="p-4 bg-white dark:bg-gray-900 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="h-8 w-8 text-primary-500" />
                </div>
                {uploadingResume ? (
                  <>
                    <p className="text-sm font-bold text-gray-700 dark:text-white mb-3">Uploading to Supabase Storage...</p>
                    <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full transition-all duration-300" style={{ width: `${resumeProgress}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{resumeProgress}%</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Click to upload your resume</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PDF or Word (.docx) up to 5MB</p>
                  </>
                )}
              </div>
            </>
          )}

          {/* Uploaded file card */}
          <AnimatePresence>
            {profile.resume_url && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-xl"
              >
                <div className="p-2.5 bg-white dark:bg-gray-900 rounded-xl mr-4 shadow-sm">
                  <FileText className="h-6 w-6 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {profile.resume_name || 'resume.pdf'}
                  </h4>
                  <div className="flex items-center mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">Stored in Supabase Storage</p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <a
                    href={profile.resume_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    View
                  </a>
                  <button
                    onClick={handleDeleteResume}
                    disabled={deletingResume}
                    className="text-xs font-semibold px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center disabled:opacity-50"
                  >
                    {deletingResume ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replace button if file exists */}
          {profile.resume_url && (
            <>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingResume}
                className="w-full py-2.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-500 hover:text-primary-600 hover:border-primary-400 transition-colors font-medium disabled:opacity-50"
              >
                Replace with a new file
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiPlus, FiBookmark, FiCode, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import JobCard from '../components/JobCard';
import AddJobModal from '../components/AddJobModal';
import { profileAPI, dsaAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import ConfirmDialog from '../components/ConfirmDialog';

// DSA progress at a glance. If it can't load, it simply isn't shown, so the
// dashboard never breaks because of it.
const DsaProgressCard = () => {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    dsaAPI.list()
      .then(({ data }) => {
        if (!cancelled) setCounts({ solved: data.problems.filter((p) => p.solved).length, total: data.problems.length });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!counts) return null;
  const percent = Math.round((counts.solved / counts.total) * 100);

  return (
    <Link to="/dsa" className="card p-4 sm:p-5 mb-8 flex items-center gap-4 hover:-translate-y-0.5 transition-smooth">
      <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
        <FiCode size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <p className="font-semibold text-zinc-900">DSA Practice</p>
          <p className="text-sm text-zinc-600 flex-shrink-0">
            <span className="font-bold text-orange-600">{counts.solved}</span> / {counts.total} solved
          </p>
        </div>
        <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <span className="hidden sm:flex items-center gap-1 text-sm font-semibold text-orange-700 flex-shrink-0">
        {counts.solved ? 'Continue' : 'Start'} <FiArrowRight size={14} />
      </span>
    </Link>
  );
};

const Dashboard = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadProfiles = useCallback(async () => {
    try {
      const response = await profileAPI.getAll();
      setProfiles(response.data);
    } catch (error) {
      console.error('Error loading profiles:', error);
      showToast('Unable to load job profiles', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleCreateProfile = async (profileData) => {
    setCreateLoading(true);
    try {
      const response = await profileAPI.create(profileData);
      setProfiles([response.data, ...profiles]);
      setShowAddModal(false);
      showToast('Job profile created successfully', 'success');
    } catch (error) {
      console.error('Error creating profile:', error);
      showToast('Failed to create profile. Please try again.', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteProfile = (id) => setPendingDeleteId(id);

  const confirmDeleteProfile = async () => {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await profileAPI.delete(id);
      setProfiles(profiles.filter(p => p._id !== id));
      showToast('Job profile deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting profile:', error);
      showToast('Failed to delete profile. Please try again.', 'error');
    }
  };

  const handleSelectProfile = (profile) => {
    navigate(`/interview/${profile._id}`, { state: { profile } });
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-2 font-display">
                Interview Dashboard
              </h1>
              <p className="text-zinc-600">
                Prepare for your dream job with AI-powered interview questions
              </p>
            </div>
            
            <div className="flex gap-2.5 mt-4 md:mt-0 flex-shrink-0">
              <button
                onClick={() => setShowPinned(!showPinned)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium bg-white text-zinc-700 rounded-lg hover:bg-orange-50 transition-smooth border border-stone-200 shadow-sm"
              >
                <FiBookmark size={15} />
                <span>Pinned</span>
              </button>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                <FiPlus size={16} />
                <span>Add New</span>
              </button>
            </div>
          </div>
        </motion.div>

        <DsaProgressCard />

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {/* Empty State */}
            {profiles.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-8 md:p-10 text-center"
              >
                <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiPlus size={40} className="text-orange-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3 font-display">
                  No Job Profiles Yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first job profile to start generating AI-powered interview questions
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary"
                >
                  Create Your First Profile
                </button>
              </motion.div>
            ) : (
              /* Job Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map((profile) => (
                  <JobCard
                    key={profile._id}
                    profile={profile}
                    onSelect={handleSelectProfile}
                    onDelete={handleDeleteProfile}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Job Modal */}
      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateProfile}
          loading={createLoading}
        />
      )}

      <ConfirmDialog
        open={!!pendingDeleteId}
        title="Delete this job profile?"
        message="Its saved questions will be removed too. This can't be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteProfile}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
};

export default Dashboard;

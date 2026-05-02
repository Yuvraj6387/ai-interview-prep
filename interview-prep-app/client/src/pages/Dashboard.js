import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiBookmark } from 'react-icons/fi';
import { motion } from 'framer-motion';
import JobCard from '../components/JobCard';
import AddJobModal from '../components/AddJobModal';
import QuestionsView from './QuestionsView';
import { profileAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';

const Dashboard = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showPinned, setShowPinned] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const { showToast } = useToast();

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

  const handleDeleteProfile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job profile?')) {
      return;
    }

    try {
      await profileAPI.delete(id);
      setProfiles(profiles.filter(p => p._id !== id));
      showToast('Job profile deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting profile:', error);
      showToast('Failed to delete profile. Please try again.', 'error');
    }
  };

  if (selectedProfile) {
    return (
      <QuestionsView
        profile={selectedProfile}
        onBack={() => setSelectedProfile(null)}
      />
    );
  }

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
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display">
                Interview Dashboard
              </h1>
              <p className="text-purple-100">
                Prepare for your dream job with AI-powered interview questions
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 w-full md:w-auto">
              <button
                onClick={() => setShowPinned(!showPinned)}
                className="flex items-center justify-center space-x-2 px-5 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-smooth border border-white/30 w-full sm:w-auto"
              >
                <FiBookmark />
                <span>Pinned</span>
              </button>
              
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:shadow-xl transition-smooth w-full sm:w-auto"
              >
                <FiPlus size={20} />
                <span>Add New</span>
              </button>
            </div>
          </div>
        </motion.div>

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
                className="bg-white rounded-2xl shadow-xl p-12 text-center"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiPlus size={40} className="text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3 font-display">
                  No Job Profiles Yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first job profile to start generating AI-powered interview questions
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:shadow-xl transition-smooth"
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
                    onSelect={setSelectedProfile}
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
    </div>
  );
};

export default Dashboard;

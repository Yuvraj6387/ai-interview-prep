import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFileText, FiMic, FiBarChart2, FiBookOpen, FiArrowRight } from 'react-icons/fi';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ToastProvider';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginModal from './components/LoginModal';
import Dashboard from './pages/Dashboard';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import QuestionsView from './pages/QuestionsView';
import MockInterview from './pages/MockInterview';
import InterviewResult from './pages/InterviewResult';
import Analytics from './pages/Analytics';

const InterviewRoute = () => {
  const { profileId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const profile = location.state?.profile;

  if (!profile || profile._id !== profileId) {
    return <Navigate to="/" replace />;
  }

  return <QuestionsView profile={profile} onBack={() => navigate('/')} />;
};

const FEATURES = [
  {
    icon: FiFileText,
    title: 'Resume Analyzer',
    description: 'Upload a PDF resume and get an instant score, detected skills, and gaps to fix',
    accent: 'bg-cyan-400/25',
  },
  {
    icon: FiMic,
    title: 'Adaptive Mock Interview',
    description: 'AI asks questions, evaluates your answers, and adapts follow-ups in real time',
    accent: 'bg-teal-400/25',
  },
  {
    icon: FiBarChart2,
    title: 'Analytics',
    description: 'Track your score trend across interviews and see exactly what to work on',
    accent: 'bg-emerald-400/25',
  },
  {
    icon: FiBookOpen,
    title: 'Learn & Practice',
    description: 'Deep dive into detailed explanations for every question you get asked',
    accent: 'bg-amber-400/25',
  },
];

const Landing = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div className="relative min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-16 overflow-hidden">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
        <div className="w-[36rem] h-[36rem] bg-white/10 rounded-full blur-3xl -translate-y-1/3" />
      </div>

      <div className="relative text-center max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl ring-4 ring-white/20">
            <span className="text-7xl">⚡</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 font-display leading-tight">
            Turn Your Resume Into an Interview Plan
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl mx-auto">
            Upload your resume, let AI score it and spot the gaps, then generate interview questions matched to exactly what's on it
          </p>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowLoginModal(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-cyan-700 font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl transition-shadow"
          >
            <span>Get Started Free</span>
            <FiArrowRight />
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {FEATURES.map(({ icon: Icon, title, description, accent }) => (
            <motion.div
              key={title}
              whileHover={{ y: -6 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-left transition-colors hover:bg-white/15"
            >
              <div className={`w-12 h-12 ${accent} rounded-xl flex items-center justify-center mb-4`}>
                <Icon className="text-white" size={22} />
              </div>
              <h3 className="text-white font-bold mb-2 font-display">{title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
};

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <Landing />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/resume" element={<ResumeAnalyzer />} />
          <Route path="/mock-interview" element={<MockInterview />} />
          <Route path="/interview-result/:interviewId" element={<InterviewResult />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/interview/:profileId" element={<InterviewRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

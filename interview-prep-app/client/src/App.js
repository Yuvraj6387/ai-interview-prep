import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiFileText, FiMic, FiBarChart2, FiBookOpen, FiArrowRight,
  FiCheckCircle, FiZap
} from 'react-icons/fi';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ToastProvider';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginModal from './components/LoginModal';
import GoogleSignInButton from './components/GoogleSignInButton';
import { useToast } from './components/ToastProvider';
import Dashboard from './pages/Dashboard';

// Split out of the main bundle: these pages pull in the heavy chart and
// syntax-highlighting libraries, which the dashboard had to download and parse
// before it could paint even though nothing on it uses them.
const ResumeAnalyzer = lazy(() => import('./pages/ResumeAnalyzer'));
const QuestionsView = lazy(() => import('./pages/QuestionsView'));
const MockInterview = lazy(() => import('./pages/MockInterview'));
const InterviewResult = lazy(() => import('./pages/InterviewResult'));
const Analytics = lazy(() => import('./pages/Analytics'));
const JobMatcher = lazy(() => import('./pages/JobMatcher'));

const RouteFallback = () => (
  <div className="flex justify-center items-center py-20">
    <div className="spinner"></div>
  </div>
);

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

const CHECKLIST = [
  'Resume-aware interview questions, not generic ones',
  'Instant AI scoring across 6 skill dimensions',
  '100% free, no credit card required',
];

const ResumePreviewCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 20, rotate: -3 }}
    animate={{ opacity: 1, y: 0, rotate: -3 }}
    transition={{ duration: 0.6, delay: 0.3 }}
    className="absolute -top-6 -left-4 w-52 bg-white rounded-xl shadow-2xl p-4 hidden sm:block"
  >
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white flex-shrink-0">
        <FiZap size={13} />
      </div>
      <p className="text-xs font-semibold text-gray-700">Resume Score</p>
    </div>
    <p className="text-3xl font-bold text-gray-800 font-display mb-3">84%</p>
    <div className="flex flex-wrap gap-1.5">
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">React ✓</span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">Node.js ✓</span>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700">Docker ⚠</span>
    </div>
  </motion.div>
);

const InterviewPreviewCard = () => (
  <motion.div
    initial={{ opacity: 0, y: 20, rotate: 3 }}
    animate={{ opacity: 1, y: 0, rotate: 3 }}
    transition={{ duration: 0.6, delay: 0.45 }}
    className="relative w-72 bg-white rounded-xl shadow-2xl p-4 ml-auto"
  >
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white flex-shrink-0">
        <FiMic size={13} />
      </div>
      <p className="text-xs font-semibold text-gray-700">Mock Interview</p>
      <span className="ml-auto text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Follow-up</span>
    </div>
    <p className="text-sm text-gray-800 leading-snug mb-3">
      "You mentioned Gemini API — how did you handle rate limits?"
    </p>
    <div className="h-8 rounded-lg bg-gray-100 flex items-center px-3">
      <span className="text-xs text-gray-400">Type your answer...</span>
    </div>
  </motion.div>
);

const Landing = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { googleLogin } = useAuth();
  const { showToast } = useToast();

  const handleGoogleCredential = async (credential) => {
    try {
      await googleLogin(credential);
      showToast('Logged in with Google', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Google sign-in failed. Please try again.', 'error');
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-0 w-[24rem] h-[24rem] bg-slate-500/20 rounded-full blur-3xl" />
      </div>

      {/* Hero */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-cyan-300 text-xs font-semibold mb-6">
            <FiZap size={12} />
            AI-Powered Interview Prep
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 font-display leading-tight">
            Turn Your Resume Into an Interview Plan
          </h1>
          <p className="text-lg text-slate-300 mb-7 max-w-lg">
            Upload your resume, let AI score it and spot the gaps, then generate interview questions matched to exactly what's on it.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-8">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLoginModal(true)}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl shadow-xl hover:shadow-2xl transition-smooth"
            >
              <span>Get Started Free</span>
              <FiArrowRight />
            </motion.button>
            {/* Google keeps one sign-in callback per page, so hand it to the modal while that is open */}
            {!showLoginModal && (
              <GoogleSignInButton
                width={250}
                onCredential={handleGoogleCredential}
                onError={(message) => showToast(message, 'error')}
              />
            )}
          </div>

          <div className="space-y-2.5">
            {CHECKLIST.map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                <FiCheckCircle className="text-cyan-400 flex-shrink-0" size={16} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="relative hidden lg:block h-72">
          <ResumePreviewCard />
          <InterviewPreviewCard />
        </div>
      </div>

      {/* Features */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h2 className="text-xl font-bold text-white mb-6 font-display text-center">
            Everything you need to walk in prepared
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
          </div>
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
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  // One menu button serves both layouts: it reopens the hidden desktop sidebar,
  // or slides in the drawer on mobile.
  const openSidebar = () => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      setDesktopSidebarOpen(true);
    } else {
      setSidebarOpen(true);
    }
  };

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
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        desktopOpen={desktopSidebarOpen}
        onDesktopClose={() => setDesktopSidebarOpen(false)}
      />
      <div className="flex-1 min-w-0">
        <Navbar onMenuClick={openSidebar} showOnDesktop={!desktopSidebarOpen} />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/resume" element={<ResumeAnalyzer />} />
            <Route path="/job-match" element={<JobMatcher />} />
            <Route path="/mock-interview" element={<MockInterview />} />
            <Route path="/interview-result/:interviewId" element={<InterviewResult />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/interview/:profileId" element={<InterviewRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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

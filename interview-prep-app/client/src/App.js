import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ToastProvider';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';

// Split out of the main bundle: these pages pull in the heavy chart and
// syntax-highlighting libraries, which the dashboard had to download and parse
// before it could paint even though nothing on it uses them.
const ResumeAnalyzer = lazy(() => import('./pages/ResumeAnalyzer'));
const QuestionsView = lazy(() => import('./pages/QuestionsView'));
const MockInterview = lazy(() => import('./pages/MockInterview'));
const InterviewResult = lazy(() => import('./pages/InterviewResult'));
const Analytics = lazy(() => import('./pages/Analytics'));
const JobMatcher = lazy(() => import('./pages/JobMatcher'));
const ResumeBuilder = lazy(() => import('./pages/ResumeBuilder'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Notes = lazy(() => import('./pages/Notes'));
const NoteView = lazy(() => import('./pages/NoteView'));
const NoteEditor = lazy(() => import('./pages/NoteEditor'));
const DsaPractice = lazy(() => import('./pages/DsaPractice'));
const DsaProblem = lazy(() => import('./pages/DsaProblem'));

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

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  // Mobile drawer only. On desktop the sidebar is always there and minimizes
  // to an icon rail with its own button.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  // Logged-out visitors get the landing page, plus read-only access to the
  // public notes and the DSA problems, so shared links work without an account.
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/:id" element={<NoteView />} />
            <Route path="/dsa" element={<DsaPractice />} />
            <Route path="/dsa/:id" element={<DsaProblem />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/resume" element={<ResumeAnalyzer />} />
            <Route path="/job-match" element={<JobMatcher />} />
            <Route path="/resume-builder" element={<ResumeBuilder />} />
            <Route path="/resume-builder/:id" element={<ResumeBuilder />} />
            <Route path="/mock-interview" element={<MockInterview />} />
            <Route path="/interview-result/:interviewId" element={<InterviewResult />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/new" element={<NoteEditor />} />
            <Route path="/notes/:id" element={<NoteView />} />
            <Route path="/notes/:id/edit" element={<NoteEditor />} />
            <Route path="/dsa" element={<DsaPractice />} />
            <Route path="/dsa/:id" element={<DsaProblem />} />
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

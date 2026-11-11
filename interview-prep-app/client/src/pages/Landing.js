import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight, FiCheckCircle, FiZap, FiFileText, FiMic, FiMap, FiTarget, FiBookOpen,
  FiBarChart2, FiEdit, FiShield, FiEdit3, FiChevronDown, FiUpload, FiTrendingUp, FiCode
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import LoginModal from '../components/LoginModal';
import GoogleSignInButton from '../components/GoogleSignInButton';

// Screens from the real app (demo account), kept in public/landing.
const shot = (name) => `${process.env.PUBLIC_URL}/landing/${name}.jpg`;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5 },
};

const PROBLEMS = [
  { icon: FiFileText, pain: 'My resume never gets a reply', fix: 'Resume Analyzer + ATS Scan' },
  { icon: FiMic, pain: 'I go blank in technical rounds', fix: 'AI Mock Interview' },
  { icon: FiMap, pain: "I don't know what to study first", fix: 'Learning Roadmap' },
  { icon: FiTarget, pain: 'Am I even a fit for this job?', fix: 'Job Matcher' },
  { icon: FiCode, pain: 'I freeze on coding questions', fix: 'DSA Practice' },
];

const SHOWCASE = [
  {
    image: 'resume',
    eyebrow: 'Resume Analyzer',
    title: 'Know your resume score before a recruiter does',
    text: 'Upload a PDF and get a score, the skills found, the skills missing for your role, and clear fixes.',
    points: ['ATS scan for format and content', 'Bullet Rewriter in 3 styles', 'Suggested role from your skills'],
  },
  {
    image: 'interview',
    eyebrow: 'Mock Interview',
    title: 'An AI interviewer that asks what real companies ask',
    text: 'Technical concept questions on your skills, one question on your projects, and follow-ups when an answer is weak.',
    points: ['Technical, Coding, HR and Behavioral rounds', 'Answer by typing or by voice', 'Easy, Medium and Hard levels'],
  },
  {
    image: 'result',
    eyebrow: 'Interview Report',
    title: 'See exactly what to improve',
    text: 'Every answer is scored on 6 skills, from technical accuracy to communication, with strengths and next steps.',
    points: ['Overall score and skill breakdown', 'Practice recommendations', 'Score trend in Analytics'],
  },
  {
    image: 'roadmap',
    eyebrow: 'Learning Roadmap',
    title: 'A day-by-day plan, from basics to interview-ready',
    text: 'Tell it your goal and how many days you have. You get daily subtopics, study tasks and practice questions.',
    points: ['3 to 30 day plans', 'Easy, Medium and Strong phases', 'Tick off tasks and track progress'],
  },
  {
    image: 'notes',
    eyebrow: 'Important Notes',
    title: 'Learn from notes the community writes',
    text: 'Read question-and-answer notes like "30 Important React Questions", or write your own and share the link.',
    points: ['Search by topic or tag', 'Answers hidden until you check', 'Public or private notes'],
    notesLink: true,
  },
  {
    image: 'dsa',
    eyebrow: 'DSA Practice',
    title: '120 most asked coding questions, checked as you code',
    text: 'Every important topic, from arrays to dynamic programming. Write your solution in JavaScript or Java and run it against real test cases.',
    points: ['15 topics, up to 10 questions each', 'Run and Submit with hidden test cases', 'Open any question on LeetCode in one tap'],
    dsaLink: true,
  },
];

const TOOLS = [
  { icon: FiFileText, title: 'Resume Analyzer', text: 'Score, skills and gaps' },
  { icon: FiShield, title: 'ATS Scan', text: 'Pass the resume filters' },
  { icon: FiEdit, title: 'Resume Builder', text: 'Templates and PDF download' },
  { icon: FiTarget, title: 'Job Matcher', text: 'Match a resume to a job' },
  { icon: FiMic, title: 'Mock Interview', text: 'Adaptive, with voice' },
  { icon: FiBarChart2, title: 'Analytics', text: 'Progress over time' },
  { icon: FiMap, title: 'Learning Roadmap', text: 'Daily study plan' },
  { icon: FiBookOpen, title: 'Important Notes', text: 'Community Q&A notes' },
  { icon: FiCode, title: 'DSA Practice', text: '120 coding questions' },
];

const STEPS = [
  { icon: FiUpload, title: 'Upload your resume', text: 'Or skip it and pick a role.' },
  { icon: FiMic, title: 'Practise with AI', text: 'Real questions, instant scores.' },
  { icon: FiTrendingUp, title: 'Improve every day', text: 'Follow your plan, watch the trend.' },
];

const FAQS = [
  { q: 'Is it really free?', a: 'Yes. Every feature is free to use and no credit card is needed.' },
  { q: 'Do I need to upload a resume?', a: 'No. You can practise for any role without one. With a resume, the interview asks about your own skills and projects.' },
  { q: 'What kind of questions does the mock interview ask?', a: 'Technical rounds ask concept questions like "What is the difference between useMemo and useCallback?" plus one question about your projects. Coding rounds give short problems, and HR and Behavioral rounds ask what those rounds really ask.' },
  { q: 'Can I answer by speaking?', a: 'Yes, in Chrome and Edge the interviewer reads questions aloud and you can answer by voice. In other browsers you type your answers.' },
  { q: 'Which languages can I use for DSA practice?', a: 'JavaScript and Java. Your code runs against the test cases of each question, and every question also links to the same one on LeetCode.' },
  { q: 'Who can see my notes?', a: 'Public notes appear in Explore for everyone and can be shared by link. Private notes are only visible to you.' },
];

const Phone = ({ name, alt, className = '' }) => (
  <div className={`rounded-[2.25rem] bg-slate-950 p-2 shadow-2xl shadow-orange-900/20 ring-1 ring-black/10 ${className}`}>
    <img
      src={shot(name)}
      alt={alt}
      loading="lazy"
      width="780"
      height="1592"
      className="block w-full h-auto rounded-[1.75rem]"
    />
  </div>
);

const SectionTitle = ({ eyebrow, title, text }) => (
  <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
    {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-3">{eyebrow}</p>}
    <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 font-display leading-tight">{title}</h2>
    {text && <p className="text-zinc-600 mt-4">{text}</p>}
  </motion.div>
);

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white border border-stone-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-semibold text-zinc-900">{q}</span>
        <FiChevronDown className={`text-orange-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="px-5 pb-5 -mt-1 text-sm text-zinc-600 leading-relaxed">{a}</p>}
    </div>
  );
};

const Landing = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { googleLogin } = useAuth();
  const { showToast } = useToast();
  const openLogin = () => setShowLoginModal(true);

  const handleGoogleCredential = async (credential) => {
    try {
      await googleLogin(credential);
      showToast('Logged in with Google', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Google sign-in failed. Please try again.', 'error');
    }
  };

  const ctaButton = (label = 'Get Started Free') => (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={openLogin}
      className="inline-flex items-center gap-2 px-7 py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-xl shadow-orange-500/20 transition-smooth"
    >
      <span>{label}</span>
      <FiArrowRight />
    </motion.button>
  );

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 w-[30rem] h-[30rem] bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-0 w-[24rem] h-[24rem] bg-amber-300/20 rounded-full blur-3xl" />
      </div>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 md:pt-20 md:pb-24 grid lg:grid-cols-2 gap-14 items-center">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-orange-700 text-xs font-semibold mb-6">
            <FiZap size={12} /> AI-Powered Interview Prep
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-zinc-900 font-display leading-[1.1] mb-6">
            Resume? <span className="text-orange-400">Scored.</span><br />
            Questions? <span className="text-orange-400">Ready.</span><br />
            Interview? <span className="text-orange-400">Cracked.</span>
          </h1>
          <p className="text-lg text-zinc-600 mb-8 max-w-lg">
            Get your resume scored, practise with an AI interviewer that asks real technical questions, and follow a daily plan until you are ready.
          </p>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {ctaButton()}
            {/* Google keeps one sign-in callback per page, so hand it to the modal while that is open */}
            {!showLoginModal && (
              <GoogleSignInButton
                width={250}
                onCredential={handleGoogleCredential}
                onError={(message) => showToast(message, 'error')}
              />
            )}
          </div>
          <div className="flex flex-col items-start gap-2.5 mb-7">
            <Link to="/dsa" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-600">
              <FiCode size={15} /> Practise 120 DSA questions, no sign-up <FiArrowRight size={14} />
            </Link>
            <Link to="/notes" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-600">
              <FiBookOpen size={15} /> Browse interview notes from the community <FiArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {['Questions on your own skills, not generic ones', 'Instant AI scoring across 6 skills', '100% free, no credit card needed'].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-zinc-600">
                <FiCheckCircle className="text-orange-400 flex-shrink-0" size={16} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex justify-center lg:justify-end"
        >
          <Phone name="interview" alt="AI mock interview on a phone" className="w-60 sm:w-64 relative z-10" />
          <Phone name="result" alt="Interview score report" className="hidden sm:block w-56 absolute top-12 right-[52%] lg:right-64 -rotate-6 opacity-90" />
        </motion.div>
      </section>

      {/* Problems */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
        <SectionTitle eyebrow="Sound familiar?" title="Get prepped, get noticed, get hired" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {PROBLEMS.map(({ icon: Icon, pain, fix }, i) => (
            <motion.div
              key={pain}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl p-6 bg-white border border-stone-200 hover:bg-orange-50 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                <Icon size={20} />
              </div>
              <p className="text-zinc-900 font-semibold mb-3">"{pain}"</p>
              <p className="text-sm text-orange-700 flex items-center gap-1.5">
                <FiArrowRight size={14} className="flex-shrink-0" /> {fix}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature showcase */}
      <section id="features" className="relative border-y border-stone-200 bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle eyebrow="Features" title="Everything you need to walk in prepared" text="Real screens from the app, not mock-ups." />
          <div className="space-y-20 md:space-y-28">
            {SHOWCASE.map((item, i) => (
              <div key={item.eyebrow} className={`flex flex-col gap-10 md:gap-16 items-center ${i % 2 ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
                <motion.div {...fadeUp} className="flex-1 max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-3">{item.eyebrow}</p>
                  <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 font-display leading-snug mb-4">{item.title}</h3>
                  <p className="text-zinc-600 mb-6">{item.text}</p>
                  <ul className="space-y-2.5 mb-7">
                    {item.points.map((point) => (
                      <li key={point} className="flex items-center gap-2.5 text-sm text-zinc-700">
                        <FiCheckCircle className="text-orange-400 flex-shrink-0" size={16} /> {point}
                      </li>
                    ))}
                  </ul>
                  {item.dsaLink ? (
                    <Link to="/dsa" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-600">
                      Browse the questions, no sign-up <FiArrowRight size={14} />
                    </Link>
                  ) : item.notesLink ? (
                    <Link to="/notes" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-600">
                      Read notes now, no sign-up <FiArrowRight size={14} />
                    </Link>
                  ) : (
                    <button type="button" onClick={openLogin} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-600">
                      Try it free <FiArrowRight size={14} />
                    </button>
                  )}
                </motion.div>
                <motion.div {...fadeUp} className="flex-shrink-0">
                  <Phone name={item.image} alt={`${item.eyebrow} screen`} className="w-60 sm:w-64" />
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All tools */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <SectionTitle eyebrow="All tools" title="9 tools, one free app" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map(({ icon: Icon, title, text }) => (
            <motion.button
              key={title}
              type="button"
              onClick={openLogin}
              whileHover={{ y: -4 }}
              className="text-left rounded-2xl p-5 bg-white border border-stone-200 hover:border-orange-300 transition-colors"
            >
              <Icon className="text-orange-700 mb-3" size={22} />
              <p className="text-zinc-900 font-semibold text-sm sm:text-base">{title}</p>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">{text}</p>
            </motion.button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
        <SectionTitle eyebrow="How it works" title="Ready in three steps" />
        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <motion.div key={title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }} className="flex items-start gap-4 rounded-2xl p-6 bg-white border border-stone-200">
              <span className="w-10 h-10 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <div>
                <p className="text-zinc-900 font-semibold flex items-center gap-2"><Icon size={16} className="text-orange-700" /> {title}</p>
                <p className="text-sm text-zinc-500 mt-1">{text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
        <SectionTitle eyebrow="FAQ" title="Frequently asked questions" />
        <div className="space-y-3">
          {FAQS.map((item) => <FaqItem key={item.q} {...item} />)}
        </div>
      </section>

      {/* Final call to action */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
        <motion.div {...fadeUp} className="rounded-3xl p-8 md:p-14 text-center bg-gradient-to-br from-orange-500/20 to-amber-600/10 border border-orange-400/30">
          <FiEdit3 className="mx-auto text-orange-700 mb-4" size={30} />
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 font-display mb-3">Your next interview starts here</h2>
          <p className="text-zinc-600 mb-8">Free, no credit card, and ready in under a minute.</p>
          {ctaButton('Start Preparing Free')}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row gap-8 md:items-start md:justify-between">
          <div className="max-w-xs">
            <p className="text-lg font-bold text-zinc-900 font-display">⚡ InterviewPreparation<span className="text-orange-400">.AI</span></p>
            <p className="text-sm text-zinc-500 mt-2">Your AI interview coach for resumes, mock interviews and daily practice.</p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-3 text-sm">
            <a href="#features" className="text-zinc-600 hover:text-zinc-900">Features</a>
            <a href="#faq" className="text-zinc-600 hover:text-zinc-900">FAQ</a>
            <Link to="/notes" className="text-zinc-600 hover:text-zinc-900">Community Notes</Link>
            <button type="button" onClick={openLogin} className="text-zinc-600 hover:text-zinc-900">Login / Sign Up</button>
          </div>
        </div>
        <div className="border-t border-stone-200">
          <p className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-xs text-slate-500">
            © {new Date().getFullYear()} InterviewPreparation.AI · Built with React, Node.js, MongoDB and AI
          </p>
        </div>
      </footer>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  );
};

export default Landing;

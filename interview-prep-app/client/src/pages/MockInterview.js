import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBriefcase, FiAward, FiLayers, FiTrendingUp, FiHash, FiLoader,
  FiClock, FiSkipForward, FiXCircle, FiSend, FiMessageCircle, FiZap, FiUser,
  FiCheckCircle, FiFileText, FiArrowRight, FiPlay, FiMic, FiSquare, FiVolume2, FiVolumeX,
  FiPause, FiEdit3, FiCheck, FiTarget
} from 'react-icons/fi';
import { interviewAPI, resumeAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import InterviewIllustration from '../components/InterviewIllustration';
import useSpeech from '../hooks/useSpeech';
import ConfirmDialog from '../components/ConfirmDialog';

const INTERVIEW_TYPES = ['Technical', 'HR', 'Behavioral', 'Full Stack', 'Coding'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const QUESTION_COUNTS = [3, 5, 7, 10];

const formatElapsed = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const PANEL = 'bg-white rounded-2xl shadow-lg border border-gray-100';

const PanelTitle = ({ icon: Icon, children }) => (
  <p className="flex items-center gap-2.5 text-sm font-bold text-gray-800 font-display">
    <span className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
      <Icon size={16} />
    </span>
    {children}
  </p>
);

const STEP_STYLES = {
  answered: 'bg-emerald-500 border-emerald-500 text-white',
  skipped: 'bg-amber-50 border-amber-400 text-amber-700',
  current: 'bg-cyan-600 border-cyan-600 text-white ring-4 ring-cyan-100',
  upcoming: 'bg-gray-50 border-gray-200 text-gray-400',
};

const MockInterview = () => {
  const location = useLocation();
  // Set when arriving from the Job Matcher: the interview then targets that job.
  const [jobContext, setJobContext] = useState(location.state?.jobContext || null);
  const [config, setConfig] = useState({
    role: location.state?.jobContext?.title || '',
    experienceLevel: '',
    interviewType: 'Technical',
    difficulty: 'Medium',
    numQuestions: 5,
  });
  const [starting, setStarting] = useState(false);
  const [interview, setInterview] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [submitAction, setSubmitAction] = useState(null); // null | 'answer' | 'skip'
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [resume, setResume] = useState(null);
  const [readAloud, setReadAloud] = useState(true);
  const [timerPaused, setTimerPaused] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const bottomRef = useRef(null);
  const voice = useSpeech({
    onTranscript: setAnswerText,
    onError: (message) => showToast(message, 'error'),
  });
  const { speak, stopSpeaking, stopListening, unlockSpeech } = voice;

  const currentTurn = interview?.turns?.[interview.turns.length - 1];
  const pastTurns = interview?.turns?.slice(0, -1) || [];
  const currentQuestion = currentTurn?.questionText;

  // Read each new question aloud, like an interviewer asking it.
  useEffect(() => {
    if (readAloud && currentQuestion) speak(currentQuestion);
  }, [readAloud, currentQuestion, speak]);

  const toggleReadAloud = () => {
    if (readAloud) {
      stopSpeaking();
    } else {
      unlockSpeech();
    }
    setReadAloud(!readAloud);
  };

  const toggleListening = () => {
    if (voice.listening) {
      stopListening();
    } else {
      voice.startListening(answerText);
    }
  };

  useEffect(() => {
    resumeAPI.getMine()
      .then((response) => {
        setResume(response.data.analysis);
        setConfig((prev) => (prev.role ? prev : { ...prev, role: response.data.analysis.suggestedRole || '' }));
      })
      .catch(() => setResume(null));
  }, []);

  // Counts the whole interview (not each question); the side panel can pause it.
  const interviewId = interview?._id;
  useEffect(() => {
    if (!interviewId || timerPaused) return undefined;

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [interviewId, timerPaused]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [interview?.turns?.length]);

  const handleConfigChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleStart = async (e) => {
    e.preventDefault();
    // Phones only allow speech that starts from a tap; unlock it now so the
    // first question can be read aloud once it arrives.
    if (readAloud) unlockSpeech();
    setStarting(true);
    try {
      const response = await interviewAPI.start({
        ...config,
        jobContext,
        experienceLevel: parseInt(config.experienceLevel, 10),
        numQuestions: parseInt(config.numQuestions, 10),
      });
      setElapsed(0);
      setTimerPaused(false);
      setNotes('');
      setInterview(response.data);
    } catch (error) {
      console.error('Error starting interview:', error);
      const message = error.response?.data?.message || 'Failed to start interview. Please try again.';
      showToast(message, 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitAnswer = async (skip = false) => {
    if (!skip && !answerText.trim()) {
      showToast('Please enter an answer, or use Skip Question', 'error');
      return;
    }

    stopListening();
    stopSpeaking();
    if (readAloud) unlockSpeech();
    setSubmitAction(skip ? 'skip' : 'answer');
    try {
      const response = await interviewAPI.submitAnswer(
        interview._id,
        skip ? { skip: true } : { answerText }
      );

      if (response.data.completed) {
        showToast('Interview complete!', 'success');
        navigate(`/interview-result/${interview._id}`);
        return;
      }

      setInterview(response.data.interview);
      setAnswerText('');
    } catch (error) {
      console.error('Error submitting answer:', error);
      const message = error.response?.data?.message || 'Failed to submit answer. Please try again.';
      showToast(message, 'error');
    } finally {
      setSubmitAction(null);
    }
  };

  const handleEndInterview = () => setConfirmEnd(true);

  const confirmEndInterview = async () => {
    setConfirmEnd(false);
    stopListening();
    stopSpeaking();
    setEnding(true);
    try {
      await interviewAPI.end(interview._id);
      navigate(`/interview-result/${interview._id}`);
    } catch (error) {
      console.error('Error ending interview:', error);
      showToast('Failed to end interview. Please try again.', 'error');
    } finally {
      setEnding(false);
    }
  };

  if (!interview) {
    return (
      <div className="relative overflow-hidden min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <InterviewIllustration className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 w-[75rem] max-w-none text-cyan-300 opacity-[0.15]" />
        <div className="relative max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display">
              Mock Interview
            </h1>
            <p className="text-slate-300">
              AI asks, evaluates, and adapts its next question based on how you answer
            </p>
          </motion.div>

          {jobContext && (
            <div className="flex items-center gap-2 text-sm text-cyan-300 bg-cyan-500/10 border border-cyan-400/30 rounded-lg px-4 py-2.5 mb-4">
              <FiTarget size={16} className="flex-shrink-0" />
              <span>Interview for the job you matched{jobContext.title ? `: ${jobContext.title}` : ''} — questions will focus on what it requires.</span>
              <button
                type="button"
                onClick={() => setJobContext(null)}
                className="ml-auto text-xs font-semibold text-slate-300 hover:text-white underline flex-shrink-0"
              >
                Remove
              </button>
            </div>
          )}

          {resume ? (
            <div className="flex items-center gap-2 text-sm text-cyan-300 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 mb-4">
              <FiCheckCircle size={16} className="flex-shrink-0" />
              <span>Personalized using your resume — questions will be grounded in your actual skills and projects.</span>
            </div>
          ) : (
            <Link
              to="/resume"
              className="flex items-center gap-2 text-sm text-slate-200 bg-white/10 border border-white/20 hover:bg-white/15 rounded-lg px-4 py-2.5 mb-4 transition-smooth"
            >
              <FiFileText size={16} className="flex-shrink-0" />
              <span>Upload your resume for a personalized interview instead of generic questions</span>
              <FiArrowRight size={14} className="ml-auto flex-shrink-0" />
            </Link>
          )}

          <motion.form
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleStart}
            className="bg-white rounded-xl shadow-xl p-5 md:p-6 space-y-4"
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Role *</label>
                <div className="relative">
                  <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    name="role"
                    value={config.role}
                    onChange={handleConfigChange}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth"
                    placeholder="e.g., Full Stack Developer"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Years *</label>
                <div className="relative">
                  <FiAward className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="number"
                    name="experienceLevel"
                    value={config.experienceLevel}
                    onChange={handleConfigChange}
                    min="0"
                    max="50"
                    className="w-full pl-9 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth"
                    placeholder="2"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                <div className="relative">
                  <FiLayers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    name="interviewType"
                    value={config.interviewType}
                    onChange={handleConfigChange}
                    className="w-full pl-9 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth appearance-none bg-white"
                  >
                    {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Difficulty</label>
                <div className="relative">
                  <FiTrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    name="difficulty"
                    value={config.difficulty}
                    onChange={handleConfigChange}
                    className="w-full pl-9 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth appearance-none bg-white"
                  >
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Questions</label>
                <div className="relative">
                  <FiHash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <select
                    name="numQuestions"
                    value={config.numQuestions}
                    onChange={handleConfigChange}
                    className="w-full pl-9 pr-2 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth appearance-none bg-white"
                  >
                    {QUESTION_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={starting}
              whileHover={starting ? undefined : { y: -2 }}
              whileTap={starting ? undefined : { scale: 0.98 }}
              className="group w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-3 text-base rounded-xl shadow-lg shadow-cyan-600/30 hover:shadow-xl hover:shadow-cyan-500/40 transition-smooth disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {starting ? (
                <>
                  <FiLoader className="animate-spin" size={18} />
                  <span>Starting Interview...</span>
                </>
              ) : (
                <>
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <FiPlay size={14} className="ml-0.5" />
                  </span>
                  <span>Start Interview</span>
                  <FiArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </motion.button>
          </motion.form>
        </div>
      </div>
    );
  }

  const { numQuestions } = interview.config;
  const progress = Math.round(((interview.turns.length - 1) / numQuestions) * 100);
  const busy = !!submitAction || ending;

  const stepStatus = (i) => {
    if (i === interview.turns.length - 1) return 'current';
    const turn = interview.turns[i];
    if (!turn) return 'upcoming';
    return turn.skipped ? 'skipped' : 'answered';
  };

  // Shared by the side panel (wide screens) and the inline layout on phones/tablets.
  const timerPanel = (
    <div className={`${PANEL} p-4 sm:p-5`}>
      <PanelTitle icon={FiClock}>Interview Timer</PanelTitle>
      <div className="flex items-center justify-between mt-3">
        <span className={`text-4xl font-bold font-display tabular-nums ${timerPaused ? 'text-gray-400' : 'text-gray-800'}`}>
          {formatElapsed(elapsed)}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTimerPaused(!timerPaused)}
            title={timerPaused ? 'Resume timer' : 'Pause timer'}
            aria-label={timerPaused ? 'Resume timer' : 'Pause timer'}
            className="w-10 h-10 rounded-xl border-2 border-gray-200 text-gray-600 hover:border-cyan-500 hover:text-cyan-600 flex items-center justify-center transition-smooth"
          >
            {timerPaused ? <FiPlay size={16} /> : <FiPause size={16} />}
          </button>
          <button
            type="button"
            onClick={handleEndInterview}
            disabled={busy}
            title="End interview"
            aria-label="End interview"
            className="w-10 h-10 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center transition-smooth disabled:opacity-50"
          >
            <FiSquare size={14} fill="currentColor" />
          </button>
        </div>
      </div>
      {timerPaused && <p className="text-[11px] text-gray-400 mt-1">Timer paused</p>}
    </div>
  );

  const notesPanel = (
    <div className={`${PANEL} p-4 sm:p-5`}>
      <PanelTitle icon={FiEdit3}>Quick Notes</PanelTitle>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows="5"
        className="w-full mt-3 px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:bg-white resize-none transition-smooth"
        placeholder="Jot down key points, approach, or keywords..."
      />
      <p className="text-[11px] text-gray-400 mt-1.5">Just for you during this interview — not saved.</p>
    </div>
  );

  const AIBubble = ({ turn }) => (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
        <FiZap size={15} />
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm shadow-md px-4 py-3 max-w-[85%]">
        {turn?.isFollowUp && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 mb-2">
            <FiMessageCircle size={11} />
            Follow-up
          </span>
        )}
        <p className="text-gray-800 text-sm leading-relaxed">{turn?.questionText}</p>
      </div>
      {voice.speechSupported && (
        <button
          type="button"
          onClick={() => speak(turn?.questionText)}
          title="Hear this question"
          aria-label="Hear this question"
          className="mt-1 p-2 rounded-full text-slate-300 hover:text-cyan-300 hover:bg-white/10 transition-smooth flex-shrink-0"
        >
          <FiVolume2 size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid xl:grid-cols-[minmax(0,1fr)_18rem] gap-6 items-start">
        <div className="min-w-0">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center text-sm text-slate-300 mb-2">
              <span>Question {interview.turns.length} of {numQuestions}</span>
              <div className="flex items-center gap-3">
                {voice.speechSupported && (
                  <button
                    type="button"
                    onClick={toggleReadAloud}
                    title={readAloud ? 'Stop reading questions aloud' : 'Read questions aloud'}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-smooth ${
                      readAloud
                        ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                        : 'border-white/20 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {readAloud ? <FiVolume2 size={13} /> : <FiVolumeX size={13} />}
                    <span>{readAloud ? (voice.speaking ? 'Speaking...' : 'Voice on') : 'Voice off'}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Phones/tablets: timer above the chat, since there is no side panel */}
          <div className="xl:hidden mb-4">{timerPanel}</div>

          {/* Chat thread */}
          <div className="space-y-4 mb-4">
            <AnimatePresence initial={false}>
              {pastTurns.map((turn, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <AIBubble turn={turn} />
                  <div className="flex items-start gap-3 justify-end">
                    <div
                      className={`rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm ${
                        turn.skipped
                          ? 'bg-gray-200 text-gray-500 italic'
                          : 'bg-cyan-600 text-white'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">
                        {turn.skipped ? 'Skipped this question' : turn.answerText}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
                      <FiUser size={15} />
                    </div>
                  </div>
                </motion.div>
              ))}

              <motion.div
                key={`current-${interview.turns.length}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AIBubble turn={currentTurn} />
              </motion.div>
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="sm:ml-11 sm:mr-11 bg-white rounded-2xl shadow-md p-3 md:p-4">
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows="2"
              className={`w-full px-4 py-2.5 text-sm border-2 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-smooth resize-none ${
                voice.listening ? 'border-red-300 bg-red-50/40' : 'border-gray-300'
              }`}
              placeholder={voice.listening ? 'Listening... speak your answer' : 'Type your answer, or tap Speak to answer by voice...'}
              readOnly={voice.listening}
              disabled={busy}
            />

            {voice.listening && (
              <p className="flex items-center gap-2 text-xs text-red-600 mt-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Listening — tap Stop when you finish, then edit if needed and submit.
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {voice.recognitionSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={busy}
                  className={`flex-1 whitespace-nowrap flex items-center justify-center space-x-1.5 px-4 py-2 font-semibold text-sm rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed ${
                    voice.listening
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
                      : 'border-2 border-cyan-600 text-cyan-700 hover:bg-cyan-50'
                  }`}
                >
                  {voice.listening ? <FiSquare size={14} /> : <FiMic size={14} />}
                  <span>{voice.listening ? 'Stop' : 'Speak'}</span>
                </button>
              )}
              <button
                onClick={() => handleSubmitAnswer(false)}
                disabled={busy}
                className="flex-[2] whitespace-nowrap flex items-center justify-center space-x-1.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm py-2 rounded-lg hover:shadow-xl transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitAction === 'answer' ? <FiLoader className="animate-spin" size={14} /> : <FiSend size={14} />}
                <span>{submitAction === 'answer' ? 'Evaluating...' : 'Submit Answer'}</span>
              </button>
              <button
                onClick={() => handleSubmitAnswer(true)}
                disabled={busy}
                className="flex-1 whitespace-nowrap flex items-center justify-center space-x-1.5 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-50 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitAction === 'skip' ? <FiLoader className="animate-spin" size={14} /> : <FiSkipForward size={14} />}
                <span>{submitAction === 'skip' ? 'Skipping...' : 'Skip'}</span>
              </button>
              <button
                onClick={handleEndInterview}
                disabled={busy}
                className="flex-1 whitespace-nowrap flex items-center justify-center space-x-1.5 px-4 py-2 border-2 border-red-200 text-red-600 font-semibold text-sm rounded-lg hover:bg-red-50 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {ending ? <FiLoader className="animate-spin" size={14} /> : <FiXCircle size={14} />}
                <span>End Interview</span>
              </button>
            </div>

            {busy && (
              <p className="text-xs text-gray-500 mt-2.5 text-center">
                AI is thinking — this can take up to 30-40 seconds, please don't refresh.
              </p>
            )}

            {!voice.recognitionSupported && (
              <p className="text-xs text-gray-400 mt-2.5 text-center">
                Answering by voice works in Chrome or Edge. You can type your answer here.
              </p>
            )}
          </div>

          {/* Phones/tablets: notes right under the answer box */}
          <div className="xl:hidden mt-4">{notesPanel}</div>
        </div>

        {/* Side panel (wide screens); smaller screens show timer and notes inline above */}
        <aside className="hidden xl:flex flex-col gap-4">
          {timerPanel}

          <div className={`${PANEL} p-5`}>
            <div className="flex items-center justify-between">
              <PanelTitle icon={FiHash}>Question Progress</PanelTitle>
              <span className="text-sm font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full">
                {interview.turns.length} / {numQuestions}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3 mt-4">
              {Array.from({ length: numQuestions }, (_, i) => {
                const status = stepStatus(i);
                return (
                  <div key={i} className="relative flex justify-center" title={`Question ${i + 1}: ${status}`}>
                    <span className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold ${STEP_STYLES[status]}`}>
                      {i + 1}
                    </span>
                    {status === 'answered' && (
                      <span className="absolute -top-1 right-0 w-4 h-4 rounded-full bg-white border border-emerald-500 text-emerald-600 flex items-center justify-center">
                        <FiCheck size={10} strokeWidth={4} />
                      </span>
                    )}
                    {status === 'skipped' && (
                      <span className="absolute -top-1 right-0 w-4 h-4 rounded-full bg-white border border-amber-500 text-amber-600 flex items-center justify-center">
                        <FiSkipForward size={8} strokeWidth={4} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Answered</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Skipped</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" />Current</span>
            </div>
          </div>

          <div className={`${PANEL} p-5`}>
            <PanelTitle icon={FiFileText}>Current Question</PanelTitle>
            <p className="text-sm text-gray-700 leading-relaxed mt-3 pl-3 border-l-2 border-cyan-500">{currentQuestion}</p>
          </div>

          {notesPanel}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmEnd}
        title="Are you sure you want to quit the interview?"
        message="Your result will be based on the questions answered so far."
        confirmLabel="Yes, quit"
        cancelLabel="Continue"
        onConfirm={confirmEndInterview}
        onCancel={() => setConfirmEnd(false)}
      />
    </div>
  );
};

export default MockInterview;

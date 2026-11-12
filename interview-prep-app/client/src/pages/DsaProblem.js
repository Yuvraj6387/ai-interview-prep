import React, { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  FiArrowLeft, FiCheckCircle, FiXCircle, FiPlay, FiSend, FiRotateCcw, FiLoader, FiAlertTriangle, FiLogIn, FiExternalLink,
  FiZap, FiCpu, FiMoon, FiSun
} from 'react-icons/fi';
import { dsaAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import ConfirmDialog from '../components/ConfirmDialog';
import ResizeHandle from '../components/ResizeHandle';
import DsaSubmissions from '../components/DsaSubmissions';
import { runJavaScript } from '../utils/jsRunner';
import { DIFFICULTY_STYLES, leetcodeUrl } from './DsaPractice';
import { markdownComponents } from '../components/QuestionCard';

// The editor is the heaviest part of the page, so the text shows first.
const CodeEditor = lazy(() => import('../components/CodeEditor'));

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
];
// JavaScript runs in the browser; the others need the server's code runner.
const needsRunner = (language) => language !== 'javascript';

// Small helpers for saved drafts. Storage can be blocked (private mode), so
// every read and write is allowed to fail.
const draftKey = (id, language) => `dsa-draft:${id}:${language}`;
const readStore = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeStore = (key, value) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } };
const removeStore = (key) => { try { localStorage.removeItem(key); } catch { /* ignore */ } };

// The two resizable sizes, remembered in this browser like on LeetCode:
// the problem column's share of the width (desktop only) and the editor height.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const SPLIT = { min: 25, max: 75, initial: 50, key: 'dsa-split' };
const EDITOR_HEIGHT = { min: 200, max: 1000, initial: 320, key: 'dsa-editor-height' };
const readSize = ({ key, min, max, initial }) => {
  const saved = Number(readStore(key));
  return saved ? clamp(saved, min, max) : initial;
};

// [1,2,3] -> "[1, 2, 3]", strings keep their quotes.
const formatValue = (value) => (Array.isArray(value)
  ? `[${value.map(formatValue).join(', ')}]`
  : JSON.stringify(value));

const formatInput = (problem, args) => problem.params
  .map((p, i) => `${p.name} = ${formatValue(args[i])}`)
  .join(', ');

// Java, Python and C++ results come back as values, JavaScript ones already as text.
const outputText = (result) => {
  if (result.outputText !== undefined) {
    try { return formatValue(JSON.parse(result.outputText)); } catch { return result.outputText; }
  }
  return formatValue(result.output);
};

const inlineCode = {
  code({ children }) {
    return <code className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 text-[0.9em] font-mono">{children}</code>;
  },
  p({ children }) {
    return <p className="mb-3">{children}</p>;
  },
};

const Mono = ({ label, children, tone }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">{label}</p>
    <pre className={`text-xs font-mono rounded-lg px-3 py-2 whitespace-pre-wrap break-all ${
      tone === 'bad' ? 'bg-red-50 text-red-800' : 'bg-stone-50 text-zinc-800'
    }`}
    >
      {children}
    </pre>
  </div>
);

const TestDetail = ({ problem, number, test, result, hidden }) => (
  <div className="rounded-xl border border-stone-200 p-3 space-y-2">
    <p className={`flex items-center gap-1.5 text-sm font-semibold ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
      {result.passed ? <FiCheckCircle /> : <FiXCircle />}
      Test {number}{hidden ? ' (hidden)' : ''}: {result.passed ? 'Passed' : 'Failed'}
    </p>
    <Mono label="Input">{formatInput(problem, test.args)}</Mono>
    <Mono label="Expected">{formatValue(test.expected)}</Mono>
    {result.error
      ? <Mono label="Error" tone="bad">{result.error}</Mono>
      : <Mono label="Your output" tone={result.passed ? undefined : 'bad'}>{outputText(result)}</Mono>}
  </div>
);

const Results = ({ problem, result }) => {
  if (result.status === 'compile_error' || result.status === 'timeout' || (result.status === 'error' && !result.results.length)) {
    const isTimeout = result.status === 'timeout';
    return (
      <div className={`rounded-xl p-4 ${isTimeout ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'}`}>
        <p className="flex items-center gap-2 font-semibold text-sm mb-1">
          <FiAlertTriangle /> {isTimeout ? 'Time limit exceeded' : 'Your code has an error'}
        </p>
        <pre className="text-xs font-mono whitespace-pre-wrap break-words">{result.message}</pre>
      </div>
    );
  }

  const { results, tests, mode } = result;
  const passedCount = results.filter((r) => r.passed).length;
  const firstFail = results.findIndex((r) => !r.passed);

  return (
    <div className="space-y-3">
      {mode === 'submit' && (
        <div className={`rounded-xl p-4 ${result.passed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <p className="flex items-center gap-2 font-bold">
            {result.passed ? <FiCheckCircle /> : <FiXCircle />}
            {result.passed ? 'Accepted' : 'Wrong answer'}
          </p>
          <p className="text-sm mt-0.5">{passedCount} / {results.length} tests passed</p>
        </div>
      )}

      {mode === 'run'
        ? results.map((r, i) => (
          <TestDetail key={i} problem={problem} number={i + 1} test={tests[i]} result={r} />
        ))
        : firstFail >= 0 && (
          <TestDetail
            problem={problem}
            number={firstFail + 1}
            test={tests[firstFail]}
            result={results[firstFail]}
            hidden={firstFail >= problem.sampleCount}
          />
        )}

      {result.status === 'error' && result.message && (
        <Mono label="Error" tone="bad">{result.message}</Mono>
      )}
      {result.logs && <Mono label="Console output">{result.logs}</Mono>}
    </div>
  );
};

const DsaProblem = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [problem, setProblem] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [language, setLanguage] = useState(() => readStore('dsa-language') || 'javascript');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(null); // 'run' | 'submit' | null
  const [result, setResult] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  // Kept apart from `problem` so marking it solved doesn't reload the code.
  const [solvedNow, setSolvedNow] = useState(false);
  // Goes up after every Submit so My Submissions reloads.
  const [submitCount, setSubmitCount] = useState(0);
  const [split, setSplit] = useState(() => readSize(SPLIT));
  const [editorHeight, setEditorHeight] = useState(() => readSize(EDITOR_HEIGHT));
  // Dark editor, remembered on this device.
  const [editorDark, setEditorDark] = useState(() => readStore('dsa-editor-dark') === 'true');
  const toggleEditorDark = () => {
    setEditorDark((dark) => {
      writeStore('dsa-editor-dark', String(!dark));
      return !dark;
    });
  };
  const layoutRef = useRef(null);
  const dragStart = useRef(null); // the size when the current drag started

  const splitHandlers = {
    onStart: () => { dragStart.current = { size: split, width: layoutRef.current?.offsetWidth || 1 }; },
    onDrag: ({ dx }) => setSplit(clamp(dragStart.current.size + (dx / dragStart.current.width) * 100, SPLIT.min, SPLIT.max)),
    onEnd: () => writeStore(SPLIT.key, split.toFixed(1)),
    onKey: (step) => { const next = clamp(split + step * 2, SPLIT.min, SPLIT.max); setSplit(next); writeStore(SPLIT.key, next); },
    onReset: () => { setSplit(SPLIT.initial); removeStore(SPLIT.key); },
  };

  const heightHandlers = {
    onStart: () => { dragStart.current = { size: editorHeight }; },
    onDrag: ({ dy }) => setEditorHeight(clamp(Math.round(dragStart.current.size + dy), EDITOR_HEIGHT.min, EDITOR_HEIGHT.max)),
    onEnd: () => writeStore(EDITOR_HEIGHT.key, editorHeight),
    onKey: (step) => { const next = clamp(editorHeight + step * 20, EDITOR_HEIGHT.min, EDITOR_HEIGHT.max); setEditorHeight(next); writeStore(EDITOR_HEIGHT.key, next); },
    onReset: () => { setEditorHeight(EDITOR_HEIGHT.initial); removeStore(EDITOR_HEIGHT.key); },
  };
  const [hints, setHints] = useState([]); // up to 3, each one says a bit more
  const [hintLoading, setHintLoading] = useState(false);
  const [review, setReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    setProblem(null);
    setResult(null);
    setSolvedNow(false);
    setHints([]);
    setReview('');
    dsaAPI.get(id)
      .then((response) => setProblem(response.data))
      .catch((err) => setLoadError(err.response?.status === 404 ? 'This problem does not exist.' : 'Unable to load this problem.'));
  }, [id]);

  // Java, Python and C++ need the server's runner; fall back if it isn't set up.
  const knownLanguage = LANGUAGES.some((l) => l.id === language) ? language : 'javascript';
  const activeLanguage = problem && needsRunner(knownLanguage) && !problem.runnerAvailable ? 'javascript' : knownLanguage;

  // Load the saved draft, or the starter code, whenever the problem or
  // language changes.
  useEffect(() => {
    if (!problem) return;
    setCode(readStore(draftKey(problem.id, activeLanguage)) ?? problem.starter[activeLanguage]);
    setResult(null);
  }, [problem, activeLanguage]);

  const handleCodeChange = useCallback((value) => {
    setCode(value);
    writeStore(draftKey(id, activeLanguage), value);
  }, [id, activeLanguage]);

  const changeLanguage = (value) => {
    setLanguage(value);
    writeStore('dsa-language', value);
  };

  // Puts a saved submission back in the editor. It is saved as that
  // language's draft first, so switching language loads it instead of the
  // starter code.
  const loadSubmission = (lang, savedCode) => {
    writeStore(draftKey(problem.id, lang), savedCode);
    if (lang === activeLanguage) setCode(savedCode);
    else changeLanguage(lang);
    setResult(null);
    showToast('Loaded into the editor', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetCode = () => {
    setConfirmReset(false);
    removeStore(draftKey(problem.id, activeLanguage));
    setCode(problem.starter[activeLanguage]);
    setResult(null);
  };

  const errorMessage = (err) => err.response?.data?.message || 'Something went wrong. Please try again.';

  const run = async () => {
    const tests = problem.tests.slice(0, problem.sampleCount);
    setBusy('run');
    setResult(null);
    try {
      const outcome = activeLanguage === 'javascript'
        ? await runJavaScript(code, problem, tests)
        : (await dsaAPI.run(problem.id, activeLanguage, code)).data;
      setResult({ ...outcome, mode: 'run', tests });
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const getHint = async () => {
    setHintLoading(true);
    try {
      const { data } = await dsaAPI.hint(problem.id, hints.length + 1, activeLanguage, code);
      setHints((prev) => [...prev, data.hint]);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setHintLoading(false);
    }
  };

  const getReview = async () => {
    setReviewLoading(true);
    try {
      const { data } = await dsaAPI.review(problem.id, activeLanguage, code);
      setReview(data.review);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const submit = async () => {
    setBusy('submit');
    setResult(null);
    setReview('');
    try {
      let outcome;
      if (activeLanguage === 'javascript') {
        const local = await runJavaScript(code, problem, problem.tests);
        const passedCount = local.results.filter((r) => r.passed).length;
        const saved = (await dsaAPI.submit(problem.id, 'javascript', code, passedCount)).data;
        outcome = { ...local, ...saved };
      } else {
        outcome = (await dsaAPI.submit(problem.id, activeLanguage, code)).data;
      }
      setResult({ ...outcome, mode: 'submit', tests: problem.tests });
      if (outcome.passed) setSolvedNow(true);
      setSubmitCount((n) => n + 1);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <p className="text-zinc-700 mb-4">{loadError}</p>
        <Link to="/dsa" className="btn-secondary"><FiArrowLeft /> <span>All problems</span></Link>
      </div>
    );
  }
  if (!problem) {
    return <div className="flex justify-center py-20"><div className="spinner"></div></div>;
  }

  const samples = problem.tests.slice(0, problem.sampleCount);

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <Link to="/dsa" className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
          <FiArrowLeft size={14} /> All problems
        </Link>

        {/* Stacked on phones. On desktop the problem takes `split`% of the
            width and the bar between the columns resizes it. min-w-0 lets a
            long line of code scroll inside the editor instead of widening the
            column. */}
        <div ref={layoutRef} className="flex flex-col lg:flex-row gap-5 lg:gap-0 lg:items-start">
          {/* Problem */}
          <div className="card p-5 sm:p-6 min-w-0 lg:flex-none lg:w-[var(--split)]" style={{ '--split': `${split}%` }}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${DIFFICULTY_STYLES[problem.difficulty]}`}>
                {problem.difficulty}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-zinc-600">{problem.topic}</span>
              {(problem.solved || solvedNow) && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700">
                  <FiCheckCircle size={12} /> Solved
                </span>
              )}
            </div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-2xl font-bold text-zinc-900 font-display">{problem.title}</h1>
              {problem.leetcode && (
                <a
                  href={leetcodeUrl(problem.leetcode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open this question on LeetCode"
                  className="flex items-center gap-1.5 mt-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-zinc-600 hover:text-orange-700 hover:border-orange-300 flex-shrink-0 transition-smooth"
                >
                  LeetCode <FiExternalLink size={12} />
                </a>
              )}
            </div>
            <div className="text-sm text-zinc-700 leading-relaxed">
              <ReactMarkdown components={inlineCode}>{problem.statement}</ReactMarkdown>
            </div>

            <div className="space-y-3 mt-4">
              {samples.map((test, i) => (
                <div key={i} className="rounded-xl bg-stone-50 border border-stone-200 p-3">
                  <p className="text-xs font-semibold text-zinc-800 mb-1.5">Example {i + 1}</p>
                  <p className="text-xs font-mono text-zinc-700 break-all"><span className="text-zinc-500">Input: </span>{formatInput(problem, test.args)}</p>
                  <p className="text-xs font-mono text-zinc-700 break-all"><span className="text-zinc-500">Output: </span>{formatValue(test.expected)}</p>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-zinc-800 mt-4 mb-1.5">Constraints</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs text-zinc-600 font-mono">
              {problem.constraints.map((c) => <li key={c}>{c}</li>)}
            </ul>

            {/* AI hints: one at a time, each gives away a little more */}
            {isAuthenticated && (
              <div className="mt-5 pt-4 border-t border-stone-100 space-y-3">
                {hints.map((hint, i) => (
                  <div key={i} className="rounded-xl bg-amber-50/70 border border-amber-200 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1.5">
                      <FiZap size={12} /> Hint {i + 1} of 3
                    </p>
                    <div className="text-sm text-zinc-700 leading-relaxed [&_p:last-child]:mb-0">
                      <ReactMarkdown components={markdownComponents}>{hint}</ReactMarkdown>
                    </div>
                  </div>
                ))}
                {hints.length < 3 && (
                  <button
                    type="button"
                    onClick={getHint}
                    disabled={hintLoading}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-60 transition-smooth"
                  >
                    {hintLoading ? <FiLoader className="animate-spin" size={14} /> : <FiZap size={14} />}
                    {hints.length === 0 ? 'Stuck? Get a hint' : `Next hint (${hints.length + 1} of 3)`}
                  </button>
                )}
                {hints.length === 0 && (
                  <p className="text-xs text-zinc-500">Hints get more detailed one by one, and never give the full code. They look at the code you have written so far.</p>
                )}
              </div>
            )}
          </div>

          <ResizeHandle
            direction="vertical"
            label="Drag to resize the problem and the code"
            className="hidden lg:flex w-5 flex-shrink-0 self-stretch"
            {...splitHandlers}
          />

          {/* Editor and results */}
          <div className="space-y-4 min-w-0 flex-1">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-stone-200 bg-stone-50/60">
                <select
                  value={activeLanguage}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="text-sm font-semibold text-zinc-800 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-orange-200 outline-none"
                  aria-label="Language"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id} disabled={needsRunner(l.id) && !problem.runnerAvailable}>
                      {l.label}{needsRunner(l.id) && !problem.runnerAvailable ? ' (not set up)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 px-2 py-1.5"
                >
                  <FiRotateCcw size={12} /> Reset
                </button>
                <button
                  type="button"
                  onClick={toggleEditorDark}
                  title={editorDark ? 'Light editor' : 'Dark editor'}
                  aria-label={editorDark ? 'Switch to light editor' : 'Switch to dark editor'}
                  aria-pressed={editorDark}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 px-2 py-1.5"
                >
                  {editorDark ? <FiSun size={12} /> : <FiMoon size={12} />}
                  <span className="hidden sm:inline">{editorDark ? 'Light' : 'Dark'}</span>
                </button>
              </div>
              <Suspense fallback={<div className="bg-stone-50 animate-pulse" style={{ height: editorHeight }} />}>
                <CodeEditor value={code} onChange={handleCodeChange} language={activeLanguage} height={`${editorHeight}px`} dark={editorDark} />
              </Suspense>
              <ResizeHandle
                direction="horizontal"
                label="Drag to make the editor taller or shorter"
                className="h-4 border-t border-stone-200 bg-stone-50/60"
                {...heightHandlers}
              />
            </div>

            {isAuthenticated ? (
              <div className="flex gap-3">
                <button type="button" onClick={run} disabled={Boolean(busy)} className="btn-secondary flex-1">
                  {busy === 'run' ? <FiLoader className="animate-spin" /> : <FiPlay />} <span>Run</span>
                </button>
                <button type="button" onClick={submit} disabled={Boolean(busy)} className="btn-primary flex-1">
                  {busy === 'submit' ? <FiLoader className="animate-spin" /> : <FiSend />} <span>Submit</span>
                </button>
              </div>
            ) : (
              <div className="card p-4 flex items-center gap-3 text-sm text-zinc-700">
                <FiLogIn className="text-orange-600 flex-shrink-0" />
                <span>Log in to run your code against the tests and save your progress.</span>
              </div>
            )}

            {result && (
              <div className="card p-4">
                <Results problem={problem} result={result} />
                {/* Offered only after this code passed, so it reviews a real solution */}
                {result.mode === 'submit' && result.passed && !review && (
                  <button
                    type="button"
                    onClick={getReview}
                    disabled={reviewLoading}
                    className="btn-secondary w-full mt-3"
                  >
                    {reviewLoading ? <FiLoader className="animate-spin" /> : <FiCpu />}
                    <span>{reviewLoading ? 'Reviewing your solution...' : 'AI Review of my solution'}</span>
                  </button>
                )}
              </div>
            )}

            {review && (
              <div className="card p-4 sm:p-5">
                <p className="flex items-center gap-2 font-bold text-zinc-900 mb-2">
                  <FiCpu className="text-orange-600" /> AI Review
                </p>
                <div className="text-sm text-gray-700 leading-relaxed">
                  <ReactMarkdown components={markdownComponents}>{review}</ReactMarkdown>
                </div>
              </div>
            )}

            {isAuthenticated && (
              <DsaSubmissions problemId={problem.id} refreshKey={submitCount} onLoad={loadSubmission} />
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset your code?"
        message="Your code for this problem will be replaced with the starter code."
        confirmLabel="Reset"
        onConfirm={resetCode}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
};

export default DsaProblem;

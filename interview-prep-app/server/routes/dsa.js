const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DsaSubmission = require('../models/DsaSubmission');
const { problems, TOPICS, SAMPLE_COUNT } = require('../data/dsaProblems');
const {
  starterCode, javaProgram, pythonProgram, pythonErrorLines, cppProgram, cppErrorLines, parseRunOutput, userOutput,
} = require('../utils/dsaCode');
const { runCode, isRunnerAvailable } = require('../utils/codeRunner');
const aiService = require('../utils/aiService');

const { optionalAuth } = auth;
const MAX_CODE_LENGTH = 20000;
const LANGUAGES = ['javascript', 'java', 'python', 'cpp'];
// JavaScript runs in the browser; these run on the outside code runner.
const SERVER_LANGUAGES = ['java', 'python', 'cpp'];

const byId = new Map(problems.map((p) => [p.id, p]));

// The hosted Java runner and the AI both have limits shared by every user, so
// one user can't use them all up: at most `limit` calls per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const makeLimiter = (limit) => {
  const calls = new Map();
  return (userId) => {
    const now = Date.now();
    const recent = (calls.get(userId) || []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= limit) return false;
    recent.push(now);
    calls.set(userId, recent);
    return true;
  };
};
const serverRunAllowed = makeLimiter(20);
const aiAllowed = makeLimiter(20);

const solvedIds = async (userId) => (userId
  ? new Set(await DsaSubmission.distinct('problemId', { userId, passed: true }))
  : new Set());

// Checks the parts every run and submit needs, and sends the error itself.
const readRequest = (req, res) => {
  const problem = byId.get(req.params.id);
  if (!problem) {
    res.status(404).json({ message: 'Problem not found' });
    return null;
  }
  const { language, code } = req.body;
  if (!LANGUAGES.includes(language)) {
    res.status(400).json({ message: 'Choose JavaScript, Java, Python or C++' });
    return null;
  }
  if (typeof code !== 'string' || !code.trim()) {
    res.status(400).json({ message: 'Write some code first' });
    return null;
  }
  if (code.length > MAX_CODE_LENGTH) {
    res.status(400).json({ message: `Code must be under ${MAX_CODE_LENGTH} characters` });
    return null;
  }
  return { problem, language, code };
};

const PROGRAM = { java: javaProgram, python: pythonProgram, cpp: cppProgram };
// Error line numbers should match the user's editor. "Main.java:3: error"
// becomes "Line 3: error" (the file name differs between Judge0 and JDoodle).
const tidyErrors = {
  java: (text) => text.replace(/\S*\.java:(\d+):/g, 'Line $1:'),
  python: pythonErrorLines,
  cpp: cppErrorLines,
};

// Runs Java, Python or C++ against the given tests and returns the same shape the
// browser produces for JavaScript, so the page shows them all the same way.
const runServerTests = async (language, problem, code, tests) => {
  const run = await runCode(language, PROGRAM[language](problem, code, tests));
  const tidy = tidyErrors[language];
  if (run.status === 'compile_error') {
    const message = tidy(run.compileOutput);
    return { status: 'compile_error', message: message || 'Your code did not compile.', results: [] };
  }
  const results = parseRunOutput(run.stdout, tests, problem.compare);
  return {
    status: run.status,
    message: run.status === 'timeout'
      ? 'Time limit exceeded. Check for an infinite loop, or a solution that is too slow.'
      : run.status === 'error' ? tidy(run.stderr || 'Your code crashed while running.') : '',
    results,
    logs: userOutput(run.stdout),
  };
};

// GET /api/dsa/problems: the list, with a tick for the ones this user solved.
router.get('/problems', optionalAuth, async (req, res) => {
  try {
    const solved = await solvedIds(req.userId);
    res.json({
      topics: TOPICS,
      runnerAvailable: isRunnerAvailable(),
      problems: problems.map(({ id, title, topic, difficulty, leetcode }) => ({
        id, title, topic, difficulty, leetcode, solved: solved.has(id),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load problems' });
  }
});

// GET /api/dsa/problems/:id: everything the problem page needs. All tests are
// sent because JavaScript runs in the browser. Someone could read them in
// DevTools, which is fine for a practice tool (a contest would need them kept
// on the server).
router.get('/problems/:id', optionalAuth, async (req, res) => {
  const problem = byId.get(req.params.id);
  if (!problem) return res.status(404).json({ message: 'Problem not found' });
  try {
    const solved = await solvedIds(req.userId);
    res.json({
      ...problem,
      sampleCount: SAMPLE_COUNT,
      starter: starterCode(problem),
      solved: solved.has(problem.id),
      runnerAvailable: isRunnerAvailable(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load the problem' });
  }
});

// GET /api/dsa/problems/:id/submissions: this user's own submissions for the
// problem, newest first, with their code, so solved solutions can be seen and
// loaded again later.
const SUBMISSIONS_SHOWN = 20;
router.get('/problems/:id/submissions', auth, async (req, res) => {
  if (!byId.has(req.params.id)) return res.status(404).json({ message: 'Problem not found' });
  try {
    const submissions = await DsaSubmission.find({ userId: req.userId, problemId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(SUBMISSIONS_SHOWN)
      .select('language code passedCount total passed createdAt')
      .lean();
    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load your submissions' });
  }
});

const TOO_MANY_RUNS = 'Too many code runs. Please wait a few minutes.';

// POST /api/dsa/problems/:id/run: Java, Python or C++ "Run" on the sample tests.
// JavaScript "Run" never reaches the server.
router.post('/problems/:id/run', auth, async (req, res) => {
  const input = readRequest(req, res);
  if (!input) return;
  if (!SERVER_LANGUAGES.includes(input.language)) {
    return res.status(400).json({ message: 'JavaScript runs in your browser' });
  }
  if (!serverRunAllowed(req.userId)) return res.status(429).json({ message: TOO_MANY_RUNS });
  try {
    const samples = input.problem.tests.slice(0, SAMPLE_COUNT);
    res.json(await runServerTests(input.language, input.problem, input.code, samples));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Unable to run the code' });
  }
});

// POST /api/dsa/problems/:id/submit: runs (Java, Python, C++) or records
// (JavaScript) all tests and saves the attempt.
router.post('/problems/:id/submit', auth, async (req, res) => {
  const input = readRequest(req, res);
  if (!input) return;
  const { problem, language, code } = input;
  const total = problem.tests.length;

  try {
    let outcome;
    if (SERVER_LANGUAGES.includes(language)) {
      if (!serverRunAllowed(req.userId)) return res.status(429).json({ message: TOO_MANY_RUNS });
      outcome = await runServerTests(language, problem, code, problem.tests);
    } else {
      // The browser already ran the tests; it sends how many passed.
      const passedCount = Number(req.body.passedCount);
      if (!Number.isInteger(passedCount) || passedCount < 0 || passedCount > total) {
        return res.status(400).json({ message: 'Invalid result' });
      }
      outcome = { passedCount };
    }

    const passedCount = outcome.results
      ? outcome.results.filter((r) => r.passed).length
      : outcome.passedCount;
    const passed = passedCount === total;

    await DsaSubmission.create({
      userId: req.userId, problemId: problem.id, language, code, passedCount, total, passed,
    });

    res.json({ ...outcome, passedCount, total, passed });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Unable to submit' });
  }
});

const AI_BUSY = 'The AI is busy right now. Please try again in a minute.';
const TOO_MANY_AI = 'Too many AI requests. Please wait a few minutes.';

// POST /api/dsa/problems/:id/hint: one hint, level 1 (a nudge) to 3 (a plan).
// The code is optional; with it, the hint can point at the user's own attempt.
router.post('/problems/:id/hint', auth, async (req, res) => {
  const problem = byId.get(req.params.id);
  if (!problem) return res.status(404).json({ message: 'Problem not found' });
  const level = Number(req.body.level);
  if (![1, 2, 3].includes(level)) return res.status(400).json({ message: 'Hint level must be 1, 2 or 3' });
  const language = LANGUAGES.includes(req.body.language) ? req.body.language : 'javascript';
  const code = typeof req.body.code === 'string' ? req.body.code.slice(0, MAX_CODE_LENGTH) : '';
  if (!aiAllowed(req.userId)) return res.status(429).json({ message: TOO_MANY_AI });

  try {
    const hint = await aiService.generateDsaHint(problem, { level, language, code });
    res.json({ level, hint });
  } catch (error) {
    res.status(503).json({ message: AI_BUSY });
  }
});

// POST /api/dsa/problems/:id/review: AI feedback on a solution. Only for
// problems the user has solved, so it is a review and not a way to get the
// answer.
router.post('/problems/:id/review', auth, async (req, res) => {
  const input = readRequest(req, res);
  if (!input) return;
  const { problem, language, code } = input;

  try {
    const solved = await DsaSubmission.exists({ userId: req.userId, problemId: problem.id, passed: true });
    if (!solved) return res.status(403).json({ message: 'Solve the problem first, then ask for a review.' });
    if (!aiAllowed(req.userId)) return res.status(429).json({ message: TOO_MANY_AI });
    const review = await aiService.reviewDsaSolution(problem, { language, code });
    res.json({ review });
  } catch (error) {
    res.status(503).json({ message: AI_BUSY });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DsaSubmission = require('../models/DsaSubmission');
const { problems, TOPICS, SAMPLE_COUNT } = require('../data/dsaProblems');
const { starterCode, javaProgram, parseJavaOutput, userOutput } = require('../utils/dsaCode');
const { runJava, isJavaAvailable } = require('../utils/javaRunner');

const { optionalAuth } = auth;
const MAX_CODE_LENGTH = 20000;
const LANGUAGES = ['javascript', 'java'];

const byId = new Map(problems.map((p) => [p.id, p]));

// The hosted Java runner has a daily limit shared by every user, so one user
// can't use it all up: at most JAVA_RUN_LIMIT runs per window.
const JAVA_RUN_LIMIT = 20;
const JAVA_WINDOW_MS = 10 * 60 * 1000;
const javaRuns = new Map();
const javaRunAllowed = (userId) => {
  const now = Date.now();
  const recent = (javaRuns.get(userId) || []).filter((t) => now - t < JAVA_WINDOW_MS);
  if (recent.length >= JAVA_RUN_LIMIT) return false;
  recent.push(now);
  javaRuns.set(userId, recent);
  return true;
};

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
    res.status(400).json({ message: 'Choose JavaScript or Java' });
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

// Runs Java against the given tests and returns the same shape the browser
// produces for JavaScript, so the page shows both the same way.
const runJavaTests = async (problem, code, tests) => {
  const run = await runJava(javaProgram(problem, code, tests));
  if (run.status === 'compile_error') {
    // "Main.java:3: error: ..." reads better as "Line 3: error: ...".
    // The file name differs between Judge0 and JDoodle.
    const message = run.compileOutput.replace(/\S*\.java:(\d+):/g, 'Line $1:');
    return { status: 'compile_error', message: message || 'Your code did not compile.', results: [] };
  }
  const results = parseJavaOutput(run.stdout, tests, problem.compare);
  return {
    status: run.status,
    message: run.status === 'timeout'
      ? 'Time limit exceeded. Check for an infinite loop, or a solution that is too slow.'
      : run.status === 'error' ? (run.stderr || 'Your code crashed while running.') : '',
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
      javaAvailable: isJavaAvailable(),
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
      javaAvailable: isJavaAvailable(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load the problem' });
  }
});

// POST /api/dsa/problems/:id/run: Java "Run" on the sample tests. JavaScript
// "Run" never reaches the server.
router.post('/problems/:id/run', auth, async (req, res) => {
  const input = readRequest(req, res);
  if (!input) return;
  if (input.language !== 'java') {
    return res.status(400).json({ message: 'JavaScript runs in your browser' });
  }
  if (!javaRunAllowed(req.userId)) {
    return res.status(429).json({ message: 'Too many Java runs. Please wait a few minutes.' });
  }
  try {
    res.json(await runJavaTests(input.problem, input.code, input.problem.tests.slice(0, SAMPLE_COUNT)));
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Unable to run the code' });
  }
});

// POST /api/dsa/problems/:id/submit: runs (Java) or records (JavaScript) all
// tests and saves the attempt.
router.post('/problems/:id/submit', auth, async (req, res) => {
  const input = readRequest(req, res);
  if (!input) return;
  const { problem, language, code } = input;
  const total = problem.tests.length;

  try {
    let outcome;
    if (language === 'java') {
      if (!javaRunAllowed(req.userId)) {
        return res.status(429).json({ message: 'Too many Java runs. Please wait a few minutes.' });
      }
      outcome = await runJavaTests(problem, code, problem.tests);
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

module.exports = router;

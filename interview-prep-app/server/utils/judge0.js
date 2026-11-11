// Runs Java code on Judge0, a code-execution service that runs each program in
// its own sandbox. User code never runs on this server.
//
// Set JUDGE0_API_KEY to use the hosted Judge0 on RapidAPI, or JUDGE0_URL to
// point at a self-hosted Judge0. With neither set, Java is switched off and
// the page only offers JavaScript.

const RAPIDAPI_URL = 'https://judge0-ce.p.rapidapi.com';
const JAVA_LANGUAGE_ID = 62; // Java (OpenJDK 13)
const REQUEST_TIMEOUT_MS = 20000;

const judgeUrl = () => process.env.JUDGE0_URL || (process.env.JUDGE0_API_KEY ? RAPIDAPI_URL : null);

const isJavaAvailable = () => Boolean(judgeUrl());

const toBase64 = (text) => Buffer.from(text, 'utf8').toString('base64');
const fromBase64 = (text) => (text ? Buffer.from(text, 'base64').toString('utf8') : '');

// Judge0 status ids: 3 finished normally, 5 time limit, 6 compile error,
// 7-12 the program crashed. Anything else is a problem on Judge0's side.
const STATUS = { ACCEPTED: 3, TIME_LIMIT: 5, COMPILE_ERROR: 6 };

const runJava = async (source) => {
  const base = judgeUrl();
  if (!base) {
    const error = new Error('Java is not set up on this server yet.');
    error.status = 503;
    throw error;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY;
    headers['X-RapidAPI-Host'] = new URL(base).host;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${base}/submissions?base64_encoded=true&wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language_id: JAVA_LANGUAGE_ID, source_code: toBase64(source) }),
      signal: controller.signal,
    });
  } catch (err) {
    const error = new Error('The Java runner did not respond. Please try again.');
    error.status = 502;
    throw error;
  } finally {
    clearTimeout(timer);
  }

  // A wrong key, or a key not subscribed to Judge0 on RapidAPI.
  if (response.status === 401 || response.status === 403) {
    console.error('Judge0 rejected the API key:', response.status, await response.text().catch(() => ''));
    const error = new Error('Java is not set up correctly on this server yet. Try JavaScript for now.');
    error.status = 503;
    throw error;
  }
  if (response.status === 429) {
    const error = new Error("Today's limit for running Java code has been reached. Try JavaScript, or try again tomorrow.");
    error.status = 429;
    throw error;
  }
  if (!response.ok) {
    const error = new Error('The Java runner returned an error. Please try again.');
    error.status = 502;
    throw error;
  }

  const data = await response.json();
  const statusId = data.status?.id;
  const result = {
    stdout: fromBase64(data.stdout),
    stderr: fromBase64(data.stderr).slice(0, 2000),
    compileOutput: fromBase64(data.compile_output).slice(0, 3000),
  };

  if (statusId === STATUS.COMPILE_ERROR) return { ...result, status: 'compile_error' };
  if (statusId === STATUS.TIME_LIMIT) return { ...result, status: 'timeout' };
  if (statusId === STATUS.ACCEPTED) return { ...result, status: 'ok' };
  if (statusId >= 7 && statusId <= 12) return { ...result, status: 'error' };

  const error = new Error('The Java runner could not run this code. Please try again.');
  error.status = 502;
  throw error;
};

module.exports = { runJava, isJavaAvailable };

// Runs Java code on an outside code-execution service, which runs each program
// in its own sandbox. User code never runs on this server.
//
// Two services are supported; set the keys for one of them:
//   JDoodle: JDOODLE_CLIENT_ID + JDOODLE_CLIENT_SECRET (free plan, no card)
//   Judge0:  JUDGE0_API_KEY (hosted on RapidAPI) or JUDGE0_URL (self-hosted)
// With neither set, Java is switched off and the page only offers JavaScript.
//
// Both return the same shape:
//   { status: 'ok' | 'compile_error' | 'timeout' | 'error', stdout, stderr, compileOutput }

const REQUEST_TIMEOUT_MS = 20000;

const fail = (status, message) => Object.assign(new Error(message), { status });
const NOT_SET_UP = 'Java is not set up correctly on this server yet. Try JavaScript for now.';
const LIMIT_REACHED = "Today's limit for running Java code has been reached. Try JavaScript, or try again tomorrow.";

const useJdoodle = () => Boolean(process.env.JDOODLE_CLIENT_ID && process.env.JDOODLE_CLIENT_SECRET);
const judge0Url = () => process.env.JUDGE0_URL
  || (process.env.JUDGE0_API_KEY ? 'https://judge0-ce.p.rapidapi.com' : null);

const isJavaAvailable = () => useJdoodle() || Boolean(judge0Url());

const post = async (url, headers, body) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw fail(502, 'The Java runner did not respond. Please try again.');
  } finally {
    clearTimeout(timer);
  }
};

// ---------- JDoodle ----------
// Sends the program and gets back one block of text output. Compile errors
// and time-outs are reported inside that text.
const JDOODLE_JAVA_VERSION = process.env.JDOODLE_JAVA_VERSION || '4';

const runOnJdoodle = async (source) => {
  const response = await post('https://api.jdoodle.com/v1/execute', {}, {
    clientId: process.env.JDOODLE_CLIENT_ID,
    clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    script: source,
    language: 'java',
    versionIndex: JDOODLE_JAVA_VERSION,
  });

  if (response.status === 401 || response.status === 403) {
    console.error('JDoodle rejected the keys:', response.status, await response.text().catch(() => ''));
    throw fail(503, NOT_SET_UP);
  }
  if (response.status === 429) throw fail(429, LIMIT_REACHED);
  if (!response.ok) throw fail(502, 'The Java runner returned an error. Please try again.');

  const data = await response.json();
  const output = data.output || '';

  if (data.isCompiled === false || /^\S+\.java:\d+: error:/m.test(output)) {
    return { status: 'compile_error', stdout: '', stderr: '', compileOutput: output.slice(0, 3000) };
  }
  if (/JDoodle - (Timeout|timeout)/.test(output)) {
    return { status: 'timeout', stdout: output, stderr: '', compileOutput: '' };
  }
  return {
    status: data.isExecutionSuccess === false ? 'error' : 'ok',
    stdout: output,
    stderr: data.isExecutionSuccess === false ? output.slice(-2000) : '',
    compileOutput: '',
  };
};

// ---------- Judge0 ----------
const JUDGE0_JAVA_ID = 62; // Java (OpenJDK 13)
// Status ids: 3 finished normally, 5 time limit, 6 compile error,
// 7-12 the program crashed. Anything else is a problem on Judge0's side.
const JUDGE0_STATUS = { ACCEPTED: 3, TIME_LIMIT: 5, COMPILE_ERROR: 6 };

const toBase64 = (text) => Buffer.from(text, 'utf8').toString('base64');
const fromBase64 = (text) => (text ? Buffer.from(text, 'base64').toString('utf8') : '');

const runOnJudge0 = async (source) => {
  const base = judge0Url();
  const headers = {};
  if (process.env.JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY;
    headers['X-RapidAPI-Host'] = new URL(base).host;
  }

  const response = await post(`${base}/submissions?base64_encoded=true&wait=true`, headers, {
    language_id: JUDGE0_JAVA_ID,
    source_code: toBase64(source),
  });

  // A wrong key, or a key not subscribed to Judge0 on RapidAPI.
  if (response.status === 401 || response.status === 403) {
    console.error('Judge0 rejected the API key:', response.status, await response.text().catch(() => ''));
    throw fail(503, NOT_SET_UP);
  }
  if (response.status === 429) throw fail(429, LIMIT_REACHED);
  if (!response.ok) throw fail(502, 'The Java runner returned an error. Please try again.');

  const data = await response.json();
  const statusId = data.status?.id;
  const result = {
    stdout: fromBase64(data.stdout),
    stderr: fromBase64(data.stderr).slice(0, 2000),
    compileOutput: fromBase64(data.compile_output).slice(0, 3000),
  };

  if (statusId === JUDGE0_STATUS.COMPILE_ERROR) return { ...result, status: 'compile_error' };
  if (statusId === JUDGE0_STATUS.TIME_LIMIT) return { ...result, status: 'timeout' };
  if (statusId === JUDGE0_STATUS.ACCEPTED) return { ...result, status: 'ok' };
  if (statusId >= 7 && statusId <= 12) return { ...result, status: 'error' };
  throw fail(502, 'The Java runner could not run this code. Please try again.');
};

const runJava = async (source) => {
  if (useJdoodle()) return runOnJdoodle(source);
  if (judge0Url()) return runOnJudge0(source);
  throw fail(503, 'Java is not set up on this server yet.');
};

module.exports = { runJava, isJavaAvailable };

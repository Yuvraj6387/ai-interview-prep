// Runs a user's JavaScript solution against test cases inside a Web Worker:
// a separate thread with no access to the page, the DOM or the login token.
// If the code loops forever, the worker is stopped after TIME_LIMIT_MS and the
// page keeps working.

const TIME_LIMIT_MS = 3000;

// The worker's code, as a string, so it can be started from a Blob URL
// without a separate file in the build.
const WORKER_SOURCE = `
const show = (value) => {
  if (value === undefined) return 'undefined';
  try { return JSON.stringify(value); } catch (e) { return String(value); }
};

self.onmessage = (event) => {
  const { code, fn, tests } = event.data;
  const logs = [];
  console.log = (...args) => {
    if (logs.length < 100) logs.push(args.map((a) => (typeof a === 'string' ? a : show(a))).join(' '));
  };

  let solution;
  try {
    solution = new Function(code + '\\n;return typeof ' + fn + ' === "function" ? ' + fn + ' : undefined;')();
  } catch (error) {
    // The code is wrapped in a function to run it, so a missing "}" is
    // reported at the wrapper's ")" instead. The tip points the right way.
    const tip = error instanceof SyntaxError
      ? '\\n\\nTip: check for a missing or extra bracket ( ) { } [ ] or quote.'
      : '';
    self.postMessage({ status: 'compile_error', message: String(error) + tip });
    return;
  }
  if (!solution) {
    self.postMessage({
      status: 'compile_error',
      message: 'Could not find a function named ' + fn + '. Keep the function name from the starter code.',
    });
    return;
  }

  const results = tests.map((test) => {
    try {
      const output = solution(...structuredClone(test.args));
      return {
        passed: show(output) === JSON.stringify(test.expected),
        outputText: show(output),
      };
    } catch (error) {
      return { passed: false, error: String(error) };
    }
  });
  self.postMessage({ status: 'ok', results, logs: logs.join('\\n') });
};
`;

export const runJavaScript = (code, fn, tests) => new Promise((resolve) => {
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
  const worker = new Worker(url);

  const finish = (result) => {
    clearTimeout(timer);
    worker.terminate();
    URL.revokeObjectURL(url);
    resolve(result);
  };

  const timer = setTimeout(() => finish({
    status: 'timeout',
    message: 'Time limit exceeded. Check for an infinite loop, or a solution that is too slow.',
    results: [],
  }), TIME_LIMIT_MS);

  worker.onmessage = (event) => finish({ results: [], ...event.data });
  worker.onerror = (event) => {
    event.preventDefault();
    finish({ status: 'compile_error', message: event.message || 'Your code has an error.', results: [] });
  };
  worker.postMessage({ code, fn, tests });
});

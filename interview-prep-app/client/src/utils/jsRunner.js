// Runs a user's JavaScript solution against test cases inside a Web Worker:
// a separate thread with no access to the page, the DOM or the login token.
// If the code loops forever, the worker is stopped after TIME_LIMIT_MS and the
// page keeps working.
//
// Test values are plain JSON. Linked lists arrive as arrays ([1,2,3]) and
// trees as level-order arrays ([3,9,20,null,null,15,7]); they are turned into
// ListNode / TreeNode objects before the call, and back into arrays after.
// The comparison rules match server/utils/dsaCode.js (used for Java).

const TIME_LIMIT_MS = 3000;

// The worker's code, as a string, so it can be started from a Blob URL
// without a separate file in the build.
const WORKER_SOURCE = `
class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } }
class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; } }
self.ListNode = ListNode;
self.TreeNode = TreeNode;

const buildList = (values) => {
  const dummy = new ListNode();
  let cur = dummy;
  for (const v of values) { cur.next = new ListNode(v); cur = cur.next; }
  return dummy.next;
};
const listToArray = (head) => {
  const out = [];
  for (let n = head; n && out.length < 10000; n = n.next) out.push(n.val);
  return out;
};
const buildTree = (values) => {
  if (!values.length || values[0] === null) return null;
  const root = new TreeNode(values[0]);
  const queue = [root];
  let i = 1;
  while (queue.length && i < values.length) {
    const node = queue.shift();
    if (i < values.length && values[i] !== null) { node.left = new TreeNode(values[i]); queue.push(node.left); }
    i++;
    if (i < values.length && values[i] !== null) { node.right = new TreeNode(values[i]); queue.push(node.right); }
    i++;
  }
  return root;
};
const treeToArray = (root) => {
  const out = [];
  const queue = [root];
  while (queue.length && out.length < 100000) {
    const node = queue.shift();
    if (!node) { out.push(null); continue; }
    out.push(node.val);
    queue.push(node.left, node.right);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
};

const toArg = (value, type) => (type === 'ListNode' ? buildList(value) : type === 'TreeNode' ? buildTree(value) : value);
const fromOutput = (value, type) => {
  if (type === 'ListNode' && (value === null || value instanceof Object)) return listToArray(value);
  if (type === 'TreeNode' && (value === null || value instanceof Object)) return treeToArray(value);
  return value;
};

const order = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const normalize = (value, compare) => {
  if (!Array.isArray(value) || !compare) return value;
  let items = value;
  if (compare === 'sets') items = items.map((inner) => (Array.isArray(inner) ? [...inner].sort(order) : inner));
  return [...items].sort((a, b) => order(JSON.stringify(a), JSON.stringify(b)));
};

const show = (value) => {
  if (value === undefined) return 'undefined';
  try { return JSON.stringify(value); } catch (e) { return String(value); }
};

self.onmessage = (event) => {
  const { code, fn, params, returns, compare, tests } = event.data;
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
      const args = structuredClone(test.args).map((value, i) => toArg(value, params[i].type));
      const output = fromOutput(solution(...args), returns);
      return {
        passed: show(normalize(output, compare)) === JSON.stringify(normalize(test.expected, compare)),
        outputText: show(output),
      };
    } catch (error) {
      return { passed: false, error: String(error) };
    }
  });
  self.postMessage({ status: 'ok', results, logs: logs.join('\\n') });
};
`;

export const runJavaScript = (code, problem, tests) => new Promise((resolve) => {
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
  worker.postMessage({
    code,
    fn: problem.fn,
    params: problem.params,
    returns: problem.returns,
    compare: problem.compare || null,
    tests,
  });
});

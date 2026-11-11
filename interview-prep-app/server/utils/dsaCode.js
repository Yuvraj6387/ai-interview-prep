// Builds code from a problem's function signature: the starter code users see
// in the editor, and the full Java program that runs a user's solution against
// the tests.
//
// Test values are stored as plain JSON. Linked lists are arrays ([1,2,3]) and
// trees are level-order arrays with nulls ([3,9,20,null,null,15,7]), the same
// way LeetCode writes them.

const JAVA_TYPES = {
  int: 'int',
  boolean: 'boolean',
  string: 'String',
  'int[]': 'int[]',
  'int[][]': 'int[][]',
  'string[]': 'String[]',
  'char[][]': 'char[][]',
  'list<int>': 'List<Integer>',
  'list<string>': 'List<String>',
  'list<list<int>>': 'List<List<Integer>>',
  'list<list<string>>': 'List<List<String>>',
  ListNode: 'ListNode',
  TreeNode: 'TreeNode',
};

// Python type hints, written the way LeetCode writes them.
const PYTHON_TYPES = {
  int: 'int',
  boolean: 'bool',
  string: 'str',
  'int[]': 'List[int]',
  'int[][]': 'List[List[int]]',
  'string[]': 'List[str]',
  'char[][]': 'List[List[str]]',
  'list<int>': 'List[int]',
  'list<string>': 'List[str]',
  'list<list<int>>': 'List[List[int]]',
  'list<list<string>>': 'List[List[str]]',
  ListNode: 'Optional[ListNode]',
  TreeNode: 'Optional[TreeNode]',
};

// C++ types, the way LeetCode writes them.
const CPP_TYPES = {
  int: 'int',
  boolean: 'bool',
  string: 'string',
  'int[]': 'vector<int>',
  'int[][]': 'vector<vector<int>>',
  'string[]': 'vector<string>',
  'char[][]': 'vector<vector<char>>',
  'list<int>': 'vector<int>',
  'list<string>': 'vector<string>',
  'list<list<int>>': 'vector<vector<int>>',
  'list<list<string>>': 'vector<vector<string>>',
  ListNode: 'ListNode*',
  TreeNode: 'TreeNode*',
};
// Strings and vectors are passed by reference, like on LeetCode.
const cppParam = (type) => (/^(string|vector)/.test(CPP_TYPES[type]) ? `${CPP_TYPES[type]}&` : CPP_TYPES[type]);

const usesType = (problem, type) => problem.returns === type || problem.params.some((p) => p.type === type);

const JS_NODE_NOTES = {
  ListNode: '// ListNode is already defined: { val, next }. Create one with new ListNode(val).\n',
  TreeNode: '// TreeNode is already defined: { val, left, right }. Create one with new TreeNode(val).\n',
};
const JAVA_NODE_NOTES = {
  ListNode: '/*\n * ListNode is already defined for you:\n * class ListNode { int val; ListNode next; ListNode(int val) {...} }\n */\n',
  TreeNode: '/*\n * TreeNode is already defined for you:\n * class TreeNode { int val; TreeNode left, right; TreeNode(int val) {...} }\n */\n',
};

const PYTHON_NODE_NOTES = {
  ListNode: '# ListNode is already defined for you: ListNode(val, next=None)\n',
  TreeNode: '# TreeNode is already defined for you: TreeNode(val, left=None, right=None)\n',
};

const CPP_NODE_NOTES = {
  ListNode: '/*\n * ListNode is already defined for you:\n * struct ListNode { int val; ListNode *next; ListNode(int x) : val(x), next(nullptr) {} };\n */\n',
  TreeNode: '/*\n * TreeNode is already defined for you:\n * struct TreeNode { int val; TreeNode *left, *right; TreeNode(int x) : val(x), left(nullptr), right(nullptr) {} };\n */\n',
};

const starterCode = (problem) => {
  const names = problem.params.map((p) => p.name).join(', ');
  const javaParams = problem.params.map((p) => `${JAVA_TYPES[p.type]} ${p.name}`).join(', ');
  const pythonParams = problem.params.map((p) => `, ${p.name}: ${PYTHON_TYPES[p.type]}`).join('');
  const cppParams = problem.params.map((p) => `${cppParam(p.type)} ${p.name}`).join(', ');
  const nodeTypes = ['ListNode', 'TreeNode'].filter((t) => usesType(problem, t));
  return {
    javascript: `${nodeTypes.map((t) => JS_NODE_NOTES[t]).join('')}function ${problem.fn}(${names}) {\n  // Write your code here\n\n}\n`,
    java: `${nodeTypes.map((t) => JAVA_NODE_NOTES[t]).join('')}class Solution {\n    public ${JAVA_TYPES[problem.returns]} ${problem.fn}(${javaParams}) {\n        // Write your code here\n\n    }\n}\n`,
    python: `${nodeTypes.map((t) => PYTHON_NODE_NOTES[t]).join('')}class Solution:\n    def ${problem.fn}(self${pythonParams}) -> ${PYTHON_TYPES[problem.returns]}:\n        # Write your code here\n        pass\n`,
    cpp: `${nodeTypes.map((t) => CPP_NODE_NOTES[t]).join('')}class Solution {\npublic:\n    ${CPP_TYPES[problem.returns]} ${problem.fn}(${cppParams}) {\n        // Write your code here\n\n    }\n};\n`,
  };
};

// A JSON string literal is also a valid Java string literal for the plain text
// used in these tests (quotes, backslashes and \n are escaped the same way).
const str = (s) => JSON.stringify(s);
const javaLiteral = (value, type) => {
  switch (type) {
    case 'int':
    case 'boolean':
      return String(value);
    case 'string':
      return str(value);
    case 'int[]':
      return `new int[]{${value.join(', ')}}`;
    case 'int[][]':
      return `new int[][]{${value.map((row) => `{${row.join(', ')}}`).join(', ')}}`;
    case 'string[]':
      return `new String[]{${value.map(str).join(', ')}}`;
    case 'char[][]':
      return `new char[][]{${value.map((row) => `{${row.map((c) => `'${c}'`).join(', ')}}`).join(', ')}}`;
    case 'list<string>':
      return `new ArrayList<String>(Arrays.<String>asList(${value.map(str).join(', ')}))`;
    case 'ListNode':
      return `buildList(new int[]{${value.join(', ')}})`;
    case 'TreeNode':
      return `buildTree(new Integer[]{${value.map((v) => (v === null ? 'null' : v)).join(', ')}})`;
    default:
      throw new Error(`Unsupported type ${type}`);
  }
};

// Each result is printed on its own line after a marker, so anything the user
// prints with System.out does not get mixed up with the results.
const RESULT_MARK = '@@R';
const ERROR_MARK = '@@E';

const JAVA_NODE_CLASSES = {
  ListNode: `
class ListNode {
    int val; ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
`,
  TreeNode: `
class TreeNode {
    int val; TreeNode left, right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}
`,
};

const JAVA_LIST_HELPERS = `
    static ListNode buildList(int[] a) {
        ListNode dummy = new ListNode(0), cur = dummy;
        for (int v : a) { cur.next = new ListNode(v); cur = cur.next; }
        return dummy.next;
    }

    // Stops after 10000 nodes so a list accidentally turned into a loop
    // still prints something.
    static String serList(ListNode head) {
        StringBuilder b = new StringBuilder("[");
        int count = 0;
        for (ListNode n = head; n != null && count < 10000; n = n.next, count++) {
            if (count > 0) b.append(',');
            b.append(n.val);
        }
        return b.append(']').toString();
    }
`;

const JAVA_TREE_HELPERS = `
    static TreeNode buildTree(Integer[] a) {
        if (a.length == 0 || a[0] == null) return null;
        TreeNode root = new TreeNode(a[0]);
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        int i = 1;
        while (!queue.isEmpty() && i < a.length) {
            TreeNode node = queue.poll();
            if (i < a.length && a[i] != null) { node.left = new TreeNode(a[i]); queue.add(node.left); }
            i++;
            if (i < a.length && a[i] != null) { node.right = new TreeNode(a[i]); queue.add(node.right); }
            i++;
        }
        return root;
    }

    static String serTree(TreeNode root) {
        List<String> out = new ArrayList<>();
        Queue<TreeNode> queue = new LinkedList<>();
        queue.add(root);
        while (!queue.isEmpty() && out.size() < 100000) {
            TreeNode node = queue.poll();
            if (node == null) { out.add("null"); continue; }
            out.add(String.valueOf(node.val));
            queue.add(node.left);
            queue.add(node.right);
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(",", out) + "]";
    }
`;

// Turns the return value into JSON so the server can compare it with the
// expected answer the same way for both languages.
const JAVA_HELPERS = `
    static String q(String s) {
        StringBuilder b = new StringBuilder("\\"");
        for (char c : s.toCharArray()) {
            if (c == '"' || c == '\\\\') b.append('\\\\').append(c);
            else if (c < 32) b.append(String.format("\\\\u%04x", (int) c));
            else b.append(c);
        }
        return b.append('"').toString();
    }

    static String ser(Object o) {
        if (o == null) return "null";
        if (o instanceof String) return q((String) o);
        if (o instanceof Character) return q(String.valueOf(o));
        if (o instanceof int[]) {
            int[] a = (int[]) o;
            StringBuilder b = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i]); }
            return b.append(']').toString();
        }
        if (o instanceof char[]) {
            char[] a = (char[]) o;
            StringBuilder b = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(q(String.valueOf(a[i]))); }
            return b.append(']').toString();
        }
        if (o instanceof Object[]) return ser(Arrays.asList((Object[]) o));
        if (o instanceof Collection) {
            StringBuilder b = new StringBuilder("[");
            boolean first = true;
            for (Object item : (Collection<?>) o) { if (!first) b.append(','); b.append(ser(item)); first = false; }
            return b.append(']').toString();
        }
        return String.valueOf(o);
    }
`;

// Judge0 and JDoodle save Java code as Main.java, so the user's class must not
// be public, and their import lines have to come before any class. The imports
// are moved onto the first line and their own lines left blank, so a compile
// error's line number matches the line in the user's editor.
const javaProgram = (problem, userCode, tests) => {
  const isImport = (l) => /^\s*import\s+[\w.*]+\s*;\s*$/.test(l);
  const lines = userCode.split(/\r?\n/);
  const imports = lines.filter(isImport).map((l) => l.trim());
  const userLines = lines.map((l) => (isImport(l) ? '' : l));
  userLines[0] = ['import java.util.*;', ...imports, userLines[0]].join(' ');
  const body = userLines
    .join('\n')
    .replace(/\bpublic\s+(final\s+)?class\s+Solution\b/, 'class Solution');

  const usesList = usesType(problem, 'ListNode');
  const usesTree = usesType(problem, 'TreeNode');
  const serializer = problem.returns === 'ListNode' ? 'serList' : problem.returns === 'TreeNode' ? 'serTree' : 'ser';

  const calls = tests.map((test, i) => {
    const args = test.args.map((arg, j) => javaLiteral(arg, problem.params[j].type)).join(', ');
    return `        try { System.out.println("\\n${RESULT_MARK}${i}\\t" + ${serializer}(s.${problem.fn}(${args}))); }
        catch (Throwable e) { System.out.println("\\n${ERROR_MARK}${i}\\t" + e); }`;
  });

  return `${body}
${usesList ? JAVA_NODE_CLASSES.ListNode : ''}${usesTree ? JAVA_NODE_CLASSES.TreeNode : ''}
public class Main {
${JAVA_HELPERS}${usesList ? JAVA_LIST_HELPERS : ''}${usesTree ? JAVA_TREE_HELPERS : ''}
    public static void main(String[] args) {
        Solution s = new Solution();
${calls.join('\n')}
    }
}
`;
};

// ---------- Python ----------
// The program is: a fixed prelude (imports, ListNode, TreeNode, helpers), then
// the user's code, then the test calls. The prelude always has the same number
// of lines, so an error's line number can be turned back into the line in the
// user's editor by subtracting PYTHON_PRELUDE_LINES.
const PYTHON_PRELUDE = `import sys, json, traceback
from typing import *
sys.setrecursionlimit(10000)

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def _build_list(values):
    dummy = cur = ListNode(0)
    for v in values:
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next

def _build_tree(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue, i = [root], 1
    while queue and i < len(values):
        node = queue.pop(0)
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1
    return root

# Stops after 10000 nodes so a list accidentally turned into a loop still prints.
def _ser_list(head):
    out = []
    while head is not None and len(out) < 10000:
        out.append(head.val)
        head = head.next
    return out

def _ser_tree(root):
    out, queue = [], [root]
    while queue and len(out) < 100000:
        node = queue.pop(0)
        if node is None:
            out.append(None)
            continue
        out.append(node.val)
        queue.append(node.left)
        queue.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out
`;
const PYTHON_PRELUDE_LINES = PYTHON_PRELUDE.split('\n').length - 1;

// Python's json module reads a JSON string literal, and a JSON string literal
// is also a valid Python string literal, so the tests go in as one JSON text.
const pythonProgram = (problem, userCode, tests) => {
  const userLines = userCode.split(/\r?\n/).length;
  const kinds = problem.params.map((p) => p.type);
  const serializer = problem.returns === 'ListNode' ? '_ser_list' : problem.returns === 'TreeNode' ? '_ser_tree' : '';

  return `${PYTHON_PRELUDE}${userCode.replace(/\r\n/g, '\n')}

def _describe(error):
    # Points at the last line of the user's own code in the traceback.
    lines = [f.lineno - ${PYTHON_PRELUDE_LINES} for f in traceback.extract_tb(error.__traceback__)
             if ${PYTHON_PRELUDE_LINES} < f.lineno <= ${PYTHON_PRELUDE_LINES + userLines}]
    where = " (line %d)" % lines[-1] if lines else ""
    return "%s: %s%s" % (type(error).__name__, error, where)

def _build(value, kind):
    if kind == "ListNode":
        return _build_list(value)
    if kind == "TreeNode":
        return _build_tree(value)
    return value

def _main():
    tests = json.loads(${JSON.stringify(JSON.stringify(tests.map((t) => t.args)))})
    kinds = ${JSON.stringify(kinds)}
    for i, args in enumerate(tests):
        try:
            result = Solution().${problem.fn}(*[_build(a, k) for a, k in zip(args, kinds)])
            text = json.dumps(${serializer}(result), separators=(",", ":"), default=list)
            print("\\n@@R%d\\t%s" % (i, text))
        except Exception as error:
            print("\\n@@E%d\\t%s" % (i, _describe(error).replace("\\n", " ")))

_main()
`;
};

// "File "jdoodle.py", line 52" becomes "Line 3", the line in the editor.
const pythonErrorLines = (text) => text.replace(
  /File "[^"]*", line (\d+)/g,
  (_, n) => `Line ${Math.max(1, Number(n) - PYTHON_PRELUDE_LINES)}`,
);

// ---------- C++ ----------
// "#line 1" makes the compiler number the user's code from 1, so compile
// errors already point at the right line in the editor.
const CPP_PRELUDE = `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val; ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val; TreeNode *left, *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
`;

const CPP_HELPERS = `
static const long long NUL_ = LLONG_MIN;

ListNode* makeList_(vector<int> a) {
    ListNode dummy, *cur = &dummy;
    for (int v : a) { cur->next = new ListNode(v); cur = cur->next; }
    return dummy.next;
}

TreeNode* makeTree_(vector<long long> a) {
    if (a.empty() || a[0] == NUL_) return nullptr;
    TreeNode* root = new TreeNode((int) a[0]);
    queue<TreeNode*> q; q.push(root);
    size_t i = 1;
    while (!q.empty() && i < a.size()) {
        TreeNode* node = q.front(); q.pop();
        if (i < a.size() && a[i] != NUL_) { node->left = new TreeNode((int) a[i]); q.push(node->left); }
        i++;
        if (i < a.size() && a[i] != NUL_) { node->right = new TreeNode((int) a[i]); q.push(node->right); }
        i++;
    }
    return root;
}

// Turns the return value into JSON, one overload per type.
string ser(int v) { return to_string(v); }
string ser(long long v) { return to_string(v); }
string ser(bool v) { return v ? "true" : "false"; }
string ser(const string& s) {
    string out = "\\"";
    for (unsigned char c : s) {
        if (c == '"' || c == '\\\\') { out += '\\\\'; out += (char) c; }
        else if (c < 32) { char buf[8]; snprintf(buf, sizeof buf, "\\\\u%04x", c); out += buf; }
        else out += (char) c;
    }
    return out + "\\"";
}
string ser(char c) { return ser(string(1, c)); }
template <typename T> string ser(const vector<T>& v) {
    string out = "[";
    for (size_t i = 0; i < v.size(); i++) { if (i) out += ","; out += ser(v[i]); }
    return out + "]";
}
// Stops after 10000 nodes so a list accidentally turned into a loop still prints.
string ser(ListNode* head) {
    string out = "[";
    for (int n = 0; head && n < 10000; head = head->next, n++) { if (n) out += ","; out += to_string(head->val); }
    return out + "]";
}
string ser(TreeNode* root) {
    vector<string> out;
    queue<TreeNode*> q; q.push(root);
    while (!q.empty() && out.size() < 100000) {
        TreeNode* node = q.front(); q.pop();
        if (!node) { out.push_back("null"); continue; }
        out.push_back(to_string(node->val));
        q.push(node->left); q.push(node->right);
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    string s = "[";
    for (size_t i = 0; i < out.size(); i++) { if (i) s += ","; s += out[i]; }
    return s + "]";
}
`;

// A JSON string literal is also a valid C++ string literal for this text.
const cppChar = (c) => (c === "'" || c === '\\' ? `'\\${c}'` : `'${c}'`);
const cppInt = (v) => (v === -2147483648 ? 'INT_MIN' : String(v));
const cppLiteral = (value, type) => {
  switch (type) {
    case 'int': return cppInt(value);
    case 'boolean': return String(value);
    case 'string': return `string(${str(value)})`;
    case 'int[]':
    case 'list<int>':
      return `{${value.map(cppInt).join(', ')}}`;
    case 'int[][]':
    case 'list<list<int>>':
      return `{${value.map((row) => `{${row.map(cppInt).join(', ')}}`).join(', ')}}`;
    case 'string[]':
    case 'list<string>':
      return `{${value.map(str).join(', ')}}`;
    case 'list<list<string>>':
      return `{${value.map((row) => `{${row.map(str).join(', ')}}`).join(', ')}}`;
    case 'char[][]':
      return `{${value.map((row) => `{${row.map(cppChar).join(', ')}}`).join(', ')}}`;
    case 'ListNode':
      return `makeList_({${value.join(', ')}})`;
    case 'TreeNode':
      return `makeTree_({${value.map((v) => (v === null ? 'NUL_' : v)).join(', ')}})`;
    default:
      throw new Error(`Unsupported type ${type}`);
  }
};

// Each test gets its own variables (the user may change them, since they are
// passed by reference) and its own Solution. endl flushes after every result,
// so the results printed before a crash are not lost.
const cppProgram = (problem, userCode, tests) => {
  const calls = tests.map((test, i) => {
    const vars = test.args
      .map((arg, j) => `${CPP_TYPES[problem.params[j].type]} a${j} = ${cppLiteral(arg, problem.params[j].type)};`)
      .join(' ');
    const args = test.args.map((_, j) => `a${j}`).join(', ');
    return `    {
        ${vars}
        try { Solution s; auto r = s.${problem.fn}(${args}); cout << "\\n${RESULT_MARK}${i}\\t" << ser(r) << endl; }
        catch (const exception& e) { cout << "\\n${ERROR_MARK}${i}\\t" << e.what() << endl; }
        catch (...) { cout << "\\n${ERROR_MARK}${i}\\tUnknown error" << endl; }
    }`;
  });

  return `${CPP_PRELUDE}
#line 1 "solution.cpp"
${userCode.replace(/\r\n/g, '\n')}
#line 1 "tests.cpp"
${CPP_HELPERS}
int main() {
${calls.join('\n')}
    return 0;
}
`;
};

// "solution.cpp:3:5: error: ..." becomes "Line 3:5: error: ...". Messages
// about the hidden test code lose the file name.
const cppErrorLines = (text) => text
  .replace(/\S*solution\.cpp: /g, '')
  .replace(/\S*solution\.cpp:(\d+):(\d+:)?/g, (_, line, col) => `Line ${line}${col ? `:${col}` : ':'}`)
  .replace(/\S*(tests|jdoodle|main|prog)\.cpp:\d+:(\d+:)?\s*/g, '');

// Some answers can come in any order (all subsets, groups of anagrams...).
// Both sides are put in a fixed order before comparing:
//   'unordered': the order of the outer list doesn't matter
//   'sets':      neither the outer list's order nor each inner list's order
const sortKey = (v) => JSON.stringify(v);
const normalize = (value, compare) => {
  if (!Array.isArray(value) || !compare) return value;
  let items = value;
  if (compare === 'sets') {
    items = items.map((inner) => (Array.isArray(inner) ? [...inner].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) : inner));
  }
  return [...items].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
};
const sameAnswer = (output, expected, compare) => JSON.stringify(normalize(output, compare)) === JSON.stringify(normalize(expected, compare));

// Reads the marked lines back. Tests with no line (the program crashed or ran
// out of time first) come back as not run.
const parseRunOutput = (stdout, tests, compare) => {
  const found = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^@@([RE])(\d+)\t(.*)$/);
    if (match) found.set(Number(match[2]), { kind: match[1], text: match[3] });
  }
  return tests.map((test, i) => {
    const entry = found.get(i);
    if (!entry) return { passed: false, error: 'Did not run' };
    if (entry.kind === 'E') return { passed: false, error: entry.text.trim() };
    let output;
    try {
      output = JSON.parse(entry.text);
    } catch {
      return { passed: false, error: 'Could not read the returned value' };
    }
    return { passed: sameAnswer(output, test.expected, compare), output };
  });
};

// Whatever the user printed themselves, without our result lines. Each result
// line starts with "\n" (in case the user's last print had no newline), which
// leaves blank lines behind, so those are dropped too.
const userOutput = (stdout) => stdout
  .split(/\r?\n/)
  .filter((l) => l.trim() !== '' && !/^@@[RE]\d+\t/.test(l))
  .join('\n')
  .trim()
  .slice(0, 2000);

module.exports = {
  starterCode, javaProgram, pythonProgram, pythonErrorLines, cppProgram, cppErrorLines,
  parseRunOutput, userOutput, sameAnswer, JAVA_TYPES,
};

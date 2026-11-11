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

const usesType = (problem, type) => problem.returns === type || problem.params.some((p) => p.type === type);

const JS_NODE_NOTES = {
  ListNode: '// ListNode is already defined: { val, next }. Create one with new ListNode(val).\n',
  TreeNode: '// TreeNode is already defined: { val, left, right }. Create one with new TreeNode(val).\n',
};
const JAVA_NODE_NOTES = {
  ListNode: '/*\n * ListNode is already defined for you:\n * class ListNode { int val; ListNode next; ListNode(int val) {...} }\n */\n',
  TreeNode: '/*\n * TreeNode is already defined for you:\n * class TreeNode { int val; TreeNode left, right; TreeNode(int val) {...} }\n */\n',
};

const starterCode = (problem) => {
  const names = problem.params.map((p) => p.name).join(', ');
  const javaParams = problem.params.map((p) => `${JAVA_TYPES[p.type]} ${p.name}`).join(', ');
  const nodeTypes = ['ListNode', 'TreeNode'].filter((t) => usesType(problem, t));
  return {
    javascript: `${nodeTypes.map((t) => JS_NODE_NOTES[t]).join('')}function ${problem.fn}(${names}) {\n  // Write your code here\n\n}\n`,
    java: `${nodeTypes.map((t) => JAVA_NODE_NOTES[t]).join('')}class Solution {\n    public ${JAVA_TYPES[problem.returns]} ${problem.fn}(${javaParams}) {\n        // Write your code here\n\n    }\n}\n`,
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
const parseJavaOutput = (stdout, tests, compare) => {
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

module.exports = { starterCode, javaProgram, parseJavaOutput, userOutput, sameAnswer, JAVA_TYPES };

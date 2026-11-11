// Builds code from a problem's function signature: the starter code users see
// in the editor, and the full Java program that runs a user's solution against
// the tests.

const JAVA_TYPES = {
  int: 'int',
  'int[]': 'int[]',
  string: 'String',
  'string[]': 'String[]',
  boolean: 'boolean',
};

const starterCode = (problem) => {
  const names = problem.params.map((p) => p.name).join(', ');
  const javaParams = problem.params.map((p) => `${JAVA_TYPES[p.type]} ${p.name}`).join(', ');
  return {
    javascript: `function ${problem.fn}(${names}) {\n  // Write your code here\n\n}\n`,
    java: `class Solution {\n    public ${JAVA_TYPES[problem.returns]} ${problem.fn}(${javaParams}) {\n        // Write your code here\n\n    }\n}\n`,
  };
};

// A JSON string literal is also a valid Java string literal for the plain text
// used in these tests (quotes, backslashes and \n are escaped the same way).
const javaLiteral = (value, type) => {
  switch (type) {
    case 'int':
    case 'boolean':
      return String(value);
    case 'string':
      return JSON.stringify(value);
    case 'int[]':
      return `new int[]{${value.join(', ')}}`;
    case 'string[]':
      return `new String[]{${value.map((s) => JSON.stringify(s)).join(', ')}}`;
    default:
      throw new Error(`Unsupported type ${type}`);
  }
};

// Each result is printed on its own line after a marker, so anything the user
// prints with System.out does not get mixed up with the results.
const RESULT_MARK = '@@R';
const ERROR_MARK = '@@E';

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
        if (o instanceof int[]) {
            int[] a = (int[]) o;
            StringBuilder b = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i]); }
            return b.append(']').toString();
        }
        if (o instanceof String[]) {
            String[] a = (String[]) o;
            StringBuilder b = new StringBuilder("[");
            for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i] == null ? "null" : q(a[i])); }
            return b.append(']').toString();
        }
        if (o instanceof String) return q((String) o);
        return String.valueOf(o);
    }
`;

// Judge0 saves Java code as Main.java, so the user's class must not be public,
// and their import lines have to come before any class. The imports are moved
// onto the first line and their own lines left blank, so a compile error's
// line number matches the line in the user's editor.
const javaProgram = (problem, userCode, tests) => {
  const isImport = (l) => /^\s*import\s+[\w.*]+\s*;\s*$/.test(l);
  const lines = userCode.split(/\r?\n/);
  const imports = lines.filter(isImport).map((l) => l.trim());
  const userLines = lines.map((l) => (isImport(l) ? '' : l));
  userLines[0] = ['import java.util.*;', ...imports, userLines[0]].join(' ');
  const body = userLines
    .join('\n')
    .replace(/\bpublic\s+(final\s+)?class\s+Solution\b/, 'class Solution');

  const calls = tests.map((test, i) => {
    const args = test.args.map((arg, j) => javaLiteral(arg, problem.params[j].type)).join(', ');
    return `        try { Object r = s.${problem.fn}(${args}); System.out.println("\\n${RESULT_MARK}${i}\\t" + ser(r)); }
        catch (Throwable e) { System.out.println("\\n${ERROR_MARK}${i}\\t" + e); }`;
  });

  return `${body}

public class Main {
${JAVA_HELPERS}
    public static void main(String[] args) {
        Solution s = new Solution();
${calls.join('\n')}
    }
}
`;
};

// Reads the marked lines back. Tests with no line (the program crashed or ran
// out of time first) come back as not run.
const parseJavaOutput = (stdout, tests) => {
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
    return { passed: JSON.stringify(output) === JSON.stringify(test.expected), output };
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

module.exports = { starterCode, javaProgram, parseJavaOutput, userOutput };

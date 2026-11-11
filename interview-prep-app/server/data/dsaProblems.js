// The DSA practice problems, one file per topic in ./dsa. They live in code
// rather than the database: they are fixed content, they change only with a
// deploy, and keeping them here means there is no seed step to forget.
//
// Each problem describes ONE function. `params` and `returns` use the types
// listed in utils/dsaCode.js, which is enough to build the starter code and
// the Java test program for every problem. `leetcode` is the slug of the same
// (or a very similar) problem on leetcode.com, or null if there isn't one.
// `compare` is set when the answer may come in any order.
//
// The first SAMPLE_COUNT tests are the examples shown on the page and used by
// "Run". "Submit" runs all of them.

const SAMPLE_COUNT = 2;

const TOPIC_FILES = [
  ['Arrays', require('./dsa/arrays')],
  ['Strings', require('./dsa/strings')],
  ['Hashing', require('./dsa/hashing')],
  ['Two Pointers', require('./dsa/twoPointers')],
  ['Sliding Window', require('./dsa/slidingWindow')],
  ['Stack & Queue', require('./dsa/stackQueue')],
  ['Binary Search', require('./dsa/binarySearch')],
  ['Linked List', require('./dsa/linkedList')],
  ['Recursion & Backtracking', require('./dsa/backtracking')],
  ['Trees', require('./dsa/trees')],
  ['Heap', require('./dsa/heap')],
  ['Graphs', require('./dsa/graphs')],
  ['Greedy & Intervals', require('./dsa/greedy')],
  ['Dynamic Programming', require('./dsa/dynamicProgramming')],
  ['Bit Manipulation', require('./dsa/bits')],
];

const TOPICS = TOPIC_FILES.map(([topic]) => topic);
const problems = TOPIC_FILES.flatMap(([topic, list]) => list.map((problem) => ({ ...problem, topic })));

module.exports = { problems, TOPICS, SAMPLE_COUNT };

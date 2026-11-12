// Checks the AI's skill lists against the resume text itself, so a skill the
// AI got wrong never reaches the user. The AI can say "Docker is missing" when
// the resume lists Docker, or "matched: MongoDB" when the resume never says it.

// Lowercase, and treat . - _ / as spaces: "Node.js" -> "node js".
const normalize = (text) => ` ${String(text || '').toLowerCase().replace(/[.\-_/]+/g, ' ').replace(/\s+/g, ' ')} `;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word search, so "Java" does not match inside "JavaScript". Symbols
// count as part of a word, so "C" does not match "C++" either.
const hasWord = (text, phrase) => (
  new RegExp(`(?<![a-z0-9+#])${escapeRegex(phrase)}(?![a-z0-9+#])`).test(text)
);

// True when the resume names the skill: "Node.js" also matches "NodeJS" or
// "node js", and "REST APIs" also matches "REST API".
const resumeMentions = (resumeText, skill) => {
  const text = normalize(resumeText);
  const phrase = normalize(skill).trim();
  if (!phrase) return false;
  const variants = [phrase, phrase.replace(/ /g, ''), phrase.replace(/s$/, '')];
  // "Express.js" also matches "Express". Not for Next/Nest, which are
  // everyday English words without the ".js".
  const withoutJs = phrase.replace(/ ?js$/, '');
  if (withoutJs !== phrase && !['next', 'nest'].includes(withoutJs)) variants.push(withoutJs);
  return variants.some((v) => v.length > 0 && hasWord(text, v));
};

// True when at least one main word of the skill is in the resume. Used before
// removing a skill the AI says is matched, so "REST APIs" is kept when the
// resume says "RESTful services" (a different wording, not a made-up skill).
const resumeMentionsAnyWord = (resumeText, skill) => {
  const text = normalize(resumeText);
  return normalize(skill).trim().split(' ')
    .filter((word) => word.length >= 3)
    .some((word) => hasWord(text, word) || hasWord(text, word.replace(/s$/, '')));
};

// Fixes the matched/missing lists:
// - a "missing" skill that the resume does name moves to matched
// - a "matched" skill that has no trace in the resume is dropped
const verifySkillLists = (resumeText, matched, missing) => {
  const seen = new Set();
  const key = (s) => normalize(s).trim();
  const fixedMatched = [];
  const fixedMissing = [];

  matched.forEach((skill) => {
    if (seen.has(key(skill))) return;
    if (resumeMentions(resumeText, skill) || resumeMentionsAnyWord(resumeText, skill)) {
      seen.add(key(skill));
      fixedMatched.push(skill);
    }
  });

  missing.forEach((skill) => {
    if (seen.has(key(skill))) return;
    seen.add(key(skill));
    (resumeMentions(resumeText, skill) ? fixedMatched : fixedMissing).push(skill);
  });

  return { matched: fixedMatched, missing: fixedMissing };
};

module.exports = { resumeMentions, verifySkillLists };

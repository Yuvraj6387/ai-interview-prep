const { GoogleGenerativeAI } = require('@google/generative-ai');

const extractJson = (response) => {
  const jsonStart = response.indexOf('{');
  const jsonEnd = response.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
    return JSON.parse(response.substring(jsonStart, jsonEnd + 1));
  }

  const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleanResponse);
};

// Overloaded/unavailable from either provider - worth trying a different one.
const isOverloadedError = (error) => /503|overloaded|high demand|UNAVAILABLE/i.test(error.message || '');
const isQuotaExceededError = (error) => /429|quota/i.test(error.message || '');
// The connection itself dropped (seen as "fetch failed" / ECONNRESET). The
// other provider is a different server, so it is worth trying.
const isNetworkError = (error) => /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up/i
  .test(`${error.message || ''} ${error.cause?.code || ''} ${error.cause?.message || ''}`);
const isTimeoutError = (error) => /abort|timeout/i.test(error.message || '') || error.name === 'AbortError';
// Groq refused this particular request (output failed its JSON check, or the prompt
// is over the free-tier token cap). Gemini has neither limit, so it can still answer.
const isGroqRejectedError = (error) => /Groq API error: (400|413)/.test(error.message || '');

// Every Gemini prompt in this file asks for a JSON object back, so we can ask the
// API for JSON directly instead of parsing it out of prose or markdown fences.
const JSON_GENERATION_CONFIG = {
  responseMimeType: 'application/json',
  maxOutputTokens: 4096,
};

// Tried in order, fastest first. The flash-lite tier answers these structured
// prompts in ~3s, while the full flash tier burns ~2000 "thinking" tokens before
// it starts writing (measured 41s on a resume) and is frequently 503 on the free
// tier, so it is not in the chain at all.
const GEMINI_JSON_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];

// Cap a single attempt so one stalled provider can't hold the request open, and
// cap the whole chain so falling through every provider still returns in bounded
// time. A healthy call lands in 2-9s, so 12s already means "this one is stuck".
const ATTEMPT_TIMEOUT_MS = 12000;
const TOTAL_DEADLINE_MS = 30000;
// Prompts that write a whole resume back (import, tailoring) take ~10s on a
// good day, so they get a longer leash than the short scoring prompts.
const LONG_ATTEMPT_TIMEOUT_MS = 25000;
const LONG_TOTAL_DEADLINE_MS = 45000;

const runJsonChain = async (providers, { long = false } = {}) => {
  const attemptTimeout = long ? LONG_ATTEMPT_TIMEOUT_MS : ATTEMPT_TIMEOUT_MS;
  const deadline = Date.now() + (long ? LONG_TOTAL_DEADLINE_MS : TOTAL_DEADLINE_MS);
  let sawQuotaError = false;
  let lastError;

  for (const { label, run } of providers) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    try {
      return await run(Math.min(attemptTimeout, remaining));
    } catch (error) {
      lastError = error;

      // Overloaded, rate-limited or stalled: the next provider has its own
      // capacity and quota, so move on instead of waiting this one out.
      if (isQuotaExceededError(error)) {
        sawQuotaError = true;
      } else if (!isOverloadedError(error) && !isTimeoutError(error) && !isGroqRejectedError(error) && !isNetworkError(error)) {
        throw error;
      }
      console.warn(`AI provider ${label} unavailable, falling back:`, error.message);
    }
  }

  if (sawQuotaError) {
    throw new Error('The AI service has hit its usage limit for now. Please try again in a little while.');
  }
  throw new Error(lastError && isTimeoutError(lastError)
    ? 'The AI took too long to respond. Please try again.'
    : 'The AI service is busy right now. Please try again in a moment.');
};

const formatResumeContext = (resumeContext) => resumeContext
  ? `Candidate resume - Skills: ${(resumeContext.technicalSkills || []).join(', ') || 'n/a'}. Projects: ${(resumeContext.projects || []).join(', ') || 'n/a'}. Best-fit role: ${resumeContext.suggestedRole || 'n/a'}.
Ground your questions in THIS resume: ask about the specific skills and projects listed above instead of generic role trivia, whenever possible.`
  : '';

const formatJobContext = (jobContext) => jobContext
  ? `Target job${jobContext.title ? ` - ${jobContext.title}` : ''}. Skills this job requires: ${(jobContext.skills || []).join(', ') || 'n/a'}. Topics its interview covers: ${(jobContext.topics || []).join(', ') || 'n/a'}.
This interview is practice for THIS job: prioritise what it requires, especially skills the candidate may be missing.`
  : '';

const QUESTION_STYLE_RULE = 'Keep it SHORT and natural: one focused question, a single sentence, phrased the way a real interviewer would actually say it out loud. Write it as a direct question that ends with a question mark, not a command like "Explain..." or "Describe...". Do not write long, multi-part, or compound questions.';

const QUESTION_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const formatTurnsForPrompt = (turns) => {
  if (!turns || turns.length === 0) return '(This is the first question)';

  return turns.map((turn, i) => {
    const answer = turn.skipped ? '[Candidate skipped this question]' : (turn.answerText || '(no answer)');
    const evalLine = turn.evaluation
      ? `Evaluation: ${turn.evaluation.isWeak ? 'weak/unclear answer' : 'solid answer'} - ${turn.evaluation.feedback || ''}`
      : '';
    return `Q${i + 1} (${turn.isFollowUp ? 'follow-up' : 'fresh question'}): ${turn.questionText}\nA${i + 1}: ${answer}\n${evalLine}`;
  }).join('\n\n');
};

// The prompt tells the AI never to invent metrics, but models still slip one in
// sometimes. Any number in the rewrite that was not in the original bullet is
// swapped for a <X> placeholder, so a made-up figure never reaches the resume.
// Numbers inside names like "ES6" or "S3" are left alone.
const STANDALONE_NUMBER = /(?<![A-Za-z0-9<])\d+(?:[.,]\d+)?(?![A-Za-z0-9>])/g;
// "AWS (EC2, S3), Docker" -> ["AWS (EC2, S3)", "Docker"]: commas inside brackets don't split.
const splitSkills = (items) => (items || '').split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean);

const replaceInventedNumbers = (rewrite, original) => {
  const allowed = new Set(original.match(STANDALONE_NUMBER) || []);
  return rewrite.replace(STANDALONE_NUMBER, (num) => (allowed.has(num) ? num : '<X>'));
};

class AIService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    if (!this.apiKey) {
      throw new Error('Missing GROQ_API_KEY in server environment');
    }

    this.geminiApiKey = process.env.GEMINI_API_KEY;
    if (this.geminiApiKey) {
      this.gemini = new GoogleGenerativeAI(this.geminiApiKey);
    }
  }

  async sendRequest(prompt, { maxTokens = 512, jsonMode = false, timeout, reasoningEffort } = {}) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: timeout ? AbortSignal.timeout(timeout) : undefined,
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    return data.choices?.[0]?.message?.content || JSON.stringify(data);
  }

  async generateInterviewQuestions(targetRole, experience, topics) {
    const topicsList = Array.isArray(topics) ? topics.join(', ') : topics;
    const prompt = `You are a senior interviewer preparing questions for a real ${targetRole} interview. The candidate has ${experience} years of experience. Topics to cover: ${topicsList}.

Write exactly 5 questions:
- ${QUESTION_STYLE_RULE}
- Keep each one under 25 words, in plain text with no markdown or backticks.
- Spread them across the topics, and mix concepts, practical scenarios and one problem-solving question.
- Order them from easiest to hardest: 2 Easy, 2 Medium, 1 Hard, pitched for this experience level.

Return ONLY a valid JSON array of objects, each with a "question" and a "difficulty" ("Easy", "Medium" or "Hard"). No other text or markdown formatting. Example: [{"question": "How would you...?", "difficulty": "Easy"}]`;

    try {
      // The model spends up to ~300 tokens reasoning before it writes the list,
      // so 512 left too little room and could cut the JSON off mid-array.
      const response = await this.sendRequest(prompt, { maxTokens: 1024 });

      // Extract just the JSON array from the response in case there is extra text
      const jsonStart = response.indexOf('[');
      const jsonEnd = response.lastIndexOf(']');

      const questions = jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart
        ? JSON.parse(response.substring(jsonStart, jsonEnd + 1))
        : JSON.parse(response.replace(/```json\n?|\n?```/g, '').trim());

      return questions
        .filter((q) => typeof q.question === 'string' && q.question.trim())
        .map((q) => ({
          // The model still slips in markdown code ticks now and then; the card shows plain text.
          question: q.question.replace(/`/g, '').trim(),
          difficulty: QUESTION_DIFFICULTIES.includes(q.difficulty) ? q.difficulty : undefined,
        }));
    } catch (error) {
      console.error('Error in generateInterviewQuestions:', error);
      throw error;
    }
  }

  async generateExplanation(questionText, targetRole, topics) {
    const topicsList = Array.isArray(topics) ? topics.join(', ') : topics;
    const prompt = `Act as an expert technical interviewer. Provide a detailed, clear, and comprehensive explanation for the following interview question asked to a ${targetRole} with focus on ${topicsList}.
    
Question: "${questionText}"

Include in your explanation:
1. The core concept being tested
2. A clear, accurate answer
3. An example if applicable
4. Common pitfalls or mistakes candidates make
Keep the whole explanation under 400 words. Do not repeat the question.
Format the output in clear Markdown.`;

    try {
      return await this.sendRequest(prompt, { maxTokens: 2048 });
    } catch (error) {
      console.error('Error in generateExplanation:', error);
      throw error;
    }
  }

  async generateJobDescription(targetRole, experience, topics) {
    const topicsList = Array.isArray(topics) ? topics.join(', ') : topics;
    const prompt = `Write a short, natural 2-3 sentence description of interview preparation focus for a ${targetRole} role with ${experience} years of experience, covering these topics: ${topicsList}. Write it as if the candidate is describing what they want to prepare for. Return ONLY the description text - no quotes, no markdown, no extra commentary.`;

    try {
      const response = await this.sendRequest(prompt);
      return response.trim().replace(/^["']|["']$/g, '');
    } catch (error) {
      console.error('Error in generateJobDescription:', error);
      throw error;
    }
  }

  generateJson(prompt, { maxTokens = 2048, long = false, reasoningEffort } = {}) {
    // Groq goes first: it answers in 1-4s, while the Gemini free tier often stalls
    // or returns 503, which cost 17-25s per request before falling through to Groq.
    const providers = [{
      label: 'groq',
      run: (timeout) => this.sendRequest(prompt, { maxTokens, jsonMode: true, timeout, reasoningEffort }),
    }];

    // Different provider, different outage and quota: when Groq is saturated
    // this is what keeps the request succeeding instead of erroring out.
    if (this.gemini) {
      for (const name of GEMINI_JSON_MODELS) {
        providers.push({
          label: `gemini/${name}`,
          run: async (timeout) => {
            const model = this.gemini.getGenerativeModel(
              { model: name, generationConfig: JSON_GENERATION_CONFIG },
              { timeout }
            );
            const result = await model.generateContent(prompt);
            return result.response.text();
          },
        });
      }
    }

    return runJsonChain(providers, { long });
  }

  async analyzeResume(resumeText) {
    const prompt = `Act as an expert technical recruiter. Analyze the following resume text and return ONLY a valid JSON object (no markdown, no extra text) with this exact shape:
{
  "score": <number 0-100, overall resume quality/strength>,
  "technicalSkills": [<technical skills found, e.g. "React", "Node.js">],
  "softSkills": [<soft skills found, e.g. "Communication", "Teamwork">],
  "missingSkills": [<important skills for this candidate's apparent target role that are missing or weak>],
  "education": [<education entries as short strings>],
  "projects": [<project names/short descriptions found>],
  "experience": [<work experience entries as short strings>],
  "strengths": [<2-5 short strengths of this resume>],
  "improvements": [<2-5 short, actionable improvement suggestions>],
  "suggestedRole": "<single best-fit job title for this candidate, e.g. 'Frontend Developer'>",
  "suggestedTopics": [<5-8 topics/skills to focus interview prep on, based on this resume. Each MUST be a short 1-3 word keyword/phrase with NO commas inside it, e.g. "React Hooks", "Node.js", "MongoDB Indexing", "REST APIs", "JWT Auth">]
}

Resume text:
"""
${resumeText}
"""`;

    try {
      const response = await this.generateJson(prompt);
      const analysis = extractJson(response);

      return {
        score: Number(analysis.score) || 0,
        technicalSkills: Array.isArray(analysis.technicalSkills) ? analysis.technicalSkills : [],
        softSkills: Array.isArray(analysis.softSkills) ? analysis.softSkills : [],
        missingSkills: Array.isArray(analysis.missingSkills) ? analysis.missingSkills : [],
        education: Array.isArray(analysis.education) ? analysis.education : [],
        projects: Array.isArray(analysis.projects) ? analysis.projects : [],
        experience: Array.isArray(analysis.experience) ? analysis.experience : [],
        strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
        improvements: Array.isArray(analysis.improvements) ? analysis.improvements : [],
        suggestedRole: typeof analysis.suggestedRole === 'string' ? analysis.suggestedRole : '',
        suggestedTopics: Array.isArray(analysis.suggestedTopics) ? analysis.suggestedTopics : [],
      };
    } catch (error) {
      console.error('Error in analyzeResume:', error);
      throw error;
    }
  }

  async matchResumeToJob(resumeText, jobDescription) {
    const prompt = `Act as an expert technical recruiter. Compare this candidate's resume with the job description and return ONLY a valid JSON object (no markdown, no extra text) with this exact shape:
{
  "matchScore": <number 0-100, how well the resume fits this job>,
  "jobTitle": "<the job title from the description, e.g. 'Frontend Developer'>",
  "summary": "<2 short sentences on the overall fit>",
  "sectionScores": {
    "keywords": <0-100, how many of the job's important keywords/tools appear in the resume>,
    "jobTitle": <0-100, how close the candidate's titles/target role are to this job title>,
    "qualifications": <0-100, how well education, certifications and required years of experience fit>,
    "responsibilities": <0-100, how well past work/projects show the duties this job describes>
  },
  "matchedSkills": [<skills the job asks for that the resume clearly shows>],
  "missingSkills": [<skills the job asks for that the resume lacks or shows only weakly>],
  "experienceGaps": [<1-4 short gaps between the experience the job wants and what the resume shows, e.g. "Job wants 2+ years with Node.js; resume shows one internship". Empty array if none>],
  "skillGap": [<the 5-6 most important skills for this job, each { "skill": "<1-3 words>", "current": <0-100, the level the resume shows>, "target": <0-100, the level the job needs> }>],
  "learningPlan": [<for the 2-3 biggest missing skills, each { "skill": "<skill>", "topics": [<2-4 specific topics to study>], "project": "<one small portfolio project that would prove this skill>", "resource": "<one well-known free learning resource, e.g. the official docs or freeCodeCamp. Do not invent course names>" }>],
  "suggestions": [<3-5 short, actionable ways to tailor the resume to this job. Never suggest inventing experience>],
  "interviewTopics": [<4-6 topics this job's interview is likely to cover, 1-3 words each>]
}

Resume:
"""
${resumeText}
"""

Job description:
"""
${jobDescription}
"""`;

    try {
      // This answer is larger than the others, so give it more room. Prompt plus
      // 3000 still stays under Groq's 8000 tokens-per-minute free-tier cap.
      const response = await this.generateJson(prompt, { maxTokens: 3000 });
      const parsed = extractJson(response);
      const list = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);
      const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
      const sections = parsed.sectionScores || {};

      return {
        matchScore: clamp(parsed.matchScore),
        jobTitle: typeof parsed.jobTitle === 'string' ? parsed.jobTitle : '',
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        sectionScores: {
          keywords: clamp(sections.keywords),
          jobTitle: clamp(sections.jobTitle),
          qualifications: clamp(sections.qualifications),
          responsibilities: clamp(sections.responsibilities),
        },
        matchedSkills: list(parsed.matchedSkills),
        missingSkills: list(parsed.missingSkills),
        experienceGaps: list(parsed.experienceGaps),
        skillGap: (Array.isArray(parsed.skillGap) ? parsed.skillGap : [])
          .filter((s) => s && typeof s.skill === 'string')
          .slice(0, 6)
          .map((s) => ({ skill: s.skill, current: clamp(s.current), target: clamp(s.target) })),
        learningPlan: (Array.isArray(parsed.learningPlan) ? parsed.learningPlan : [])
          .filter((p) => p && typeof p.skill === 'string')
          .slice(0, 3)
          .map((p) => ({
            skill: p.skill,
            topics: list(p.topics),
            project: typeof p.project === 'string' ? p.project : '',
            resource: typeof p.resource === 'string' ? p.resource : '',
          })),
        suggestions: list(parsed.suggestions),
        interviewTopics: list(parsed.interviewTopics),
      };
    } catch (error) {
      console.error('Error in matchResumeToJob:', error);
      throw error;
    }
  }

  // The AI half of the ATS scan: judges the content of each section and lists
  // keywords an ATS would search for. Formatting is checked by atsChecks.js instead.
  async atsReview(resumeText, targetRole) {
    const prompt = `Act as an ATS (applicant tracking system) expert and technical recruiter. Review this resume for a "${targetRole}" role and return ONLY a valid JSON object (no markdown, no extra text) with this exact shape:
{
  "contentScore": <0-100, how well the resume content would rank in an ATS search for this role>,
  "missingKeywords": [<5-10 keywords/tools a recruiter would search for this role that are NOT in the resume, 1-3 words each>],
  "presentKeywords": [<5-10 important keywords for this role that ARE in the resume>],
  "sections": [<one entry for each of: Summary, Experience, Projects, Skills, Education. Each { "name": "<section>", "status": "good" | "improve" | "missing", "feedback": "<one short, specific sentence>" }>],
  "topFixes": [<3 most important, specific changes to make first>]
}
Only judge what is actually written. Never suggest inventing experience, numbers or achievements.

Resume:
"""
${resumeText}
"""`;

    try {
      const response = await this.generateJson(prompt);
      const parsed = extractJson(response);
      const list = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);
      const STATUSES = ['good', 'improve', 'missing'];

      return {
        contentScore: Math.max(0, Math.min(100, Math.round(Number(parsed.contentScore) || 0))),
        missingKeywords: list(parsed.missingKeywords),
        presentKeywords: list(parsed.presentKeywords),
        sections: (Array.isArray(parsed.sections) ? parsed.sections : [])
          .filter((s) => s && typeof s.name === 'string')
          .map((s) => ({
            name: s.name,
            status: STATUSES.includes(s.status) ? s.status : 'improve',
            feedback: typeof s.feedback === 'string' ? s.feedback : '',
          })),
        topFixes: list(parsed.topFixes),
      };
    } catch (error) {
      console.error('Error in atsReview:', error);
      throw error;
    }
  }

  async rewriteBullet(bullet, targetRole) {
    const prompt = `You are an expert resume writer. Rewrite this resume bullet point${targetRole ? ` for a ${targetRole} role` : ''} in 3 different styles.

Original bullet: "${bullet}"

Rules:
- Start every version with a strong action verb (e.g. Built, Developed, Optimized, Led, Integrated).
- Keep each version to one sentence, under 30 words, plain text.
- NEVER invent achievements, numbers or metrics that are not in the original. Only clarify and strengthen what is already there.
- Only name tools, libraries, algorithms or techniques that appear in the original. If the original names none, write "<tool>" as a placeholder instead of guessing one, and say in the tips which detail to add.
- If a number would make it stronger but the original has none, put a placeholder like <X> or <X%> for the candidate to fill in with their real figure.

Return ONLY a valid JSON object with this exact shape:
{ "variants": [
  { "style": "Concise", "text": "<short and punchy>" },
  { "style": "Impact-focused", "text": "<leads with the result or benefit>" },
  { "style": "Technical", "text": "<highlights the tools and how it was built>" }
], "tips": [<1-3 short tips to make this bullet stronger, e.g. what number to measure>] }`;

    try {
      const response = await this.generateJson(prompt, { maxTokens: 1024 });
      const parsed = extractJson(response);

      return {
        variants: (Array.isArray(parsed.variants) ? parsed.variants : [])
          .filter((v) => v && typeof v.text === 'string' && v.text.trim())
          .map((v) => ({
            style: typeof v.style === 'string' ? v.style : 'Rewrite',
            text: replaceInventedNumbers(v.text.trim(), bullet),
          })),
        tips: Array.isArray(parsed.tips) ? parsed.tips.filter((t) => typeof t === 'string') : [],
      };
    } catch (error) {
      console.error('Error in rewriteBullet:', error);
      throw error;
    }
  }

  // Resume Builder "Magic import": copies the uploaded resume into editable
  // sections. It only reorganises the text, it does not rewrite or add anything.
  async parseResumeToSections(resumeText) {
    const prompt = `Split this resume text into structured sections. Copy the candidate's own wording; do NOT rewrite, improve, summarise or add anything that is not in the text. Leave a field as "" or [] if the resume does not have it.

Return ONLY a valid JSON object with this exact shape:
{
  "name": "", "headline": "<job title line under the name, if any>", "email": "", "phone": "", "location": "",
  "links": [<LinkedIn/GitHub/portfolio URLs or labels>],
  "summary": "<the summary/objective paragraph, if any>",
  "experience": [{ "role": "", "company": "", "location": "", "start": "", "end": "", "bullets": [<one string per bullet>] }],
  "projects": [{ "name": "", "tech": "<technologies, comma-separated>", "link": "", "bullets": [] }],
  "education": [{ "degree": "", "school": "", "location": "", "year": "", "details": "<grade/CGPA etc.>" }],
  "skills": [{ "category": "<e.g. Languages, Frontend>", "items": "<comma-separated skills>" }],
  "certifications": [<one string each>]
}

Resume text:
"""
${resumeText}
"""`;

    try {
      // Long answer: the whole resume comes back as JSON.
      const response = await this.generateJson(prompt, { maxTokens: 3500, long: true });
      const parsed = extractJson(response);
      const text = (value) => (typeof value === 'string' ? value.trim() : '');
      const list = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : []);
      const objects = (value) => (Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []);

      return {
        name: text(parsed.name),
        headline: text(parsed.headline),
        email: text(parsed.email),
        phone: text(parsed.phone),
        location: text(parsed.location),
        links: list(parsed.links),
        summary: text(parsed.summary),
        experience: objects(parsed.experience).map((e) => ({
          role: text(e.role), company: text(e.company), location: text(e.location),
          start: text(e.start), end: text(e.end), bullets: list(e.bullets),
        })),
        projects: objects(parsed.projects).map((p) => ({
          name: text(p.name), tech: text(p.tech), link: text(p.link), bullets: list(p.bullets),
        })),
        education: objects(parsed.education).map((e) => ({
          degree: text(e.degree), school: text(e.school), location: text(e.location),
          year: text(e.year), details: text(e.details),
        })),
        skills: objects(parsed.skills).map((s) => ({ category: text(s.category), items: text(s.items) })),
        certifications: list(parsed.certifications),
      };
    } catch (error) {
      console.error('Error in parseResumeToSections:', error);
      throw error;
    }
  }

  async generateResumeSummary(content, targetRole) {
    // Only the facts the summary may draw on, kept short to save tokens.
    const facts = {
      headline: content.headline || '',
      experience: (content.experience || []).map((e) => `${e.role} at ${e.company} (${e.start}-${e.end}): ${(e.bullets || []).join(' ')}`),
      projects: (content.projects || []).map((p) => `${p.name} [${p.tech}]: ${(p.bullets || []).join(' ')}`),
      education: (content.education || []).map((e) => `${e.degree}, ${e.school} ${e.year}`),
      skills: (content.skills || []).map((s) => `${s.category}: ${s.items}`),
    };
    const factsText = JSON.stringify(facts).slice(0, 5000);

    const prompt = `Write a professional resume summary${targetRole ? ` for a ${targetRole} role` : ''} using ONLY the facts below.

Facts:
${factsText}

Rules:
- 2-3 sentences, 40-60 words, third person without pronouns (e.g. "Full stack developer who...").
- Mention the strongest skills and what the candidate has actually built or done.
- NEVER invent years of experience, numbers, companies, tools or achievements that are not in the facts.
- Plain text, no buzzwords like "passionate" or "hardworking".

Return ONLY a valid JSON object: { "summary": "<the summary>" }`;

    try {
      const response = await this.generateJson(prompt, { maxTokens: 1024 });
      const parsed = extractJson(response);
      const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
      // Same guard as the bullet rewriter: a number not in the facts becomes <X>.
      return replaceInventedNumbers(summary, factsText);
    } catch (error) {
      console.error('Error in generateResumeSummary:', error);
      throw error;
    }
  }

  // Tailor a resume to one job description. The AI only returns the parts it is
  // allowed to change (summary, bullet wording, skill and project order); this
  // function copies them onto the original, so names, companies, dates and
  // education can never be altered, and no new skill can be added.
  async tailorResume(content, jobDescription) {
    const experience = content.experience || [];
    const projects = content.projects || [];
    const skillGroups = content.skills || [];
    const allSkills = skillGroups.flatMap((g) => splitSkills(g.items));

    const resumeForPrompt = {
      summary: content.summary || '',
      experience: experience.map((e, i) => ({ index: i, role: e.role, company: e.company, bullets: (e.bullets || []).filter(Boolean) })),
      projects: projects.map((p, i) => ({ index: i, name: p.name, tech: p.tech, bullets: (p.bullets || []).filter(Boolean) })),
      skills: allSkills,
    };
    const resumeText = JSON.stringify(resumeForPrompt);
    // What the number guard checks against: the candidate's real text only, not
    // the index numbers added above for the prompt (those let "1+ years" slip by).
    const originalText = [
      content.summary, content.headline,
      ...experience.flatMap((e) => [e.role, e.company, e.start, e.end, ...(e.bullets || [])]),
      ...projects.flatMap((p) => [p.name, p.tech, ...(p.bullets || [])]),
      ...allSkills,
    ].filter(Boolean).join(' ');

    const prompt = `You are an expert resume writer. Tailor this candidate's resume to the job description below, so it ranks well in an ATS for this job, WITHOUT inventing anything.

Rules:
- Rewrite the summary (2-3 sentences, max 60 words) to lead with what this job wants that the candidate truly has. Do NOT state years of experience unless the resume itself states them; an internship is not a year of experience.
- Rephrase existing bullets to use the job's wording and keywords ONLY where the bullet already shows that skill. Keep every fact, tool and number exactly as it is. Never add tools, numbers, achievements or responsibilities the bullet does not already state. Keep each entry's bullet count the same.
- "skillPriority": skills copied exactly from the candidate's skill list, most relevant to this job first. Do not add skills that are not in the list.
- "projectOrder": project indexes, most relevant to this job first.
- "missingSkills": important skills the job asks for that the resume does not show. These are NOT added to the resume; the candidate decides.

Return ONLY a valid JSON object with this exact shape:
{
  "jobTitle": "<job title from the description>",
  "company": "<company name if the description gives one, else \\"\\">",
  "summary": "<new summary>",
  "experience": [{ "index": <number>, "bullets": [<rewritten bullets>] }],
  "projects": [{ "index": <number>, "bullets": [<rewritten bullets>] }],
  "skillPriority": [<skills from the list>],
  "projectOrder": [<indexes>],
  "changes": [<3-5 short notes on what you changed and why>],
  "missingSkills": [<skills>]
}

Candidate resume:
${resumeText}

Job description:
"""
${jobDescription}
"""`;

    try {
      const response = await this.generateJson(prompt, { maxTokens: 3500, long: true });
      const parsed = extractJson(response);
      const text = (value) => (typeof value === 'string' ? value.trim() : '');
      const list = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim()) : []);
      // Any number the AI wrote that isn't somewhere in the original becomes <X>.
      const guard = (value) => replaceInventedNumbers(value, originalText);

      const rewrittenBullets = (items, source) => {
        const byIndex = new Map((Array.isArray(items) ? items : [])
          .filter((item) => item && Number.isInteger(item.index))
          .map((item) => [item.index, list(item.bullets).map(guard)]));
        return source.map((entry, i) => {
          const bullets = byIndex.get(i);
          return { ...entry, bullets: bullets && bullets.length ? bullets : entry.bullets };
        });
      };

      // Reorder skills inside each group, and the groups themselves, by the
      // AI's priority list. Unknown skills in that list are simply ignored.
      const rank = new Map(list(parsed.skillPriority).map((s, i) => [s.toLowerCase(), i]));
      const rankOf = (skill) => (rank.has(skill.toLowerCase()) ? rank.get(skill.toLowerCase()) : Infinity);
      const skills = skillGroups
        .map((group) => {
          const items = splitSkills(group.items).sort((a, b) => rankOf(a) - rankOf(b));
          return { category: group.category, items: items.join(', '), best: Math.min(Infinity, ...items.map(rankOf)) };
        })
        .sort((a, b) => a.best - b.best)
        .map(({ category, items }) => ({ category, items }));

      // Projects in the suggested order; any the AI left out keep their place at the end.
      const tailoredProjects = rewrittenBullets(parsed.projects, projects);
      const order = [...new Set((Array.isArray(parsed.projectOrder) ? parsed.projectOrder : [])
        .filter((i) => Number.isInteger(i) && i >= 0 && i < projects.length))];
      projects.forEach((_, i) => { if (!order.includes(i)) order.push(i); });

      const summary = guard(text(parsed.summary));

      return {
        content: {
          ...content,
          summary: summary || content.summary,
          experience: rewrittenBullets(parsed.experience, experience),
          projects: order.map((i) => tailoredProjects[i]),
          skills,
        },
        tailoredFor: {
          jobTitle: text(parsed.jobTitle),
          company: text(parsed.company),
          changes: list(parsed.changes),
          missingSkills: list(parsed.missingSkills),
        },
      };
    } catch (error) {
      console.error('Error in tailorResume:', error);
      throw error;
    }
  }

  async generateNextQuestion({ config, resumeContext, jobContext, turns }) {
    const { role, experienceLevel, interviewType, difficulty, numQuestions } = config;

    const prompt = `You are conducting a live ${interviewType} interview for a ${role} candidate with ${experienceLevel} years of experience. Overall difficulty target: ${difficulty} (gradually escalate as the interview progresses).
${formatResumeContext(resumeContext)}
${formatJobContext(jobContext)}

Interview so far:
${formatTurnsForPrompt(turns)}

Decide the next question (this will be question ${turns.length + 1} of ${numQuestions} total):
- If the most recent answer's evaluation says it was weak/unclear, ask a clarifying FOLLOW-UP question that digs into that specific gap, referencing what they said.
- Otherwise, ask a NEW question on a different topic than anything above, at a difficulty slightly higher than the previous question, staying relevant to the role and interview type.
- Never repeat a question or topic already covered above.
- ${QUESTION_STYLE_RULE}

Return ONLY a valid JSON object with this exact shape: { "questionText": "<the question>", "isFollowUp": true|false }`;

    try {
      const response = await this.generateJson(prompt);
      const parsed = extractJson(response);

      return {
        questionText: typeof parsed.questionText === 'string' ? parsed.questionText : 'Tell me about a challenging project you worked on.',
        isFollowUp: Boolean(parsed.isFollowUp),
      };
    } catch (error) {
      console.error('Error in generateNextQuestion:', error);
      throw error;
    }
  }

  async evaluateAnswer({ questionText, answerText, config }) {
    const { role, experienceLevel, interviewType, difficulty } = config;

    const prompt = `You are an expert interviewer evaluating one candidate answer in a ${interviewType} interview for a ${role} role (${experienceLevel} years experience level, ${difficulty} difficulty).

Question: "${questionText}"
Candidate's answer: "${answerText}"

Score the answer from 0-100 on each dimension: technicalAccuracy, communication, relevance, structure, confidence, problemSolving.
Also decide "isWeak": true if the answer is vague, incomplete, off-topic, or shows a misunderstanding that deserves a clarifying follow-up question; false if it's a solid, complete answer.
Give one short "feedback" sentence.

Return ONLY a valid JSON object with this exact shape:
{ "technicalAccuracy": <0-100>, "communication": <0-100>, "relevance": <0-100>, "structure": <0-100>, "confidence": <0-100>, "problemSolving": <0-100>, "isWeak": true|false, "feedback": "<one short sentence>" }`;

    try {
      const response = await this.generateJson(prompt);
      const parsed = extractJson(response);

      const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));

      return {
        technicalAccuracy: clamp(parsed.technicalAccuracy),
        communication: clamp(parsed.communication),
        relevance: clamp(parsed.relevance),
        structure: clamp(parsed.structure),
        confidence: clamp(parsed.confidence),
        problemSolving: clamp(parsed.problemSolving),
        isWeak: Boolean(parsed.isWeak),
        feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
      };
    } catch (error) {
      console.error('Error in evaluateAnswer:', error);
      throw error;
    }
  }

  async evaluateAndGenerateNext({ config, resumeContext, jobContext, priorTurns, questionText, answerText, needsNextQuestion }) {
    const { role, experienceLevel, interviewType, difficulty, numQuestions } = config;

    const nextQuestionInstruction = needsNextQuestion
      ? `Decide the next question (question ${priorTurns.length + 2} of ${numQuestions} total): if isWeak, ask a clarifying FOLLOW-UP question that digs into that specific gap, referencing what they said. Otherwise, ask a NEW question on a different topic than anything above, at a difficulty slightly higher than the previous question, staying relevant to the role and interview type. Never repeat a question or topic already covered. ${QUESTION_STYLE_RULE}`
      : 'This was the final question of the interview - do NOT generate a next question, set "nextQuestion" to null.';

    const prompt = `You are conducting a live ${interviewType} interview for a ${role} candidate with ${experienceLevel} years of experience. Overall difficulty target: ${difficulty} (gradually escalate as the interview progresses).
${formatResumeContext(resumeContext)}
${formatJobContext(jobContext)}

Interview so far:
${formatTurnsForPrompt(priorTurns)}

The candidate was just asked:
"${questionText}"

Their answer:
"${answerText}"

Do two things:
1. Evaluate this answer: score technicalAccuracy, communication, relevance, structure, confidence, problemSolving (0-100 each), decide "isWeak" (true if vague, incomplete, off-topic, or shows a misunderstanding that deserves a clarifying follow-up), and give one short "feedback" sentence.
2. ${nextQuestionInstruction}

Return ONLY a valid JSON object with this exact shape:
{ "evaluation": { "technicalAccuracy": <0-100>, "communication": <0-100>, "relevance": <0-100>, "structure": <0-100>, "confidence": <0-100>, "problemSolving": <0-100>, "isWeak": true|false, "feedback": "<one short sentence>" }, "nextQuestion": ${needsNextQuestion ? '{ "questionText": "<the question>", "isFollowUp": true|false }' : 'null'} }`;

    try {
      const response = await this.generateJson(prompt);
      const parsed = extractJson(response);
      const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));

      const evaluation = {
        technicalAccuracy: clamp(parsed.evaluation?.technicalAccuracy),
        communication: clamp(parsed.evaluation?.communication),
        relevance: clamp(parsed.evaluation?.relevance),
        structure: clamp(parsed.evaluation?.structure),
        confidence: clamp(parsed.evaluation?.confidence),
        problemSolving: clamp(parsed.evaluation?.problemSolving),
        isWeak: Boolean(parsed.evaluation?.isWeak),
        feedback: typeof parsed.evaluation?.feedback === 'string' ? parsed.evaluation.feedback : '',
      };

      const nextQuestion = needsNextQuestion && parsed.nextQuestion
        ? {
            questionText: typeof parsed.nextQuestion.questionText === 'string'
              ? parsed.nextQuestion.questionText
              : 'Tell me about a challenging project you worked on.',
            isFollowUp: Boolean(parsed.nextQuestion.isFollowUp),
          }
        : null;

      return { evaluation, nextQuestion };
    } catch (error) {
      console.error('Error in evaluateAndGenerateNext:', error);
      throw error;
    }
  }

  async generateFinalReport({ config, turns }) {
    const { role, experienceLevel, interviewType, difficulty } = config;

    const prompt = `You are summarizing a completed ${interviewType} interview for a ${role} candidate (${experienceLevel} years experience, ${difficulty} difficulty).

Full transcript:
${formatTurnsForPrompt(turns)}

Based on the whole interview, provide:
- 2-5 short "strengths"
- 2-5 short, actionable "improvements"
- 3-6 "recommendedTopics" to study further
- 2-4 "recommendedPractice" next-step suggestions

Return ONLY a valid JSON object with this exact shape:
{ "strengths": [...], "improvements": [...], "recommendedTopics": [...], "recommendedPractice": [...] }`;

    try {
      const response = await this.generateJson(prompt);
      const parsed = extractJson(response);

      return {
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        recommendedTopics: Array.isArray(parsed.recommendedTopics) ? parsed.recommendedTopics : [],
        recommendedPractice: Array.isArray(parsed.recommendedPractice) ? parsed.recommendedPractice : [],
      };
    } catch (error) {
      console.error('Error in generateFinalReport:', error);
      throw error;
    }
  }

  async generateStudyPlan({ goal, level, duration, phases }) {
    const phaseGuide = {
      Easy: 'fundamentals and core concepts, explained simply; Easy interview questions',
      Medium: 'applying the concepts: common interview questions, small hands-on exercises; Medium questions',
      Strong: 'advanced topics, edge cases, trade-offs and full mock-interview practice; Hard questions',
    };
    const phaseLines = phases
      .map((p) => `- Days ${p.from}-${p.to}: ${p.name} phase - ${phaseGuide[p.name]}`)
      .join('\n');

    const prompt = `You are a coach writing a ${duration}-day interview preparation plan.

What the candidate wants to prepare for: "${goal}"
Their current level: ${level}

The plan has three phases that get harder:
${phaseLines}

Write exactly ${duration} days that build on each other, from basics to interview-ready. Cover the most important topics for this goal, in a sensible learning order. Make the last day a full revision and mock-interview day.

Each day has:
- "topic": 1-4 words
- "goal": one short sentence (max 15 words)
- "tasks": exactly 2 short study tasks (max 12 words each)
- "questions": exactly 2 interview practice questions on that topic, at the difficulty of that day's phase, each a single short sentence ending with "?"

Keep every string short. Return ONLY a valid JSON object with this exact shape:
{ "days": [ { "day": 1, "topic": "...", "goal": "...", "tasks": ["...", "..."], "questions": ["...", "..."] } ] }`;

    const clip = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
    const items = (list, max) => (Array.isArray(list) ? list : [])
      .map((text) => clip(text, max))
      .filter(Boolean)
      .slice(0, 3)
      .map((text) => ({ text, done: false }));

    try {
      // Low reasoning effort: by default Groq's model spent ~4300 tokens "thinking"
      // and ran out of room after 14 days. On low it writes all 30 in ~1500 tokens,
      // which also keeps the request under the free tier's 8000 tokens-per-minute cap.
      const response = await this.generateJson(prompt, {
        maxTokens: duration === 30 ? 4000 : 2500,
        long: duration === 30,
        reasoningEffort: 'low',
      });
      const parsed = extractJson(response);
      const days = (Array.isArray(parsed.days) ? parsed.days : [])
        .filter((d) => d && clip(d.topic, 60))
        .slice(0, duration)
        .map((d, i) => ({
          day: i + 1,
          topic: clip(d.topic, 60),
          goal: clip(d.goal, 160),
          tasks: items(d.tasks, 160),
          questions: items(d.questions, 200),
        }));

      if (days.length < duration) {
        throw new Error('The AI returned an incomplete plan. Please try again.');
      }
      return days;
    } catch (error) {
      console.error('Error in generateStudyPlan:', error);
      throw error;
    }
  }
}

module.exports = new AIService();

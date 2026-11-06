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

const runJsonChain = async (providers) => {
  const deadline = Date.now() + TOTAL_DEADLINE_MS;
  let sawQuotaError = false;
  let lastError;

  for (const { label, run } of providers) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    try {
      return await run(Math.min(ATTEMPT_TIMEOUT_MS, remaining));
    } catch (error) {
      lastError = error;

      // Overloaded, rate-limited or stalled: the next provider has its own
      // capacity and quota, so move on instead of waiting this one out.
      if (isQuotaExceededError(error)) {
        sawQuotaError = true;
      } else if (!isOverloadedError(error) && !isTimeoutError(error) && !isGroqRejectedError(error)) {
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

  async sendRequest(prompt, { maxTokens = 512, jsonMode = false, timeout } = {}) {
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

  generateJson(prompt) {
    // Groq goes first: it answers in 1-4s, while the Gemini free tier often stalls
    // or returns 503, which cost 17-25s per request before falling through to Groq.
    const providers = [{
      label: 'groq',
      run: (timeout) => this.sendRequest(prompt, { maxTokens: 2048, jsonMode: true, timeout }),
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

    return runJsonChain(providers);
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
  "matchedSkills": [<skills the job asks for that the resume clearly shows>],
  "missingSkills": [<skills the job asks for that the resume lacks or shows only weakly>],
  "suggestions": [<3-5 short, actionable ways to close the gaps or tailor the resume to this job>],
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
      const response = await this.generateJson(prompt);
      const parsed = extractJson(response);
      const list = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []);

      return {
        matchScore: Math.max(0, Math.min(100, Number(parsed.matchScore) || 0)),
        jobTitle: typeof parsed.jobTitle === 'string' ? parsed.jobTitle : '',
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        matchedSkills: list(parsed.matchedSkills),
        missingSkills: list(parsed.missingSkills),
        suggestions: list(parsed.suggestions),
        interviewTopics: list(parsed.interviewTopics),
      };
    } catch (error) {
      console.error('Error in matchResumeToJob:', error);
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
}

module.exports = new AIService();
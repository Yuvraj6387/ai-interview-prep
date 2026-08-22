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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableGeminiError = (error) => /503|overloaded|high demand|UNAVAILABLE/i.test(error.message || '');
const isQuotaExceededError = (error) => /429|quota/i.test(error.message || '');
const isTimeoutError = (error) => /abort|timeout/i.test(error.message || '') || error.name === 'AbortError';

const generateWithRetry = async (model, prompt, retries = 2) => {
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      if (isQuotaExceededError(error)) {
        throw new Error('The AI service has hit its usage limit for now. Please try again in a little while.');
      }
      if (isTimeoutError(error)) {
        throw new Error('The AI took too long to respond. Please try again.');
      }
      if (attempt >= retries || !isRetryableGeminiError(error)) {
        throw error;
      }
      await sleep(1000 * (attempt + 1));
    }
  }
};

const formatResumeContext = (resumeContext) => resumeContext
  ? `Candidate resume - Skills: ${(resumeContext.technicalSkills || []).join(', ') || 'n/a'}. Projects: ${(resumeContext.projects || []).join(', ') || 'n/a'}. Best-fit role: ${resumeContext.suggestedRole || 'n/a'}.
Ground your questions in THIS resume: ask about the specific skills and projects listed above instead of generic role trivia, whenever possible.`
  : '';

const QUESTION_STYLE_RULE = 'Keep it SHORT and natural: one focused question, a single sentence, phrased the way a real interviewer would actually say it out loud. Do not write long, multi-part, or compound questions.';

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

  async sendRequest(prompt) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 512
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
    const prompt = `Generate 5 interview questions for a ${targetRole} with ${experience} years of experience. Topics to cover: ${topicsList}. Return ONLY a valid JSON array of objects, each containing a "question" property. No other text or markdown formatting. Example: [{"question": "What is..."}]`;
    
    try {
      const response = await this.sendRequest(prompt);
      
      // Extract just the JSON array from the response in case there is extra text
      const jsonStart = response.indexOf('[');
      const jsonEnd = response.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
        const jsonString = response.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonString);
      }
      
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanResponse);
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
Format the output in clear Markdown.`;

    try {
      return await this.sendRequest(prompt);
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

  getGeminiModel() {
    if (!this.gemini) {
      throw new Error('Missing GEMINI_API_KEY in server environment');
    }
    // Without an explicit timeout, a stalled request can hang for a minute or
    // more before failing - capping it makes failures fast and predictable.
    // 45s (not 20s): real calls with a full interview-history prompt measured
    // up to ~18.4s on a cold connection, leaving too little margin at 20s.
    return this.gemini.getGenerativeModel({ model: 'gemini-3.6-flash' }, { timeout: 45000 });
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

    const model = this.getGeminiModel();

    try {
      const response = await generateWithRetry(model, prompt);
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

  async generateNextQuestion({ config, resumeContext, turns }) {
    const { role, experienceLevel, interviewType, difficulty, numQuestions } = config;

    const prompt = `You are conducting a live ${interviewType} interview for a ${role} candidate with ${experienceLevel} years of experience. Overall difficulty target: ${difficulty} (gradually escalate as the interview progresses).
${formatResumeContext(resumeContext)}

Interview so far:
${formatTurnsForPrompt(turns)}

Decide the next question (this will be question ${turns.length + 1} of ${numQuestions} total):
- If the most recent answer's evaluation says it was weak/unclear, ask a clarifying FOLLOW-UP question that digs into that specific gap, referencing what they said.
- Otherwise, ask a NEW question on a different topic than anything above, at a difficulty slightly higher than the previous question, staying relevant to the role and interview type.
- Never repeat a question or topic already covered above.
- ${QUESTION_STYLE_RULE}

Return ONLY a valid JSON object with this exact shape: { "questionText": "<the question>", "isFollowUp": true|false }`;

    const model = this.getGeminiModel();

    try {
      const response = await generateWithRetry(model, prompt);
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

    const model = this.getGeminiModel();

    try {
      const response = await generateWithRetry(model, prompt);
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

  async evaluateAndGenerateNext({ config, resumeContext, priorTurns, questionText, answerText, needsNextQuestion }) {
    const { role, experienceLevel, interviewType, difficulty, numQuestions } = config;

    const nextQuestionInstruction = needsNextQuestion
      ? `Decide the next question (question ${priorTurns.length + 2} of ${numQuestions} total): if isWeak, ask a clarifying FOLLOW-UP question that digs into that specific gap, referencing what they said. Otherwise, ask a NEW question on a different topic than anything above, at a difficulty slightly higher than the previous question, staying relevant to the role and interview type. Never repeat a question or topic already covered. ${QUESTION_STYLE_RULE}`
      : 'This was the final question of the interview - do NOT generate a next question, set "nextQuestion" to null.';

    const prompt = `You are conducting a live ${interviewType} interview for a ${role} candidate with ${experienceLevel} years of experience. Overall difficulty target: ${difficulty} (gradually escalate as the interview progresses).
${formatResumeContext(resumeContext)}

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

    const model = this.getGeminiModel();

    try {
      const response = await generateWithRetry(model, prompt);
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

    const model = this.getGeminiModel();

    try {
      const response = await generateWithRetry(model, prompt);
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
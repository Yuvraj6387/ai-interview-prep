const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const auth = require('../middleware/auth');
const aiService = require('../utils/aiService');

const DIMENSIONS = ['technicalAccuracy', 'communication', 'relevance', 'structure', 'confidence', 'problemSolving'];

const computeAverages = (turns) => {
  const evaluated = turns.filter((t) => t.evaluation);

  if (evaluated.length === 0) {
    const zeroed = {};
    DIMENSIONS.forEach((d) => { zeroed[d] = 0; });
    return { ...zeroed, overallScore: 0 };
  }

  const averages = {};
  DIMENSIONS.forEach((d) => {
    const sum = evaluated.reduce((acc, t) => acc + (t.evaluation[d] || 0), 0);
    averages[d] = Math.round(sum / evaluated.length);
  });

  const overallScore = Math.round(DIMENSIONS.reduce((acc, d) => acc + averages[d], 0) / DIMENSIONS.length);

  return { ...averages, overallScore };
};

const finishInterview = async (interview, turnsForReport) => {
  const averages = computeAverages(turnsForReport);
  const report = await aiService.generateFinalReport({ config: interview.config, turns: turnsForReport });
  interview.result = { ...averages, ...report };
  interview.status = 'completed';
  interview.completedAt = new Date();
  await interview.save();
};

// Keep only the fields the prompts use, capped, since this comes straight from the client.
const sanitizeJobContext = (jobContext) => {
  if (!jobContext || typeof jobContext !== 'object') return null;

  const list = (value) => (Array.isArray(value)
    ? value.filter((item) => typeof item === 'string').slice(0, 12).map((item) => item.slice(0, 60))
    : []);
  const title = typeof jobContext.title === 'string' ? jobContext.title.slice(0, 100) : '';
  const skills = list(jobContext.skills);
  const topics = list(jobContext.topics);

  return title || skills.length || topics.length ? { title, skills, topics } : null;
};

// Start a new adaptive mock interview
router.post('/', auth, async (req, res) => {
  try {
    const { role, experienceLevel, interviewType, difficulty, numQuestions } = req.body;

    if (!role || experienceLevel === undefined || experienceLevel === '' || !interviewType || !difficulty || !numQuestions) {
      return res.status(400).json({ message: 'Missing required interview configuration' });
    }

    const resume = await Resume.findOne({ userId: req.userId });
    const resumeContext = resume ? {
      technicalSkills: resume.analysis.technicalSkills,
      projects: resume.analysis.projects,
      suggestedRole: resume.analysis.suggestedRole,
    } : null;

    const config = {
      role,
      experienceLevel: Number(experienceLevel),
      interviewType,
      difficulty,
      numQuestions: Number(numQuestions),
    };

    const jobContext = sanitizeJobContext(req.body.jobContext);

    const firstQuestion = await aiService.generateNextQuestion({ config, resumeContext, jobContext, turns: [] });

    const interview = await Interview.create({
      userId: req.userId,
      config,
      resumeContext,
      jobContext,
      turns: [{ questionText: firstQuestion.questionText, isFollowUp: firstQuestion.isFollowUp }],
      status: 'in_progress',
    });

    res.status(201).json(interview);
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ message: error.message || 'Failed to start interview. Please try again.' });
  }
});

// Submit an answer (or skip) for the current pending question
router.post('/:id/answer', auth, async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.userId });
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    if (interview.status !== 'in_progress') {
      return res.status(400).json({ message: 'This interview has already ended' });
    }

    const lastTurn = interview.turns[interview.turns.length - 1];
    if (!lastTurn || lastTurn.answeredAt) {
      return res.status(400).json({ message: 'No pending question to answer' });
    }

    const { answerText, skip } = req.body;
    const needsNextQuestion = interview.turns.length < interview.config.numQuestions;

    if (skip) {
      lastTurn.skipped = true;
      lastTurn.answeredAt = new Date();

      if (!needsNextQuestion) {
        await finishInterview(interview, interview.turns);
        return res.json({ completed: true, interview });
      }

      const nextQuestion = await aiService.generateNextQuestion({
        config: interview.config,
        resumeContext: interview.resumeContext,
        jobContext: interview.jobContext,
        turns: interview.turns,
      });
      interview.turns.push({ questionText: nextQuestion.questionText, isFollowUp: nextQuestion.isFollowUp });
      await interview.save();
      return res.json({ completed: false, interview });
    }

    if (!answerText || !answerText.trim()) {
      return res.status(400).json({ message: 'Answer text is required' });
    }

    lastTurn.answerText = answerText;
    lastTurn.answeredAt = new Date();

    // Merged into a single Gemini call: evaluating this answer and (if needed)
    // deciding the next question used to be two sequential AI calls, doubling
    // the wait on every submit. The next-question decision depends on this
    // evaluation anyway, so they're combined into one round trip.
    const { evaluation, nextQuestion } = await aiService.evaluateAndGenerateNext({
      config: interview.config,
      resumeContext: interview.resumeContext,
      jobContext: interview.jobContext,
      priorTurns: interview.turns.slice(0, -1),
      questionText: lastTurn.questionText,
      answerText,
      needsNextQuestion,
    });

    lastTurn.evaluation = evaluation;

    if (!needsNextQuestion) {
      await finishInterview(interview, interview.turns);
      return res.json({ completed: true, interview });
    }

    interview.turns.push({ questionText: nextQuestion.questionText, isFollowUp: nextQuestion.isFollowUp });
    await interview.save();

    res.json({ completed: false, interview });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ message: error.message || 'Failed to process answer. Please try again.' });
  }
});

// End an interview early
router.post('/:id/end', auth, async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.userId });
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    if (interview.status === 'completed') {
      return res.json({ interview });
    }

    const answeredTurns = interview.turns.filter((t) => t.answeredAt);

    if (answeredTurns.length === 0) {
      interview.turns = [];
      interview.status = 'completed';
      interview.completedAt = new Date();
      interview.result = {
        overallScore: 0, technicalAccuracy: 0, communication: 0, relevance: 0,
        structure: 0, confidence: 0, problemSolving: 0,
        strengths: [], improvements: [], recommendedTopics: [], recommendedPractice: []
      };
      await interview.save();
      return res.json({ interview });
    }

    interview.turns = answeredTurns;
    await finishInterview(interview, answeredTurns);

    res.json({ interview });
  } catch (error) {
    console.error('Error ending interview:', error);
    res.status(500).json({ message: error.message || 'Failed to end interview. Please try again.' });
  }
});

// Get the caller's interview history
router.get('/', auth, async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.userId, status: 'completed' })
      .select('config status result startedAt completedAt')
      .sort({ completedAt: -1 });
    res.json(interviews);
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get one interview's full detail
router.get('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.userId });
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    res.json(interview);
  } catch (error) {
    console.error('Error fetching interview:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

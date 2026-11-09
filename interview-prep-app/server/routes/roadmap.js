const express = require('express');
const router = express.Router();
const Roadmap = require('../models/Roadmap');
const Interview = require('../models/Interview');
const auth = require('../middleware/auth');
const aiService = require('../utils/aiService');

const DIMENSIONS = {
  technicalAccuracy: 'Technical Accuracy',
  communication: 'Communication',
  relevance: 'Relevance',
  structure: 'Answer Structure',
  confidence: 'Confidence',
  problemSolving: 'Problem Solving',
};
// A skill averaging under this is treated as weak.
const WEAK_SKILL_BAR = 60;
const RECENT_INTERVIEWS = 10;

const average = (numbers) => (numbers.length
  ? Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length)
  : 0);

// Interviews that actually have scored answers (ending one before answering
// anything leaves an all-zero result that would drag every average down).
const scoredInterviews = (filter) => Interview.find({ ...filter, status: 'completed' })
  .sort({ completedAt: -1 })
  .then((list) => list.filter((i) => i.result && i.turns.some((t) => t.evaluation)));

// Plain counting, no AI: which topics keep getting recommended, which of the
// six scored skills are below the bar, and which answers were marked weak.
const findWeakAreas = (interviews) => {
  const topicCounts = {};
  interviews.forEach((i) => {
    (i.result.recommendedTopics || []).forEach((topic) => {
      const key = topic.trim();
      if (key) topicCounts[key] = (topicCounts[key] || 0) + 1;
    });
  });
  const weakTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const skills = Object.entries(DIMENSIONS).map(([key, label]) => ({
    key,
    label,
    score: average(interviews.map((i) => i.result[key] || 0)),
  }));
  const weakSkills = skills
    .filter((s) => s.score < WEAK_SKILL_BAR)
    .sort((a, b) => a.score - b.score);

  const weakAnswers = interviews
    .flatMap((i) => i.turns)
    .filter((t) => t.evaluation?.isWeak)
    .slice(0, 6)
    .map((t) => ({ question: t.questionText, feedback: t.evaluation.feedback }));

  return {
    interviewCount: interviews.length,
    role: interviews[0]?.config.role || '',
    averageScore: average(interviews.map((i) => i.result.overallScore || 0)),
    weakTopics,
    weakSkills,
    skills,
    weakAnswers,
  };
};

// Compares interviews taken since the plan started with the scores it started from.
const measureProgress = async (roadmap, userId) => {
  const since = await scoredInterviews({ userId, completedAt: { $gte: roadmap.startedAt } });
  const allItems = roadmap.days.flatMap((d) => [...d.tasks, ...d.questions]);
  const dayNumber = Math.floor((Date.now() - roadmap.startedAt.getTime()) / 86400000) + 1;

  return {
    doneItems: allItems.filter((item) => item.done).length,
    totalItems: allItems.length,
    completedDays: roadmap.days.filter((d) => [...d.tasks, ...d.questions].every((item) => item.done)).length,
    today: Math.min(Math.max(dayNumber, 1), roadmap.duration),
    interviewsSince: since.length,
    currentScore: since.length ? average(since.map((i) => i.result.overallScore || 0)) : null,
    skills: roadmap.weakSkills.map((s) => {
      const key = Object.keys(DIMENSIONS).find((k) => DIMENSIONS[k] === s.name);
      return {
        name: s.name,
        before: s.score,
        now: since.length && key ? average(since.map((i) => i.result[key] || 0)) : null,
      };
    }),
  };
};

// The current plan (if any), its progress, and a fresh look at weak areas.
router.get('/', auth, async (req, res) => {
  try {
    const interviews = (await scoredInterviews({ userId: req.userId })).slice(0, RECENT_INTERVIEWS);
    const roadmap = await Roadmap.findOne({ userId: req.userId });
    const progress = roadmap ? await measureProgress(roadmap, req.userId) : null;
    const { weakAnswers, ...insights } = findWeakAreas(interviews);

    res.json({ roadmap, progress, insights });
  } catch (error) {
    console.error('Error loading roadmap:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Build a new 7- or 30-day plan, replacing the current one.
router.post('/', auth, async (req, res) => {
  try {
    const duration = Number(req.body.duration);
    if (![7, 30].includes(duration)) {
      return res.status(400).json({ message: 'Plan length must be 7 or 30 days' });
    }

    const interviews = (await scoredInterviews({ userId: req.userId })).slice(0, RECENT_INTERVIEWS);
    if (interviews.length === 0) {
      return res.status(400).json({ message: 'Complete at least one mock interview first, so we know what to focus on.' });
    }

    const weak = findWeakAreas(interviews);
    const days = await aiService.generateStudyPlan({
      role: weak.role,
      duration,
      weakTopics: weak.weakTopics.map((t) => t.name),
      weakSkills: weak.weakSkills,
      weakAnswers: weak.weakAnswers,
    });

    await Roadmap.deleteOne({ userId: req.userId });
    const roadmap = await Roadmap.create({
      userId: req.userId,
      role: weak.role,
      duration,
      weakTopics: weak.weakTopics.map((t) => t.name),
      weakSkills: weak.weakSkills.map((s) => ({ name: s.label, score: s.score })),
      baselineScore: weak.averageScore,
      days,
      startedAt: new Date(),
    });

    res.status(201).json({ roadmap, progress: await measureProgress(roadmap, req.userId) });
  } catch (error) {
    console.error('Error creating roadmap:', error);
    res.status(500).json({ message: error.message || 'Failed to build your plan. Please try again.' });
  }
});

// Tick or untick one task / practice question.
router.patch('/item', auth, async (req, res) => {
  try {
    const { day, kind, index, done } = req.body;
    if (!['tasks', 'questions'].includes(kind)) {
      return res.status(400).json({ message: 'Invalid item type' });
    }

    const roadmap = await Roadmap.findOne({ userId: req.userId });
    const item = roadmap?.days.find((d) => d.day === Number(day))?.[kind][Number(index)];
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.done = Boolean(done);
    await roadmap.save();
    res.json({ roadmap, progress: await measureProgress(roadmap, req.userId) });
  } catch (error) {
    console.error('Error updating roadmap item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/', auth, async (req, res) => {
  try {
    await Roadmap.deleteOne({ userId: req.userId });
    res.json({ message: 'Plan deleted' });
  } catch (error) {
    console.error('Error deleting roadmap:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

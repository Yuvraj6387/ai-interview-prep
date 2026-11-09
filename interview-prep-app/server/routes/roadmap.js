const express = require('express');
const router = express.Router();
const Roadmap = require('../models/Roadmap');
const auth = require('../middleware/auth');
const aiService = require('../utils/aiService');

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DURATIONS = [7, 14, 30];
const PHASES = ['Easy', 'Medium', 'Strong'];

// How much of the plan each phase gets. A beginner spends longer on basics,
// an advanced candidate gets to the hard material sooner.
const PHASE_SHARE = {
  Beginner: [0.5, 0.3, 0.2],
  Intermediate: [0.34, 0.33, 0.33],
  Advanced: [0.2, 0.3, 0.5],
};

// Split the days into Easy / Medium / Strong. Done in code, not by the AI, so
// the phases always add up and every phase gets at least one day.
const splitPhases = (duration, level) => {
  const [easyShare, mediumShare] = PHASE_SHARE[level];
  const easy = Math.max(1, Math.round(duration * easyShare));
  const medium = Math.max(1, Math.round(duration * mediumShare));
  // With 7+ days and every share at least 20%, Strong always gets 1+ days.
  const lengths = [easy, medium, duration - easy - medium];

  let start = 1;
  return PHASES.map((name, i) => {
    const range = { name, from: start, to: start + lengths[i] - 1 };
    start += lengths[i];
    return range;
  });
};

const progressFor = (roadmap) => {
  const itemsOf = (d) => [...d.tasks, ...d.questions];
  const allItems = roadmap.days.flatMap(itemsOf);
  const dayNumber = Math.floor((Date.now() - roadmap.startedAt.getTime()) / 86400000) + 1;

  return {
    doneItems: allItems.filter((item) => item.done).length,
    totalItems: allItems.length,
    completedDays: roadmap.days.filter((d) => itemsOf(d).every((item) => item.done)).length,
    today: Math.min(Math.max(dayNumber, 1), roadmap.duration),
    phases: PHASES.map((name) => {
      const days = roadmap.days.filter((d) => d.phase === name);
      const items = days.flatMap(itemsOf);
      return {
        name,
        from: days[0]?.day || 0,
        to: days[days.length - 1]?.day || 0,
        doneItems: items.filter((item) => item.done).length,
        totalItems: items.length,
      };
    }),
  };
};

router.get('/', auth, async (req, res) => {
  try {
    let roadmap = await Roadmap.findOne({ userId: req.userId });
    // Plans from the first version were built from interview results and have
    // no goal or phases. Drop them so the user starts fresh with the new form.
    if (roadmap && (!roadmap.goal || roadmap.days.some((d) => !d.phase))) {
      await Roadmap.deleteOne({ _id: roadmap._id });
      roadmap = null;
    }
    res.json({ roadmap, progress: roadmap ? progressFor(roadmap) : null });
  } catch (error) {
    console.error('Error loading roadmap:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Build a new plan from the user's own goal, replacing the current one.
router.post('/', auth, async (req, res) => {
  try {
    const goal = typeof req.body.goal === 'string' ? req.body.goal.trim().slice(0, 150) : '';
    const { level } = req.body;
    const duration = Number(req.body.duration);

    if (goal.length < 3) {
      return res.status(400).json({ message: 'Tell us what you want to prepare for' });
    }
    if (!LEVELS.includes(level)) {
      return res.status(400).json({ message: 'Choose your current level' });
    }
    if (!DURATIONS.includes(duration)) {
      return res.status(400).json({ message: 'Plan length must be 7, 14 or 30 days' });
    }

    const phases = splitPhases(duration, level);
    const days = await aiService.generateStudyPlan({ goal, level, duration, phases });
    const phaseOf = (day) => phases.find((p) => day >= p.from && day <= p.to).name;

    await Roadmap.deleteOne({ userId: req.userId });
    const roadmap = await Roadmap.create({
      userId: req.userId,
      goal,
      level,
      duration,
      days: days.map((d) => ({ ...d, phase: phaseOf(d.day) })),
      startedAt: new Date(),
    });

    res.status(201).json({ roadmap, progress: progressFor(roadmap) });
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
    res.json({ roadmap, progress: progressFor(roadmap) });
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
module.exports.splitPhases = splitPhases;

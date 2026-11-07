const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const BuiltResume = require('../models/BuiltResume');
const Resume = require('../models/Resume');
const aiService = require('../utils/aiService');

// Keeps the free-tier database small; plenty for one version per job type.
const MAX_VERSIONS = 10;

const tooManyVersions = async (userId) => (await BuiltResume.countDocuments({ userId })) >= MAX_VERSIONS;

// Loads a version only if it belongs to the signed-in user.
const findOwned = (req) => (mongoose.isValidObjectId(req.params.id)
  ? BuiltResume.findOne({ _id: req.params.id, userId: req.userId })
  : null);

const versionLimitMessage = `You can keep up to ${MAX_VERSIONS} resume versions. Delete one to make another.`;

// List the user's versions (without their full content)
router.get('/', auth, async (req, res) => {
  try {
    const versions = await BuiltResume.find({ userId: req.userId })
      .select('title template updatedAt content.name content.headline')
      .sort({ updatedAt: -1 });
    res.json(versions);
  } catch (error) {
    console.error('Error listing resumes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start a new, blank version
router.post('/', auth, async (req, res) => {
  try {
    if (await tooManyVersions(req.userId)) {
      return res.status(400).json({ message: versionLimitMessage });
    }
    const version = await BuiltResume.create({
      userId: req.userId,
      title: (req.body.title || 'My Resume').slice(0, 60),
      content: {},
    });
    res.status(201).json(version);
  } catch (error) {
    console.error('Error creating resume:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// "Magic import": the AI splits the uploaded resume's text into editable sections
router.post('/import', auth, async (req, res) => {
  try {
    if (await tooManyVersions(req.userId)) {
      return res.status(400).json({ message: versionLimitMessage });
    }
    const uploaded = await Resume.findOne({ userId: req.userId });
    if (!uploaded) {
      return res.status(404).json({ message: 'Upload a PDF in Resume Analyzer first, or start from a blank resume.' });
    }

    const content = await aiService.parseResumeToSections(uploaded.extractedText);
    const version = await BuiltResume.create({ userId: req.userId, title: 'Imported resume', content });
    res.status(201).json(version);
  } catch (error) {
    console.error('Error importing resume:', error);
    res.status(500).json({ message: error.message || 'Failed to import your resume. Please try again.' });
  }
});

// Write a professional summary from what is already in the resume
router.post('/summary', auth, async (req, res) => {
  try {
    const content = req.body.content || {};
    const targetRole = (req.body.targetRole || '').trim().slice(0, 80);
    const hasMaterial = (content.experience || []).length + (content.projects || []).length + (content.skills || []).length > 0;

    if (!hasMaterial) {
      return res.status(400).json({ message: 'Add some experience, projects or skills first, so the summary has facts to use.' });
    }

    res.json({ summary: await aiService.generateResumeSummary(content, targetRole) });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ message: error.message || 'Failed to write a summary. Please try again.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const version = await findOwned(req);
    if (!version) return res.status(404).json({ message: 'Resume not found' });
    res.json(version);
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save edits. Only these three fields can change; the schema drops anything unknown.
router.put('/:id', auth, async (req, res) => {
  try {
    const version = await findOwned(req);
    if (!version) return res.status(404).json({ message: 'Resume not found' });

    const { title, template, content } = req.body;
    if (typeof title === 'string') version.title = title.slice(0, 60) || 'My Resume';
    if (['classic', 'modern'].includes(template)) version.template = template;
    if (content && typeof content === 'object') version.content = content;

    await version.save();
    res.json(version);
  } catch (error) {
    console.error('Error saving resume:', error);
    res.status(500).json({ message: 'Failed to save. Please try again.' });
  }
});

// Copy a version, e.g. to tailor it for a different job without losing the original
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await findOwned(req);
    if (!original) return res.status(404).json({ message: 'Resume not found' });
    if (await tooManyVersions(req.userId)) {
      return res.status(400).json({ message: versionLimitMessage });
    }

    const copy = await BuiltResume.create({
      userId: req.userId,
      title: `${original.title} (copy)`.slice(0, 60),
      template: original.template,
      content: original.content.toObject(),
    });
    res.status(201).json(copy);
  } catch (error) {
    console.error('Error duplicating resume:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const version = await findOwned(req);
    if (!version) return res.status(404).json({ message: 'Resume not found' });
    await version.deleteOne();
    res.json({ message: 'Resume deleted' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

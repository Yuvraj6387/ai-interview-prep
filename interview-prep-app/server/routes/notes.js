const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Note = require('../models/Note');
const auth = require('../middleware/auth');

const MAX_ITEMS = 100;
const MAX_TAGS = 5;

// Reading a public note doesn't need an account, so a shared link works for
// anyone. If a valid token is sent anyway, use it to recognise the author.
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      req.userId = jwt.verify(token, process.env.JWT_SECRET).userId;
    } catch {
      // An expired token just means reading as a guest.
    }
  }
  next();
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// What a list card needs: no answers, just the count.
const summaryOf = (note, userId) => ({
  _id: note._id,
  title: note.title,
  description: note.description,
  tags: note.tags,
  isPublic: note.isPublic,
  questionCount: note.items.length,
  author: note.userId?.fullName || 'Unknown',
  isOwner: Boolean(userId) && String(note.userId?._id || note.userId) === String(userId),
  updatedAt: note.updatedAt,
});

const fullNote = (note, userId) => ({ ...summaryOf(note, userId), items: note.items });

// Check and clean what the client sent. Returns { error } or { data }.
const readNoteInput = (body) => {
  const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

  const title = text(body.title, 120);
  if (title.length < 3) return { error: 'Give your note a title (at least 3 characters)' };

  // "React" and "react" are the same tag; keep the first spelling.
  const tags = (Array.isArray(body.tags) ? body.tags : [])
    .map((tag) => text(tag, 30))
    .filter((tag, i, all) => tag && all.findIndex((t) => t.toLowerCase() === tag.toLowerCase()) === i)
    .slice(0, MAX_TAGS);

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length > MAX_ITEMS) return { error: `A note can have at most ${MAX_ITEMS} questions` };

  const items = rawItems
    .map((item) => ({ question: text(item?.question, 500), answer: text(item?.answer, 5000) }))
    .filter((item) => item.question || item.answer);
  if (items.length === 0) return { error: 'Add at least one question with its answer' };
  const incomplete = items.findIndex((item) => !item.question || !item.answer);
  if (incomplete !== -1) return { error: `Question ${incomplete + 1} needs both a question and an answer` };

  return {
    data: {
      title,
      description: text(body.description, 300),
      tags,
      isPublic: body.isPublic !== false,
      items,
    },
  };
};

// Everyone's public notes, newest first, with optional search.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = { isPublic: true };
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 60) : '';
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: pattern }, { tags: pattern }, { description: pattern }];
    }

    const notes = await Note.find(filter)
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate('userId', 'fullName')
      .lean();
    res.json(notes.map((note) => summaryOf(note, req.userId)));
  } catch (error) {
    console.error('Error listing notes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// The signed-in user's own notes, public and private.
router.get('/mine', auth, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .populate('userId', 'fullName')
      .lean();
    res.json(notes.map((note) => summaryOf(note, req.userId)));
  } catch (error) {
    console.error('Error listing my notes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('userId', 'fullName').lean();
    const isOwner = note && req.userId && String(note.userId?._id) === String(req.userId);
    // A private note looks the same as a missing one to anyone but its author.
    if (!note || (!note.isPublic && !isOwner)) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json(fullNote(note, req.userId));
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'Note not found' });
    console.error('Error loading note:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { error, data } = readNoteInput(req.body);
    if (error) return res.status(400).json({ message: error });

    const note = await Note.create({ ...data, userId: req.userId });
    await note.populate('userId', 'fullName');
    res.status(201).json(fullNote(note, req.userId));
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { error, data } = readNoteInput(req.body);
    if (error) return res.status(400).json({ message: error });

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      data,
      { new: true, runValidators: true }
    ).populate('userId', 'fullName');
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(fullNote(note, req.userId));
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'Note not found' });
    console.error('Error updating note:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await Note.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'Note not found' });
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

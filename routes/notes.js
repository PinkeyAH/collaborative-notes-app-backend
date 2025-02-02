const express = require('express');
const authMiddleware = require('../middleware/authMiddleware'); 
const Note = require('../models/Note');
const User = require('../models/User');

const router = express.Router();

// Create a note
router.post('/', authMiddleware, async (req, res) => {
  const { title, content } = req.body;
  try {
    const note = new Note({ title, content, owner: req.user.id });
    await note.save();
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all notes for the user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notes = await Note.find({ $or: [{ owner: req.user.id }, { sharedWith: req.user.id }] });
    res.json(notes);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Share a note
router.post('/:id/share', authMiddleware, async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    const note = await Note.findById(req.params.id);
    if (!note.owner.equals(req.user.id)) throw new Error('Not authorized');

    note.sharedWith.push(user._id);
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Search notes
router.get('/search', authMiddleware, async (req, res) => {
  const { query } = req.query;
  try {
    const notes = await Note.find({
      $and: [
        { $or: [{ title: { $regex: query, $options: 'i' } }, { content: { $regex: query, $options: 'i' } }] },
        { $or: [{ owner: req.user.id }, { sharedWith: req.user.id }] }
      ]
    });
    res.json(notes);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}); 


// Update a note
router.put('/:id', authMiddleware, async (req, res) => {
  const { title, content } = req.body;
  try {
    const note = await Note.findById(req.params.id);
    if (!note.owner.equals(req.user.id)) throw new Error('Not authorized');

    note.title = title || note.title;
    note.content = content || note.content;
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a note
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note.owner.equals(req.user.id)) throw new Error('Not authorized');

    await note.deleteOne();
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


module.exports = router;
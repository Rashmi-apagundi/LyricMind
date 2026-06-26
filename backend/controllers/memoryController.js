import Memory from '../models/Memory.js';
import { getEmbedding } from '../ai/embeddingService.js';
import { searchMemories } from '../ai/ragService.js';

/**
 * @desc    Create a new memory
 * @route   POST /api/memory
 * @access  Private
 */
export const createMemory = async (req, res) => {
  try {
    const { title, text, emoji, mood, photo } = req.body;

    if (!title || !text) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    // Generate embedding for semantic search
    const embedding = await getEmbedding(text);

    const memory = await Memory.create({
      userId: req.user._id,
      emoji: emoji || '🌟',
      title,
      text,
      mood: mood || '',
      photo: photo || null,
      favorite: false,
      embedding
    });

    res.status(201).json({
      id: memory._id,
      emoji: memory.emoji,
      title: memory.title,
      text: memory.text,
      mood: memory.mood,
      photo: memory.photo,
      favorite: memory.favorite,
      date: memory.createdAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      dateRaw: memory.createdAt.toISOString()
    });
  } catch (error) {
    console.error("Error creating memory:", error.message);
    res.status(500).json({ message: "Server error creating memory" });
  }
};

/**
 * @desc    Get user's memories
 * @route   GET /api/memory
 * @access  Private
 */
export const getMemories = async (req, res) => {
  try {
    const memories = await Memory.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const formatted = memories.map(m => ({
      id: m._id,
      emoji: m.emoji,
      title: m.title,
      text: m.text,
      mood: m.mood,
      photo: m.photo,
      favorite: m.favorite,
      date: m.createdAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      dateRaw: m.createdAt.toISOString()
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching memories:", error.message);
    res.status(500).json({ message: "Server error fetching memories" });
  }
};

/**
 * @desc    Toggle favorite status of a memory
 * @route   PATCH /api/memory/:id/favorite
 * @access  Private
 */
export const toggleMemoryFavorite = async (req, res) => {
  try {
    const memory = await Memory.findOne({ _id: req.params.id, userId: req.user._id });

    if (!memory) {
      return res.status(404).json({ message: "Memory not found" });
    }

    memory.favorite = !memory.favorite;
    await memory.save();

    res.json({
      id: memory._id,
      favorite: memory.favorite
    });
  } catch (error) {
    console.error("Error toggling favorite status:", error.message);
    res.status(500).json({ message: "Server error toggling favorite status" });
  }
};

/**
 * @desc    Semantic RAG search query
 * @route   GET /api/memory/search
 * @access  Private
 */
export const queryMemories = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ message: "Query string 'q' is required" });
    }

    const searchResults = await searchMemories(req.user._id, q);
    res.json(searchResults);
  } catch (error) {
    console.error("Error searching memories:", error.message);
    res.status(500).json({ message: "Server error searching memories" });
  }
};

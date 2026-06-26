import Thought from '../models/Thought.js';
import { analyzeJournalMood } from '../ai/groqClient.js';
import { getEmbedding } from '../ai/embeddingService.js';

/**
 * @desc    Create new journal entry
 * @route   POST /api/journal
 * @access  Private
 */
export const createJournalEntry = async (req, res) => {
  try {
    const { text, source } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ message: "Journal text is required" });
    }

    // 1. Analyze mood via Groq API
    const analysis = await analyzeJournalMood(text);

    // 2. Generate vector embedding via HuggingFace
    const embedding = await getEmbedding(text);

    // 3. Create the journal entry (Thought)
    const entry = await Thought.create({
      userId: req.user._id,
      text: text.trim(),
      mood: analysis.mood || 'Calm',
      source: source || 'typed',
      embedding
    });

    res.status(201).json({
      id: entry._id,
      text: entry.text,
      mood: entry.mood,
      source: entry.source,
      createdAt: entry.createdAt,
      analysis // Send the scores back so frontend can update immediate state
    });
  } catch (error) {
    console.error("Error creating journal entry:", error.message);
    res.status(500).json({ message: "Server error creating journal entry" });
  }
};

/**
 * @desc    Get all journal entries for user
 * @route   GET /api/journal
 * @access  Private
 */
export const getJournalHistory = async (req, res) => {
  try {
    const thoughts = await Thought.find({ userId: req.user._id }).sort({ createdAt: -1 });
    
    // Map to frontend expected format
    const formatted = thoughts.map(t => ({
      id: t._id,
      text: t.text,
      mood: t.mood,
      source: t.source,
      date: t.createdAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      dateRaw: t.createdAt.toISOString()
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching journal history:", error.message);
    res.status(500).json({ message: "Server error fetching journal history" });
  }
};

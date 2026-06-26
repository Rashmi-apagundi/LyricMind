import Thought from '../models/Thought.js';
import Music from '../models/Music.js';
import {
  generateDailyReflection,
  generateWeeklyReport,
  generatePersonalityProfile,
  generateGrowthTrajectory
} from '../ai/groqClient.js';
import { clusterUserThoughts } from '../ai/ragService.js';
import { askSelfReflection } from '../ai/selfReflectionService.js';

/**
 * Helper to fetch thoughts and music within a date range
 */
async function fetchLogsForRange(userId, daysAgoStart = 0, daysAgoEnd = 0) {
  const start = new Date();
  start.setDate(start.getDate() - daysAgoStart);
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setDate(end.getDate() - daysAgoEnd);
  end.setHours(23, 59, 59, 999);

  const thoughts = await Thought.find({
    userId,
    createdAt: { $gte: start, $lte: end }
  }).sort({ createdAt: -1 });

  const tracks = await Music.find({
    userId,
    playedAt: { $gte: start, $lte: end }
  }).sort({ playedAt: -1 });

  return { thoughts, tracks };
}

/**
 * @desc    Get Daily AI Reflection
 * @route   GET /api/ai/reflection
 * @access  Private
 */
export const getDailyReflection = async (req, res) => {
  try {
    // Try to get logs for today (0 days ago)
    let { thoughts, tracks } = await fetchLogsForRange(req.user._id, 0, 0);

    // Fallback: If empty, get the 5 most recent journals and 10 most recent tracks overall
    if (thoughts.length === 0) {
      thoughts = await Thought.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5);
      tracks = await Music.find({ userId: req.user._id }).sort({ playedAt: -1 }).limit(10);
    }

    const reflection = await generateDailyReflection(thoughts, tracks);
    
    // Add date formatting
    res.json({
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      ...reflection
    });
  } catch (error) {
    console.error("Error generating daily reflection:", error.message);
    res.status(500).json({ message: "Server error generating reflection" });
  }
};

/**
 * @desc    Get Weekly Insights Report
 * @route   GET /api/ai/weekly-report
 * @access  Private
 */
export const getWeeklyReport = async (req, res) => {
  try {
    // Get logs for the past 7 days
    let { thoughts, tracks } = await fetchLogsForRange(req.user._id, 7, 0);

    // Fallback if sparse
    if (thoughts.length === 0) {
      thoughts = await Thought.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10);
      tracks = await Music.find({ userId: req.user._id }).sort({ playedAt: -1 }).limit(20);
    }

    const report = await generateWeeklyReport(thoughts, tracks);
    res.json(report);
  } catch (error) {
    console.error("Error generating weekly report:", error.message);
    res.status(500).json({ message: "Server error generating weekly report" });
  }
};

/**
 * @desc    Get Personality Profile
 * @route   GET /api/ai/personality
 * @access  Private
 */
export const getPersonalityProfile = async (req, res) => {
  try {
    const thoughts = await Thought.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(15);
    const tracks = await Music.find({ userId: req.user._id }).sort({ playedAt: -1 }).limit(30);

    if (thoughts.length === 0) {
      return res.json({
        strengths: ["Self-Reflection", "Insight Seeking"],
        patterns: ["New Journaler"],
        thinkingStyle: "Write journal entries to begin mapping your thinking styles.",
        decisionMaking: "Not enough journal data to analyze decision-making.",
        emotionalTendencies: "Add your Spotify tracks or daily journals to evaluate emotional variance.",
        learningStyle: "Write in your journal to map your behavioral learning styles."
      });
    }

    const profile = await generatePersonalityProfile(thoughts, tracks);
    res.json(profile);
  } catch (error) {
    console.error("Error generating personality profile:", error.message);
    res.status(500).json({ message: "Server error generating personality profile" });
  }
};

/**
 * @desc    Get Growth Trajectory
 * @route   GET /api/ai/trajectory
 * @access  Private
 */
export const getGrowthTrajectory = async (req, res) => {
  try {
    const thoughts = await Thought.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(15);
    const tracks = await Music.find({ userId: req.user._id }).sort({ playedAt: -1 }).limit(30);

    const trajectory = await generateGrowthTrajectory(thoughts, tracks);
    res.json(trajectory);
  } catch (error) {
    console.error("Error generating growth trajectory:", error.message);
    res.status(500).json({ message: "Server error generating growth trajectory" });
  }
};

/**
 * @desc    Get Semantic Classification Clusters
 * @route   GET /api/ai/clusters
 * @access  Private
 */
export const getThoughtsClusters = async (req, res) => {
  try {
    const clusters = await clusterUserThoughts(req.user._id, 3);
    res.json(clusters);
  } catch (error) {
    console.error("Error clustering thoughts:", error.message);
    res.status(500).json({ message: "Server error clustering thoughts" });
  }
};

/**
 * @desc    Self-Reflection RAG Chat
 * @route   POST /api/ai/self-reflect
 * @access  Private
 */
export const selfReflect = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ message: "Please provide a question." });
    }

    const result = await askSelfReflection(req.user._id, question.trim());
    res.json(result);
  } catch (error) {
    console.error("Error in self-reflection:", error.message);
    res.status(500).json({ message: "Server error during self-reflection" });
  }
};

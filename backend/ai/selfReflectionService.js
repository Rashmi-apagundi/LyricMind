import { getEmbedding, cosineSimilarity } from './embeddingService.js';
import Thought from '../models/Thought.js';
import Memory from '../models/Memory.js';
import Music from '../models/Music.js';
import Groq from 'groq-sdk';

/**
 * RAG-powered Self-Reflection Chat Service
 * 
 * Pipeline:
 *   1. Embed user question
 *   2. Retrieve relevant context from all data sources
 *   3. Rank by similarity + recency
 *   4. Augment prompt with retrieved context
 *   5. Generate personalized answer via Groq LLM
 */

const SYSTEM_PROMPT = `You are LyricMind AI — a deeply personalized self-reflection companion.

You have access to the user's journal entries, voice reflections, memory vault entries, and music listening patterns.
You are NOT a generic chatbot. You answer based ONLY on the retrieved context provided below.

Your personality:
- Warm, empathetic, and insightful
- You speak directly to the user ("You", "Your")
- You identify patterns, connections, and growth across their data
- You reference specific entries, dates, moods, and details from their history
- You never fabricate information — if the context doesn't contain relevant data, say so honestly
- You don't use bullet points or numbered lists — write in flowing, reflective prose
- You sound like a thoughtful therapist-friend, not a corporate AI assistant
- Keep responses concise (3-5 sentences) but deeply personal

CRITICAL RULES:
- NEVER say "Based on the context provided" or "According to your data" — speak naturally
- NEVER make up journal entries or memories that aren't in the context
- If there isn't enough data to answer, respond warmly: "I need more journal entries and reflections before I can identify meaningful patterns around this topic. Keep writing — the more you share, the deeper I can understand you."
- Connect emotions across different data sources when possible (e.g., linking music mood to journal mood)`;

/**
 * Score and rank documents from all sources against the query embedding.
 * Returns top-K documents with metadata.
 */
async function retrieveContext(userId, queryEmbedding, topK = 8) {
  // Fetch all user data in parallel
  const [thoughts, memories, musicTracks] = await Promise.all([
    Thought.find({ userId }).sort({ createdAt: -1 }).limit(50),
    Memory.find({ userId }).sort({ createdAt: -1 }).limit(30),
    Music.find({ userId }).sort({ playedAt: -1 }).limit(40)
  ]);

  const scoredDocs = [];
  const now = Date.now();

  // Score journal entries (highest priority source)
  for (const thought of thoughts) {
    let similarity = 0;
    if (thought.embedding && thought.embedding.length > 0) {
      similarity = cosineSimilarity(queryEmbedding, thought.embedding);
    } else {
      // Generate embedding on-the-fly if missing
      const embedding = await getEmbedding(thought.text);
      similarity = cosineSimilarity(queryEmbedding, embedding);
    }

    // Recency boost: entries from the last 7 days get a small boost
    const ageInDays = (now - new Date(thought.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = ageInDays < 7 ? 0.05 : ageInDays < 30 ? 0.02 : 0;

    scoredDocs.push({
      type: 'journal',
      source: thought.source === 'voice' ? 'Voice Reflection' : 'Journal Entry',
      text: thought.text,
      mood: thought.mood,
      date: thought.createdAt,
      score: similarity + recencyBoost
    });
  }

  // Score memory vault entries
  for (const memory of memories) {
    let similarity = 0;
    if (memory.embedding && memory.embedding.length > 0) {
      similarity = cosineSimilarity(queryEmbedding, memory.embedding);
    } else {
      const combinedText = `${memory.title}. ${memory.text}`;
      const embedding = await getEmbedding(combinedText);
      similarity = cosineSimilarity(queryEmbedding, embedding);
    }

    scoredDocs.push({
      type: 'memory',
      source: 'Memory Vault',
      text: `${memory.title}: ${memory.text}`,
      mood: memory.mood,
      date: memory.createdAt,
      score: similarity
    });
  }

  // Score music tracks (group into a summarized context)
  if (musicTracks.length > 0) {
    // Create mood-grouped music summaries
    const moodGroups = {};
    for (const track of musicTracks) {
      const key = track.mood || 'Unknown';
      if (!moodGroups[key]) {
        moodGroups[key] = [];
      }
      moodGroups[key].push(`${track.name} by ${track.artist}`);
    }

    for (const [mood, tracks] of Object.entries(moodGroups)) {
      const summary = `Listening pattern (${mood} mood): ${tracks.slice(0, 5).join(', ')}`;
      const embedding = await getEmbedding(summary);
      const similarity = cosineSimilarity(queryEmbedding, embedding);

      scoredDocs.push({
        type: 'music',
        source: 'Spotify Listening Pattern',
        text: summary,
        mood: mood,
        date: musicTracks[0].playedAt,
        score: similarity
      });
    }
  }

  // Sort by score descending and take top-K
  scoredDocs.sort((a, b) => b.score - a.score);
  return scoredDocs.slice(0, topK);
}

/**
 * Format retrieved documents into a context string for the LLM.
 */
function formatContext(docs) {
  if (docs.length === 0) {
    return 'No relevant data found for this user.';
  }

  return docs.map((doc, i) => {
    const dateStr = new Date(doc.date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    return `[${doc.source} — ${dateStr} — Mood: ${doc.mood || 'untagged'}]\n${doc.text}`;
  }).join('\n\n');
}

/**
 * Main RAG function: Ask a self-reflection question.
 * 
 * @param {string} userId - The authenticated user's ID
 * @param {string} question - The user's question about themselves
 * @returns {{ answer: string, sources: Array }} The AI response + source metadata
 */
export async function askSelfReflection(userId, question) {
  // Step 1: Embed the question
  const queryEmbedding = await getEmbedding(question);

  // Step 2 & 3: Retrieve and rank context
  const retrievedDocs = await retrieveContext(userId, queryEmbedding);

  // Check for insufficient data
  const totalUserData = retrievedDocs.length;
  const avgScore = totalUserData > 0
    ? retrievedDocs.reduce((sum, d) => sum + d.score, 0) / totalUserData
    : 0;

  // Step 4: Augment prompt with context
  const contextStr = formatContext(retrievedDocs);

  const userPrompt = `RETRIEVED CONTEXT FROM USER'S DATA:
---
${contextStr}
---

USER'S QUESTION: "${question}"

Respond as their personalized self-reflection companion. Reference specific details from the retrieved context.`;

  // Step 5: Generate via Groq LLM
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      answer: "I'm having trouble connecting to my thinking engine right now. Please try again in a moment.",
      sources: []
    };
  }

  const groq = new Groq({ apiKey });

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 512
    });

    const answer = completion.choices[0]?.message?.content || 
      "I need more journal entries and reflections before I can identify meaningful patterns. Keep writing — the more you share, the deeper I can understand you.";

    // Return answer with source metadata (for UI transparency)
    const sources = retrievedDocs
      .filter(d => d.score > 0.1)
      .map(d => ({
        type: d.type,
        source: d.source,
        mood: d.mood,
        date: d.date,
        relevance: Math.round(d.score * 100)
      }));

    return { answer, sources };
  } catch (err) {
    console.error('Self-reflection generation failed:', err.message);
    return {
      answer: "I'm reflecting on your question but ran into a momentary difficulty. Please try asking again.",
      sources: []
    };
  }
}

import Groq from 'groq-sdk';

// Initialize Groq client lazily
let groqInstance = null;

function getGroq() {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GROQ_API_KEY environment variable is not set.");
    }
    groqInstance = new Groq({ apiKey });
  }
  return groqInstance;
}

/**
 * Helper to call Groq Chat Completion with JSON output requirement.
 */
async function callGroqJSON(systemPrompt, userPrompt, model = 'llama-3.1-8b-instant') {
  const groq = getGroq();
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing. Please check your .env configuration.");
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: model,
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const content = completion.choices[0]?.message?.content;
    return JSON.parse(content);
  } catch (error) {
    console.error("Groq JSON call failed:", error.message);
    throw error;
  }
}

/**
 * 1. Sentiment & Mood Analyzer
 */
export async function analyzeJournalMood(text) {
  const systemPrompt = `You are an expert mental health sentiment analyzer. Analyze the user's journal text.
Return a JSON object with:
{
  "mood": "Choose exactly one of: Motivated, Focused, Calm, Reflective, Confident, Overwhelmed",
  "scoreFocus": <number 0-100 representing concentration/clarity>,
  "scoreEnergy": <number 0-100 representing vitality/drive>,
  "scoreConfidence": <number 0-100 representing self-assurance>,
  "scoreBalance": <number 0-100 representing emotional stability/peace>
}`;

  try {
    return await callGroqJSON(systemPrompt, `Journal text: "${text}"`);
  } catch (err) {
    console.warn("Mood analysis fallback used:", err.message);
    return {
      mood: "Calm",
      scoreFocus: 70,
      scoreEnergy: 65,
      scoreConfidence: 70,
      scoreBalance: 75
    };
  }
}

/**
 * 2. Daily Reflection Generator
 */
export async function generateDailyReflection(journals, tracks) {
  const systemPrompt = `You are a warm, empathetic AI companion for mental wellbeing.
You will receive a list of the user's journal entries for today and their Spotify listening history today.
Synthesize this information to write a daily reflection and breakdown.
Return a JSON object matching this schema:
{
  "reflectionText": "A warm, insightful paragraph (3-4 sentences) that highlights connections between their mood, actions, and music choices. Maintain a premium, encouraging tone.",
  "strength": "Title of today's key strength (e.g. Deep Focus, Self-Compassion)",
  "strengthDesc": "1 sentence describing how they showed this strength",
  "challenge": "Title of today's primary challenge (e.g. Evening Overthinking, Restless energy)",
  "challengeDesc": "1 sentence detailing this difficulty",
  "insight": "1 powerful, personalized insight mapping music to mood (e.g. 'Your focus peaked while listening to lofi study beats')",
  "action": "1 concrete, actionable suggestion for tomorrow",
  "currentState": "Choose exactly one dominant state: Focused, Calm, Motivated, Reflective, Confident, Overwhelmed",
  "scores": {
    "focus": <number 0-100 representing concentration level>,
    "energy": <number 0-100 representing energy level>,
    "confidence": <number 0-100 representing confidence level>,
    "emotionalBalance": <number 0-100 representing emotional balance level>
  }
}`;

  const journalsStr = journals.map(j => `[${j.source} journal]: ${j.text}`).join('\n');
  const tracksStr = tracks.map(t => `${t.name} by ${t.artist} (${t.mood}${t.album ? ` — album: ${t.album}` : ''})`).join(', ');

  const userPrompt = `Today's Journals:\n${journalsStr || "No journal entered today."}\n\nToday's Music:\n${tracksStr || "No music logged today."}`;

  try {
    return await callGroqJSON(systemPrompt, userPrompt);
  } catch (err) {
    console.warn("Daily reflection fallback used:", err.message);
    return {
      reflectionText: "Your thoughts and music today show a steady foundation. Finding moments to rest and digest your achievements is key to maintaining this sustainable momentum.",
      strength: "Mindful Reflection",
      strengthDesc: "You took time to record your state and observe your patterns.",
      challenge: "Transitioning to Rest",
      challengeDesc: "Winding down after a busy day can sometimes feel restless.",
      insight: "Consistent evening routines correlate with more grounded thoughts.",
      action: "Try a 5-minute breathing exercise before going to sleep tonight.",
      currentState: "Calm",
      scores: {
        focus: 70,
        energy: 65,
        confidence: 75,
        emotionalBalance: 80
      }
    };
  }
}

/**
 * 3. Weekly Report Engine
 */
export async function generateWeeklyReport(journals, tracks) {
  const systemPrompt = `You are a clinical psychologist and data scientist.
Analyze a week's worth of journals and listening history.
Return a JSON object matching this schema:
{
  "growthScore": <number 0-100 indicating self-awareness & progress>,
  "moodTrend": "Choose one: Upward, Stable, Fluctuating, Downward",
  "commonState": "Choose exactly one: Motivated, Focused, Calm, Reflective, Confident, Overwhelmed",
  "biggestWin": "Short title of their biggest success (e.g. Journaling consistency, High flow state)",
  "growthAreas": ["Area 1", "Area 2", "Area 3"],
  "summary": "A detailed 3-4 sentence growth summary of their week.",
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2",
    "Specific recommendation 3",
    "Specific recommendation 4",
    "Specific recommendation 5"
  ]
}`;

  const journalsStr = journals.map(j => `[${j.createdAt.toISOString().split('T')[0]} - ${j.mood}]: ${j.text}`).join('\n');
  const tracksStr = tracks.map(t => `${t.name} by ${t.artist} (${t.mood}${t.album ? ` — ${t.album}` : ''})`).join(', ');

  const userPrompt = `Week's Journals:\n${journalsStr || "No journals in the past week."}\n\nWeek's Music:\n${tracksStr || "No music logs in the past week."}`;

  try {
    return await callGroqJSON(systemPrompt, userPrompt, 'llama-3.3-70b-versatile');
  } catch (err) {
    console.warn("Weekly report fallback used:", err.message);
    return {
      growthScore: 75,
      moodTrend: "Stable",
      commonState: "Calm",
      biggestWin: "Self-Reflection Practice",
      growthAreas: ["Emotional Regulation", "Mindfulness"],
      summary: "This week, you maintained a stable emotional foundation. Your writing shows regular self-checkins and an honest look at your current trajectory.",
      recommendations: [
        "Continue morning writing blocks before reviewing tasks.",
        "Use instrumental playlists when deep concentration is needed.",
        "Acknowledge small daily wins to reinforce positive self-talk.",
        "Set strict boundaries with work emails after 7 PM.",
        "Take a brief screen break every 90 minutes."
      ]
    };
  }
}

/**
 * 4. Personality Profiler
 */
export async function generatePersonalityProfile(journals, tracks) {
  const systemPrompt = `You are a personality psychologist specializing in the Big Five and cognitive style mappings.
Synthesize the user's logs into a comprehensive profile.
Return a JSON object matching this schema:
{
  "strengths": ["Strength 1", "Strength 2", "Strength 3", "Strength 4", "Strength 5"],
  "patterns": ["Behavior Pattern 1", "Behavior Pattern 2", "Behavior Pattern 3", "Behavior Pattern 4"],
  "thinkingStyle": "Paragraph description of cognitive/thinking style.",
  "decisionMaking": "Paragraph description of decision making tendencies.",
  "emotionalTendencies": "Paragraph description of emotional patterns.",
  "learningStyle": "Paragraph description of learning style."
}`;

  const journalsStr = journals.map(j => `[${j.mood}]: ${j.text}`).join('\n');
  const tracksStr = tracks.map(t => `${t.name} by ${t.artist} (${t.mood})`).join(', ');

  const userPrompt = `Journals:\n${journalsStr}\n\nMusic history:\n${tracksStr}`;

  try {
    return await callGroqJSON(systemPrompt, userPrompt, 'llama-3.3-70b-versatile');
  } catch (err) {
    console.warn("Personality profiler fallback used:", err.message);
    return {
      strengths: ["Deep Thinking", "Self-Awareness", "Creative Problem Solving", "Resilience", "Empathy"],
      patterns: ["Morning Optimizer", "Music-Driven Regulator", "Reflective Processor", "Goal Chaser"],
      thinkingStyle: "You process information deeply, seeking root causes before embarking on solutions. This leads to strategic clarity.",
      decisionMaking: "You balance emotional resonance with structured logic, verifying your choices through journaling.",
      emotionalTendencies: "You experience feelings with high nuance, actively leveraging music to regulate your emotional state.",
      learningStyle: "You are a reflective learner who gains clarity by writing, reading, and conceptualizing theories."
    };
  }
}

/**
 * 5. Growth Trajectory Tracker
 */
export async function generateGrowthTrajectory(journals, tracks) {
  const systemPrompt = `You are a personal growth coach.
Analyze the user's progress toward self-actualization based on their entries and patterns.
Return a JSON object matching this schema:
{
  "currentSelf": "Short description of their current state (e.g. Scattered but highly ambitious)",
  "desiredSelf": "Short description of their goal state (e.g. Grounded creative with steady discipline)",
  "overallProgress": <number 0-100 representing aggregate growth>,
  "dimensions": [
    { "name": "Focus & Discipline", "progress": <number 0-100> },
    { "name": "Emotional Resilience", "progress": <number 0-100> },
    { "name": "Mindfulness", "progress": <number 0-100> },
    { "name": "Productivity Systems", "progress": <number 0-100> },
    { "name": "Communication", "progress": <number 0-100> },
    { "name": "Self-Compassion", "progress": <number 0-100> }
  ]
}`;

  const journalsStr = journals.slice(0, 10).map(j => `[${j.mood}]: ${j.text}`).join('\n');
  const userPrompt = `Analyze this history:\n${journalsStr}`;

  try {
    return await callGroqJSON(systemPrompt, userPrompt);
  } catch (err) {
    console.warn("Growth trajectory fallback used:", err.message);
    return {
      currentSelf: "Ambitious but occasionally overwhelmed",
      desiredSelf: "Grounded and highly focused creative leader",
      overallProgress: 45,
      dimensions: [
        { name: "Focus & Discipline", progress: 60 },
        { name: "Emotional Resilience", progress: 50 },
        { name: "Mindfulness", progress: 40 },
        { name: "Productivity Systems", progress: 65 },
        { name: "Communication", progress: 45 },
        { name: "Self-Compassion", progress: 35 }
      ]
    };
  }
}

/**
 * 6. Memory Vault RAG Synthesizer (Natural Language Response to Memories)
 */
export async function synthesizeMemorySearch(query, relevantMemories) {
  const systemPrompt = `You are the guardian of the user's Memory Vault.
You are given a question/query about the user's life and a list of matching memories retrieved from their vault.
Summarize what the memories say about their query in a warm, nostalgic, and supportive tone.
Speak directly to the user (e.g., 'You completed your first solo client project...').
If there are no memories or they don't answer the query, tell them nicely that you couldn't find matches.
Return a JSON object with:
{
  "response": "Your empathetic answer summarizing their memories."
}`;

  const memoriesStr = relevantMemories.map(m => `Date: ${m.createdAt.toISOString().split('T')[0]} | Title: ${m.title} | Mood: ${m.mood}\nDescription: ${m.text}`).join('\n\n');
  const userPrompt = `Query: "${query}"\n\nMemories Found:\n${memoriesStr || "None found."}`;

  try {
    return await callGroqJSON(systemPrompt, userPrompt);
  } catch (err) {
    console.error("Synthesizing memory search failed:", err.message);
    return {
      response: "Looking through your vault, I see details of your accomplishments. You've shown great dedication on your journey."
    };
  }
}

/**
 * 7. Spotify Track Mood Classifier
 */
export async function classifyTrackMoods(tracks) {
  if (!tracks || tracks.length === 0) return [];
  
  const systemPrompt = `You are an expert music therapist and psychologist. 
Analyze the list of music tracks (name and artist) and classify the psychological mood and a matching emoji for each track.
You MUST choose the mood from exactly one of these: Energized, Upbeat, Chill, Reflective, Introspective, Focused, Calm, Peaceful, Motivated, Driven, Melancholy, Anxious, Hopeful, Dreamy, Joyful, Warm.
Return a JSON object containing a 'classifications' array matching the input list length and order:
{
  "classifications": [
    { "name": "Song Name", "artist": "Artist Name", "mood": "One of the listed moods", "emoji": "A single matching emoji character" }
  ]
}`;

  const userPrompt = `List of tracks to classify:\n${JSON.stringify(tracks)}`;

  try {
    const response = await callGroqJSON(systemPrompt, userPrompt);
    return response.classifications || [];
  } catch (err) {
    console.warn("Track mood classification fallback used:", err.message);
    // Fallback: assign 'Chill' and '🎵'
    return tracks.map(t => ({
      name: t.name,
      artist: t.artist,
      mood: 'Chill',
      emoji: '🎵'
    }));
  }
}

/**
 * 8. Music Psychology Insight Engine
 * Interprets genres + recent track moods into emotional/psychological insight
 */
export async function generateMusicPsychologyInsight(recentTracks, topArtists) {
  const systemPrompt = `You are a music psychologist and emotional intelligence expert.
You analyze a person's music listening patterns to derive deep psychological and emotional insights.
This is NOT a music analytics tool — it is a self-growth and self-awareness tool.

Analyze the given tracks and artists and return a JSON object with:
{
  "headline": "A short, punchy headline (max 8 words) about their emotional state, e.g. 'Deep in reflection mode this week'",
  "emotionalState": "Choose one: Focused, Calm, Motivated, Reflective, Introspective, Energized, Melancholic, Hopeful, Anxious, Joyful",
  "patterns": [
    "A psychological pattern observed (e.g. 'You gravitate toward introspective music during transitions')",
    "Another pattern (e.g. 'High-energy music correlates with your productive cycles')",
    "A third pattern or observation"
  ],
  "insight": "A 2-3 sentence deep psychological insight connecting their music taste to their inner state, growth, or emotional processing. Speak directly to them.",
  "focusScore": <number 0-100 representing estimated focus level from music choices>,
  "energyScore": <number 0-100 representing energy level from music choices>,
  "genreThemes": ["theme1", "theme2", "theme3"]
}`;

  const trackSummary = recentTracks.slice(0, 20).map(t => 
    `${t.name} by ${t.artist} (mood: ${t.mood}${t.album ? `, album: ${t.album}` : ''})`
  ).join('\n');

  const artistSummary = topArtists.slice(0, 8).map(a => 
    `${a.name} — genres: ${a.genres.join(', ') || 'unknown'}`
  ).join('\n');

  const userPrompt = `Recent Listening History:\n${trackSummary || 'No recent tracks.'}\n\nTop Artists:\n${artistSummary || 'No artist data.'}`;

  try {
    return await callGroqJSON(systemPrompt, userPrompt, 'llama-3.3-70b-versatile');
  } catch (err) {
    console.warn("Music psychology insight fallback used:", err.message);
    return {
      headline: "Your music reveals your inner world",
      emotionalState: "Reflective",
      patterns: [
        "Your listening patterns suggest a reflective, introspective mindset",
        "You use music as an emotional processing tool",
        "Your taste reflects depth and emotional intelligence"
      ],
      insight: "Your music choices are a window into your inner emotional landscape. The patterns in what you listen to reveal how you process the world around you — using sound as both a mirror and a compass.",
      focusScore: 65,
      energyScore: 60,
      genreThemes: ["introspection", "emotional depth", "self-awareness"]
    };
  }
}

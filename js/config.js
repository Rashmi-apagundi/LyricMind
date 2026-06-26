/* ======================================================
   LYRICMIND AI — CONFIGURATION & SOURCING
   ====================================================== */

// Dynamic environment images and context descriptions.
// Centralized mapping — future: swap URLs for Unsplash/Pexels API calls.
export const ENVIRONMENT_CONFIG = {
  Focused: {
    title: "Focused",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80",
    description: "This visual environment was selected because your recent journals and listening patterns indicate a focused and goal-oriented state. Clean and structured visuals help reinforce concentration and momentum.",
    journalPatterns: [
      "Multiple entries mention deep work and flow states",
      "You've been journaling consistently during morning hours"
    ],
    listeningPatterns: [
      "Lo-fi and instrumental tracks dominate your recent plays",
      "Longer listening sessions indicate sustained focus periods"
    ],
    growthNote: "A focused environment reinforces your current momentum and helps sustain deep work without distractions."
  },
  Calm: {
    title: "Calm",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1920&q=80",
    description: "This visual environment was selected because your recent journals and listening patterns suggest a peaceful, centered state. Gentle nature scenes help sustain this tranquil and balanced mindset.",
    journalPatterns: [
      "Your writing tone has been measured and reflective",
      "Fewer anxious keywords detected in recent entries"
    ],
    listeningPatterns: [
      "Ambient and classical tracks are prominent",
      "You've been listening during evening wind-down hours"
    ],
    growthNote: "Calm environments nurture emotional resilience and help maintain the inner peace you've been building."
  },
  Motivated: {
    title: "Motivated",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80",
    description: "This visual environment was selected because your recent journals and listening patterns indicate high drive and motivation. Inspiring summits reflect your momentum and goal-oriented energy.",
    journalPatterns: [
      "You've written about goals and achievements recently",
      "Action-oriented language dominates your recent entries"
    ],
    listeningPatterns: [
      "High-energy and upbeat tracks in your recent history",
      "Music tempo patterns align with productive activity"
    ],
    growthNote: "Summit imagery channels your high energy into structured, sustainable ambition rather than sprint-burnout cycles."
  },
  Reflective: {
    title: "Reflective",
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1920&q=80",
    description: "This visual environment was selected because your recent journals and listening patterns show a reflective and introspective state. Quiet evening tones provide a safe harbor for your deep thoughts.",
    journalPatterns: [
      "Your entries contain self-questioning and pattern recognition",
      "You've been revisiting past experiences in your writing"
    ],
    listeningPatterns: [
      "Slower, melodic tracks suggest introspective listening",
      "Artists with lyrical depth are prominent in your history"
    ],
    growthNote: "Reflective environments transform introspection into actionable wisdom, helping you crystallize your insights."
  },
  Confident: {
    title: "Confident",
    image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1920&q=80",
    description: "This visual environment was selected because your recent journals and listening patterns indicate growing confidence and outlook. An open horizon reflects your clarity and self-assured vision.",
    journalPatterns: [
      "Positive self-talk and assertive language detected",
      "You've documented recent achievements and milestones"
    ],
    listeningPatterns: [
      "Uplifting, empowering tracks in your recent plays",
      "Your listening patterns show expanding musical exploration"
    ],
    growthNote: "Expansive horizons reinforce your growing self-assurance and encourage bold creative risks."
  },
  Overwhelmed: {
    title: "Finding Balance",
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80",
    description: "This visual environment was selected to help you find calm during a challenging time. Gentle landscapes guide you toward recovery and clarity rather than mirroring the overwhelm.",
    journalPatterns: [
      "Your entries mention multiple responsibilities and pressure",
      "Boundary-related challenges appear in recent writing"
    ],
    listeningPatterns: [
      "Mixed emotional tone in your listening patterns",
      "Stress-related or emotionally intense tracks detected"
    ],
    growthNote: "This calming environment subtly guides you toward recovery — nature's simplicity helps reset an overwhelmed mind."
  }
};

// Maps raw journal or listening mood tags into the 6 core emotional environments
export function getEnvironmentForMood(mood) {
  if (!mood) return ENVIRONMENT_CONFIG.Focused;
  
  const m = mood.toLowerCase();
  
  // Overwhelmed / Stressed — dedicated calming environment
  if (m.includes('overwhelm') || m.includes('stressed') || m.includes('burnout') || m.includes('exhaust')) {
    return ENVIRONMENT_CONFIG.Overwhelmed;
  }
  if (m.includes('focus') || m.includes('productive') || m.includes('determined')) {
    return ENVIRONMENT_CONFIG.Focused;
  }
  if (m.includes('calm') || m.includes('peace') || m.includes('neutral') || m.includes('serene')) {
    return ENVIRONMENT_CONFIG.Calm;
  }
  if (m.includes('motiv') || m.includes('energ') || m.includes('drive') || m.includes('upbeat')) {
    return ENVIRONMENT_CONFIG.Motivated;
  }
  if (m.includes('reflect') || m.includes('introspect') || m.includes('anxi') || m.includes('scatter') || m.includes('melancholy') || m.includes('contemplat')) {
    return ENVIRONMENT_CONFIG.Reflective;
  }
  if (m.includes('confid') || m.includes('inspir') || m.includes('hope') || m.includes('joy') || m.includes('warm') || m.includes('dreamy') || m.includes('proud') || m.includes('grateful')) {
    return ENVIRONMENT_CONFIG.Confident;
  }
  
  // Default fallback
  return ENVIRONMENT_CONFIG.Calm;
}

// Dynamic predictions, growth directions, and active habits for each canonical state.
export const TRAJECTORY_CONFIG = {
  Focused: {
    prediction: "You are on track to develop deep, uninterrupted focus habits that will elevate your creative output by 30% over the next quarter.",
    growth: "Shifting from scattered multitasking to structured block scheduling and strict notification boundaries.",
    habits: ["Morning journaling before screen time", "Focus music sync during work blocks", "Daily task prioritization"]
  },
  Calm: {
    prediction: "Your sustained peace will lead to higher emotional resilience, reducing burnout risk and improving decision-making clarity.",
    growth: "Nurturing inner peace and expanding it into mindful collaboration with others.",
    habits: ["Consistent evening wind-down routine", "Nature walks between focused sessions", "Mindfulness check-ins when switching tasks"]
  },
  Motivated: {
    prediction: "You will accomplish major milestones on your active projects. Expect high velocity and project completion rates.",
    growth: "Channeling high drive into structured, sustainable energy rather than sprint-burnout cycles.",
    habits: ["Goal-tracking dashboard updates", "High-intensity morning work sessions", "Weekly progress celebration"]
  },
  Reflective: {
    prediction: "You are undergoing deep self-discovery. This phase will yield high self-awareness and stronger alignment with your core values.",
    growth: "Transforming introspection into actionable wisdom and concrete goals.",
    habits: ["Deep-dive voice recording logs", "Reflective reading before bed", "Writing down subconscious worries to clear them"]
  },
  Confident: {
    prediction: "Your growing self-assurance will open new leadership avenues and bold creative risks.",
    growth: "Step out of your comfort zone to mentor others and pitch ambitious ideas.",
    habits: ["Celebrating wins openly", "Assertive boundary setting", "Morning posture and positive affirmations"]
  },
  Overwhelmed: {
    prediction: "This challenging period will pass. You are building resilience and learning to set boundaries that protect your energy.",
    growth: "Transitioning from overcommitment to intentional prioritization and self-compassion.",
    habits: ["Saying no to one low-priority commitment daily", "5-minute breathing exercises between tasks", "Journaling stress triggers to identify patterns"]
  },
  "Finding Balance": {
    prediction: "This challenging period will pass. You are building resilience and learning to set boundaries that protect your energy.",
    growth: "Transitioning from overcommitment to intentional prioritization and self-compassion.",
    habits: ["Saying no to one low-priority commitment daily", "5-minute breathing exercises between tasks", "Journaling stress triggers to identify patterns"]
  }
};

export function getTrajectoryForMood(mood) {
  const env = getEnvironmentForMood(mood);
  return TRAJECTORY_CONFIG[env.title] || TRAJECTORY_CONFIG.Calm;
}

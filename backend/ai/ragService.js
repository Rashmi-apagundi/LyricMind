import { getEmbedding, cosineSimilarity } from './embeddingService.js';
import { synthesizeMemorySearch } from './groqClient.js';
import Memory from '../models/Memory.js';
import Thought from '../models/Thought.js';
import Groq from 'groq-sdk';

/**
 * 1. Semantic Memory Search (RAG)
 * Finds relevant memories, feeds them to the LLM, and gets synthesized response.
 */
export async function searchMemories(userId, query, limit = 4) {
  // Get embedding for search query
  const queryVector = await getEmbedding(query);

  // Retrieve user's memories
  const memories = await Memory.find({ userId });
  if (memories.length === 0) {
    return {
      response: "Your Memory Vault is currently empty. Start adding some memories first!",
      results: []
    };
  }

  // Calculate similarity for memories that have embeddings
  const scoredMemories = memories.map(mem => {
    let similarity = 0;
    if (mem.embedding && mem.embedding.length > 0) {
      similarity = cosineSimilarity(queryVector, mem.embedding);
    } else {
      // Fallback to simple keyword overlap if embedding is missing
      const queryWords = new Set(query.toLowerCase().split(/\s+/));
      const textWords = new Set(mem.text.toLowerCase().split(/\s+/));
      const titleWords = new Set(mem.title.toLowerCase().split(/\s+/));
      
      let overlap = 0;
      queryWords.forEach(w => {
        if (textWords.has(w) || titleWords.has(w)) overlap++;
      });
      similarity = overlap / Math.max(queryWords.size, 1);
    }

    return {
      memory: mem,
      similarity
    };
  });

  // Sort by similarity descending
  scoredMemories.sort((a, b) => b.similarity - a.similarity);

  // Slice the top matching memories
  const topScored = scoredMemories.slice(0, limit);
  const topMemories = topScored.map(item => item.memory);

  // Synthesize using Groq LLM
  const synth = await synthesizeMemorySearch(query, topMemories);

  return {
    response: synth.response,
    results: topScored.map(item => ({
      id: item.memory._id,
      title: item.memory.title,
      emoji: item.memory.emoji,
      date: item.memory.createdAt,
      mood: item.memory.mood,
      favorite: item.memory.favorite,
      photo: item.memory.photo,
      similarity: item.similarity
    }))
  };
}

/**
 * Simple K-Means clustering implementation for 384-dimensional embeddings.
 */
function kMeans(items, k = 3, maxIterations = 20) {
  if (items.length <= k) {
    return items.map((item, idx) => ({
      clusterIndex: idx,
      items: [item]
    }));
  }

  // 1. Initialize centroids randomly from items
  let centroids = [];
  const usedIndices = new Set();
  while (centroids.length < k) {
    const randomIdx = Math.floor(Math.random() * items.length);
    if (!usedIndices.has(randomIdx)) {
      usedIndices.add(randomIdx);
      centroids.push([...items[randomIdx].embedding]);
    }
  }

  let assignments = new Array(items.length).fill(-1);
  let iterations = 0;
  let centroidsChanged = true;

  while (centroidsChanged && iterations < maxIterations) {
    centroidsChanged = false;
    iterations++;

    // 2. Assign items to nearest centroid
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let maxSim = -Infinity;
      let bestCluster = 0;

      for (let c = 0; c < k; c++) {
        const sim = cosineSimilarity(item.embedding, centroids[c]);
        if (sim > maxSim) {
          maxSim = sim;
          bestCluster = c;
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        centroidsChanged = true;
      }
    }

    // 3. Recompute centroids as mean of assigned vectors
    for (let c = 0; c < k; c++) {
      const assignedItems = items.filter((_, idx) => assignments[idx] === c);
      if (assignedItems.length === 0) continue;

      const dim = centroids[c].length;
      const newCentroid = new Array(dim).fill(0);

      for (const item of assignedItems) {
        for (let d = 0; d < dim; d++) {
          newCentroid[d] += item.embedding[d];
        }
      }

      // Average and normalize
      let sumSq = 0;
      for (let d = 0; d < dim; d++) {
        newCentroid[d] /= assignedItems.length;
        sumSq += newCentroid[d] * newCentroid[d];
      }
      
      const norm = Math.sqrt(sumSq) || 1;
      centroids[c] = newCentroid.map(val => val / norm);
    }
  }

  // Group items by cluster index
  const clusters = [];
  for (let c = 0; c < k; c++) {
    const clusterItems = items.filter((_, idx) => assignments[idx] === c);
    clusters.push({
      clusterIndex: c,
      items: clusterItems
    });
  }

  return clusters;
}

/**
 * 2. Semantic Clustering & Classification Engine
 * Clusters user's thoughts/journals and uses LLM to name and summarize each cluster.
 */
export async function clusterUserThoughts(userId, k = 3) {
  // Fetch thoughts that have embeddings
  const thoughts = await Thought.find({ userId });
  
  // Filter out thoughts without embeddings (generate them if empty)
  const thoughtsWithEmbeds = [];
  for (const t of thoughts) {
    if (!t.embedding || t.embedding.length === 0) {
      t.embedding = await getEmbedding(t.text);
      await t.save();
    }
    thoughtsWithEmbeds.push(t);
  }

  if (thoughtsWithEmbeds.length === 0) {
    return { clusters: [] };
  }

  const clustersData = kMeans(thoughtsWithEmbeds, Math.min(k, thoughtsWithEmbeds.length));
  
  const labeledClusters = [];
  const apiKey = process.env.GROQ_API_KEY;
  const groq = apiKey ? new Groq({ apiKey }) : null;

  for (const cluster of clustersData) {
    if (cluster.items.length === 0) continue;

    // Use top text snippets to prompt LLM
    const snippets = cluster.items.slice(0, 5).map(item => `- [${item.mood}] ${item.text}`).join('\n');

    let title = `Cluster ${cluster.clusterIndex + 1}`;
    let description = "A grouping of similar emotional states and thoughts.";
    
    if (groq) {
      try {
        const promptSystem = `You are a mental health data cluster labeler.
You are given a list of journal entries that have been grouped together by a vector similarity algorithm.
Synthesize these entries and return a JSON object with:
{
  "title": "A short, beautiful thematic title (e.g. Professional Accomplishment, Restless Anxiety, Creative Solitude)",
  "description": "A 1-2 sentence description explaining the common emotional thread or topic linking these journals."
}`;
        
        const completion = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: promptSystem },
            { role: 'user', content: `Journal snippets:\n${snippets}` }
          ],
          model: 'llama-3.1-8b-instant',
          response_format: { type: 'json_object' },
          temperature: 0.2
        });

        const parsed = JSON.parse(completion.choices[0]?.message?.content);
        title = parsed.title || title;
        description = parsed.description || description;
      } catch (err) {
        console.error("Failed to label cluster using Groq:", err.message);
      }
    }

    labeledClusters.push({
      title,
      description,
      moodDistribution: calculateMoodDistribution(cluster.items),
      items: cluster.items.map(item => ({
        id: item._id,
        text: item.text,
        mood: item.mood,
        createdAt: item.createdAt
      }))
    });
  }

  return { clusters: labeledClusters };
}

function calculateMoodDistribution(items) {
  const counts = {};
  items.forEach(item => {
    counts[item.mood] = (counts[item.mood] || 0) + 1;
  });
  
  const total = items.length;
  const dist = [];
  for (const [mood, count] of Object.entries(counts)) {
    dist.push({
      mood,
      percentage: Math.round((count / total) * 100)
    });
  }
  
  // Sort descending
  dist.sort((a, b) => b.percentage - a.percentage);
  return dist;
}

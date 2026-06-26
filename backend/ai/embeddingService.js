
/**
 * Generates a 384-dimensional deterministic mock embedding as a fallback.
 * Uses string hashing and character distribution to yield a normalized vector.
 */
function generateMockEmbedding(text) {
  const dimensions = 384;
  const vector = new Array(dimensions).fill(0);
  
  if (!text) return vector;

  // Simple hashing to seed the pseudo-random values
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = (i * charCode) % dimensions;
    vector[index] += Math.sin(charCode + i);
  }

  // Normalize the vector (L2 norm) so similarity checks work correctly
  let sumOfSquares = 0;
  for (let i = 0; i < dimensions; i++) {
    // Add some noise based on index to distribute values
    vector[i] = vector[i] || Math.cos(i * 0.1);
    sumOfSquares += vector[i] * vector[i];
  }

  const magnitude = Math.sqrt(sumOfSquares) || 1;
  return vector.map(val => val / magnitude);
}

/**
 * Converts input text into a 384-dimensional vector embedding.
 */
export async function getEmbedding(text) {
  if (!text || typeof text !== 'string') {
    return new Array(384).fill(0);
  }

  const hfKey = process.env.HF_API_KEY;
  const hfUrl = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

  if (!hfKey) {
    // Proactively fallback if no HF key is configured
    return generateMockEmbedding(text);
  }

  try {
    const response = await fetch(hfUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: text })
    });

    if (!response.ok) {
      console.warn(`HuggingFace embedding API returned status ${response.status}. Falling back to mock embeddings.`);
      return generateMockEmbedding(text);
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    
    return generateMockEmbedding(text);
  } catch (err) {
    console.error('Error during HuggingFace embedding fetching:', err.message);
    return generateMockEmbedding(text);
  }
}

/**
 * Computes cosine similarity between two vectors.
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

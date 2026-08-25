/**
 * Vector Database and Vector Mathematics Helper
 */

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Value between -1 and 1 (usually 0 to 1 for text embeddings)
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  if (vecA.length !== vecB.length) return 0;

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

/**
 * Normalize a vector to unit length
 * @param {number[]} vec
 * @returns {number[]}
 */
function normalizeVector(vec) {
  if (!vec || vec.length === 0) return [];
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const mag = Math.sqrt(sumSq);
  if (mag === 0) return vec.slice();
  return vec.map((v) => v / mag);
}

/**
 * Generate a deterministic pseudo-embedding vector from text
 * Used as a reliable fallback when API keys are not provided in development
 * @param {string} text
 * @param {number} dimensions
 * @returns {number[]}
 */
function mockEmbedding(text, dimensions = 768) {
  const normalized = (text || '').toLowerCase().trim();
  const vector = new Array(dimensions).fill(0);
  
  if (!normalized) return vector;

  // Simple token/character based hash distribution
  const words = normalized.split(/\s+/);
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    for (let c = 0; c < word.length; c++) {
      const charCode = word.charCodeAt(c);
      const idx1 = (charCode * 31 + c * 17 + w * 7) % dimensions;
      const idx2 = (charCode * 53 + c * 13 + w * 11) % dimensions;
      vector[idx1] += (charCode % 10) / 10;
      vector[idx2] += ((charCode * 3) % 10) / 10;
    }
  }

  return normalizeVector(vector);
}

module.exports = {
  cosineSimilarity,
  normalizeVector,
  mockEmbedding,
};

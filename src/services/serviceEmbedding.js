const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const env = require('../config/env');
const { mockEmbedding } = require('../config/vectorDb');

let geminiClient = null;
let openaiClient = null;

function getGeminiClient() {
  if (!geminiClient && env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return geminiClient;
}

function getOpenAIClient() {
  if (!openaiClient && env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Generate embedding for a single text
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  const cleanText = (text || '').trim();
  if (!cleanText) {
    return mockEmbedding('', 768);
  }

  const provider = env.EMBEDDING_PROVIDER || 'gemini';

  // 1. Try Gemini
  if (provider === 'gemini' && env.GEMINI_API_KEY) {
    try {
      const client = getGeminiClient();
      const model = client.getGenerativeModel({
        model: env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
      });
      const result = await model.embedContent(cleanText);
      if (result && result.embedding && Array.isArray(result.embedding.values)) {
        return result.embedding.values;
      }
    } catch (err) {
      console.warn(`[Embedding] Gemini embedding error: ${err.message}. Falling back to fallback mock.`);
    }
  }

  // 2. Try OpenAI
  if ((provider === 'openai' || (!env.GEMINI_API_KEY && env.OPENAI_API_KEY)) && env.OPENAI_API_KEY) {
    try {
      const client = getOpenAIClient();
      const response = await client.embeddings.create({
        model: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        input: cleanText,
      });
      if (response && response.data && response.data[0] && response.data[0].embedding) {
        return response.data[0].embedding;
      }
    } catch (err) {
      console.warn(`[Embedding] OpenAI embedding error: ${err.message}. Falling back to fallback mock.`);
    }
  }

  // 3. Fallback mock embedding when no API key is provided
  return mockEmbedding(cleanText, 768);
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function generateEmbeddings(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const provider = env.EMBEDDING_PROVIDER || 'gemini';

  // 1. Try OpenAI batch embedding
  if (provider === 'openai' && env.OPENAI_API_KEY) {
    try {
      const client = getOpenAIClient();
      const response = await client.embeddings.create({
        model: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
        input: texts,
      });
      if (response && response.data) {
        return response.data.map((item) => item.embedding);
      }
    } catch (err) {
      console.warn(`[Embedding] OpenAI batch embedding error: ${err.message}. Falling back to sequential.`);
    }
  }

  // 2. Sequential / Promise.all for Gemini or fallback
  const results = [];
  for (const text of texts) {
    const emb = await generateEmbedding(text);
    results.push(emb);
  }
  return results;
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
};

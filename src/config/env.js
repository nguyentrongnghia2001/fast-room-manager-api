// Centralized environment configuration
require('dotenv').config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: Number(process.env.PORT || 3000),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/room-manager',
  JWT_SECRET: process.env.JWT_SECRET || 'thisisasupersecret',
  JWT_ACCESS_EXPIRATION_MINUTES: process.env.JWT_ACCESS_EXPIRATION_MINUTES || 30,

  // AI & RAG Configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  LLM_PROVIDER: process.env.LLM_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini'),
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini'),
  GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  VECTOR_TOP_K: Number(process.env.VECTOR_TOP_K || 5),
  VECTOR_SIMILARITY_THRESHOLD: Number(process.env.VECTOR_SIMILARITY_THRESHOLD || 0.4),
};

module.exports = env;
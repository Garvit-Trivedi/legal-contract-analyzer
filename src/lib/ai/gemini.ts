import { GoogleGenAI } from "@google/genai";

// Ensure this file is only executed on the server, not in the browser
if (typeof window !== "undefined") {
  throw new Error("Gemini AI client cannot be initialized in the browser.");
}

// We initialize dynamically to ensure process.env is read on demand
let ai: GoogleGenAI | null = null;

export const getGeminiClient = () => {
  if (!ai) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      // Pass base URL if configured, but genai typically sets it under baseURL or something if needed.
      // Drizzle handles things, but let's stick to simple apiKey initialization here.
    });
  }
  return ai;
};

export const getChatModel = () => {
  const model = process.env.GEMINI_MODEL;
  if (!model) {
    throw new Error("GEMINI_MODEL environment variable is not configured.");
  }
  return model;
};

export function isTransientError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || error.toString()).toLowerCase();
  const status = error.status || error.statusCode || error.code;
  
  // If it's a 429 "quota exceeded", it's usually a long wait (hours) for free tier. Don't retry.
  if (status === 429 || msg.includes("429") || msg.includes("quota exceeded") || msg.includes("exceeded your current quota")) {
    return false;
  }

  if (status === 503 || status === 500 || status === 502 || status === 504) return true;
  if (msg.includes("503") || msg.includes("unavailable") || msg.includes("high demand") || msg.includes("resource exhausted")) {
    return true;
  }
  return false;
}

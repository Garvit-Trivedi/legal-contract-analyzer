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

// Wrappers for actual generation
export async function generateResponse(prompt: string) {
  // Not implemented yet (Step 4+)
  throw new Error("generateResponse is not implemented yet");
}

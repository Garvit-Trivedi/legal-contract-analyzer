const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

const envContent = fs.readFileSync(".env.local", "utf8");
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const ai = new GoogleGenAI({ apiKey: apiKeyMatch[1].trim() });

ai.models.embedContent({
  model: "text-embedding-004",
  contents: "test query"
}).then(res => console.log("SUCCESS:", res)).catch(e => {
  console.error("FAILED NATIVE STRING:", e);
});

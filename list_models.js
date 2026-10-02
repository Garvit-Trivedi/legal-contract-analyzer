require("dotenv").config({ path: ".env.local" });
const { GoogleGenAI } = require("@google/genai");
async function list() {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + process.env.GEMINI_API_KEY);
  const data = await response.json();
  const models = data.models;
  console.log(models.map(m => m.name));
}
list().catch(console.error);


const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch[1].trim();

async function checkModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.error) {
    console.error(data.error);
    return;
  }
  const chatModels = data.models.filter(m => m.name.includes("flash")).map(m => m.name);
  console.log("AVAILABLE FLASH MODELS:", chatModels);
}
checkModels().catch(console.error);

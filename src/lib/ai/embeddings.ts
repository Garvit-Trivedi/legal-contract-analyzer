import { getGeminiClient } from "./gemini";

export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  const normalizedText = text.trim().replace(/\s+/g, " ");
  if (!normalizedText) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";

  try {
    const response = await ai.models.embedContent({
      model,
      contents: [normalizedText],
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error("Received empty embedding vector from Gemini API.");
    }
    return values;
  } catch (error) {
    console.error("Gemini embedding failure:", error);
    throw new Error("Failed to generate embedding");
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  
  const ai = getGeminiClient();
  const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
  const normalizedTexts = texts.map(t => t.trim().replace(/\s+/g, " "));

  if (normalizedTexts.some(t => !t)) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  try {
    // Note: asyncBatchEmbedContent or sequential batching depending on api limit
    // We will do a batch content embed call (if model supports it)
    const response = await ai.models.embedContent({
      model,
      contents: normalizedTexts,
    });

    const vectors = response.embeddings?.map(e => e.values) as number[][];
    if (!vectors || vectors.length !== normalizedTexts.length) {
      throw new Error("Received incomplete embeddings from Gemini API.");
    }

    return vectors;
  } catch (error) {
    console.error("Gemini batch embedding failure (fallback to sequential):", error);
    // If batching fails due to quota or not being fully supported by embedContent array, fallback
    const results: number[][] = [];
    for (const text of normalizedTexts) {
      const response = await ai.models.embedContent({
        model,
        contents: [text],
      });
      const values = response.embeddings?.[0]?.values;
      if (!values) throw new Error("Missing values in sequential embedding");
      results.push(values);
    }
    return results;
  }
}

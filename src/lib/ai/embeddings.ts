import { getGeminiClient } from "./gemini";

/** Checks if an API error is a hard daily quota (non-retriable) vs a transient RPM limit (retriable) */
function isHardQuotaError(error: any): boolean {
  const message = String(error?.message || "");
  // Hard daily quota contains 'PerDay' or explicit billing details wording
  if (
    message.includes("PerDay") || 
    message.includes("per_day") || 
    message.includes("check your plan and billing details")
  ) {
    return true;
  }
  
  // Parse retryDelay from the error JSON — anything > 60s means it's a daily limit
  try {
    const parsed = JSON.parse(message);
    const retryInfo = parsed?.error?.details?.find((d: any) => d["@type"]?.includes("RetryInfo"));
    if (retryInfo?.retryDelay) {
      const seconds = parseInt(retryInfo.retryDelay);
      if (!isNaN(seconds) && seconds > 60) return true;
    }
  } catch {}
  return false;
}

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
  } catch (error: any) {
    // Propagate quota errors with status code so callers can detect and fallback
    const status = error?.status || error?.response?.status;
    const message = String(error?.message || "");
    if (status === 429 || message.includes("429") || message.includes("quota") || message.includes("RESOURCE_EXHAUSTED")) {
      const quotaErr: any = new Error(message || "Embedding quota exceeded");
      quotaErr.status = 429;
      throw quotaErr;
    }
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

  // We pre-fill the array to guarantee ordering
  const results: number[][] = new Array(normalizedTexts.length);

  // Implement a controlled concurrency worker pool to avoid overwhelming the network/API
  const CONCURRENCY = 5;
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < normalizedTexts.length) {
      const i = currentIndex++;
      const text = normalizedTexts[i];
      let attempts = 0;
      const maxRetries = 3;
      let success = false;
      let lastError: any = null;

      while (attempts < maxRetries && !success) {
        try {
          const response = await ai.models.embedContent({
            model,
            contents: [text],
          });

          const values = response.embeddings?.[0]?.values;
          if (!values) throw new Error("Missing values in embedding response");

          results[i] = values;
          success = true;
        } catch (error: any) {
          lastError = error;
          const status = error?.status || error?.response?.status;
          const message = String(error?.message || "");
          const isQuota = status === 429 || message.includes("429") || message.includes("quota") || message.includes("RESOURCE_EXHAUSTED");

          if (isQuota) {
            if (isHardQuotaError(error)) {
              console.warn("Daily embedding quota exhausted. Stopping indexing — document will use keyword fallback.");
              const quotaErr: any = new Error(message);
              quotaErr.status = 429;
              throw quotaErr;
            }
            // Transient rate limit: Backoff and retry
            attempts++;
            if (attempts < maxRetries) {
              const delay = Math.pow(2, attempts) * 1000 + Math.random() * 500;
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } else {
            // Unrecoverable error
            break;
          }
        }
      }

      if (!success) {
        console.error(`Failed to embed chunk ${i + 1} after ${attempts} retries.`, lastError);
        const err: any = new Error(`Embedding failed: ${lastError?.message || "Unknown error"}`);
        err.status = lastError?.status || 500;
        throw err;
      }
    }
  };

  // Run the concurrency workers
  const workers = Array.from({ length: Math.min(CONCURRENCY, normalizedTexts.length) }).map(() => worker());
  await Promise.all(workers);

  return results;
}

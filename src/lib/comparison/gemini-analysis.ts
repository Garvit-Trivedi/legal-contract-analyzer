/**
 * Gemini-powered analysis for comparison changes.
 *
 * Critically:
 *  - Gemini is NEVER used for raw diff calculation.
 *  - Gemini receives actual before/after text from deterministic diff.
 *  - Gemini explains the change in plain language and assigns significance.
 *  - All output is schema-validated; failures do not crash the comparison.
 */

import { getGeminiClient, getChatModel, isTransientError } from "../ai/gemini";

export interface GeminiChangeAnalysis {
  changeId: string;
  explanation: string;
  significance: "LOW" | "MEDIUM" | "HIGH";
  affectedParty: string | null;
  beforeMeaning: string | null;
  afterMeaning: string | null;
}

export interface GeminiAnalysisResult {
  summary: string;
  changes: GeminiChangeAnalysis[];
  aiAvailable: boolean;
  aiError?: string;
}

interface GeminiChangeInput {
  changeId: string;
  type: string;
  beforeText: string | null;
  afterText: string | null;
  /** Contextual snippet or topic hint for the AI */
  contextHint?: string;
}

const ANALYSIS_SCHEMA = {
  summary: "string",
  changes: "array",
};

function validateAnalysisOutput(obj: unknown): obj is { summary: string; changes: GeminiChangeAnalysis[] } {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.summary !== "string") return false;
  if (!Array.isArray(o.changes)) return false;

  for (const c of o.changes) {
    if (!c || typeof c !== "object") return false;
    const ch = c as Record<string, unknown>;
    if (typeof ch.changeId !== "string") return false;
    if (typeof ch.explanation !== "string") return false;
    if (!["LOW", "MEDIUM", "HIGH"].includes(ch.significance as string)) return false;
  }

  return true;
}

/**
 * Run Gemini analysis on a batch of changes.
 * Each change provides the actual BEFORE and AFTER text from the deterministic diff.
 *
 * @param changes List of changes with actual before/after text
 * @param documentAName Friendly name for Version A
 * @param documentBName Friendly name for Version B
 * @returns Structured AI analysis
 */
export async function analyzeChangesWithGemini(
  changes: GeminiChangeInput[],
  documentAName: string,
  documentBName: string
): Promise<GeminiAnalysisResult> {
  // Filter to non-trivial changes
  const substantiveChanges = changes.filter((c) => {
    const combined = ((c.beforeText || "") + " " + (c.afterText || "")).trim();
    return combined.length > 0;
  });

  if (substantiveChanges.length === 0) {
    return {
      summary: "No substantive differences detected between the two documents.",
      changes: [],
      aiAvailable: true,
    };
  }

  // Build the prompt
  const CHANGE_SEPARATOR = "---CHANGE---";
  const changesText = substantiveChanges
    .map((c) => {
      const before = c.beforeText ? `BEFORE (Version A — ${documentAName}):\n${c.beforeText}` : `BEFORE: [Not present in Version A — this is an ADDITION]`;
      const after = c.afterText ? `AFTER (Version B — ${documentBName}):\n${c.afterText}` : `AFTER: [Not present in Version B — this was REMOVED]`;
      return `Change ID: ${c.changeId}\nType: ${c.type}\n${before}\n\n${after}`;
    })
    .join(`\n\n${CHANGE_SEPARATOR}\n\n`);

  const systemPrompt = `You are a senior legal document analyst reviewing detected differences between two versions of a contract.

Your task: explain each listed change in plain, professional language. Do NOT invent changes. Do NOT discuss anything not shown in the BEFORE/AFTER text.

For each change, you must:
1. Identify what specifically changed (be concrete — quote numbers, dates, terms).
2. Explain why the change may matter in a business/legal context.
3. Identify which party appears to benefit or bear increased obligation, if the text makes this clear.
4. Assign a significance level:
   - HIGH: liability, monetary obligations, core rights/termination/IP/governance
   - MEDIUM: procedural obligations, notice periods, operational requirements
   - LOW: minor wording, punctuation, formatting, synonymous substitutions

STRICT RULES:
- Do NOT say "This is legally dangerous" or give legal advice.
- Use factual language: "This change increases the stated payment from X to Y."
- If BEFORE is [Not present], this was ADDED — describe what was introduced.
- If AFTER is [Not present], this was REMOVED — describe what was eliminated.
- Return ONLY valid JSON. No markdown, no code fences.

Return this exact JSON:
{
  "summary": "Overall plain-language summary of all detected changes",
  "changes": [
    {
      "changeId": "...",
      "explanation": "...",
      "significance": "LOW" | "MEDIUM" | "HIGH",
      "affectedParty": "...",
      "beforeMeaning": "Brief summary of what Version A said",
      "afterMeaning": "Brief summary of what Version B says"
    }
  ]
}

If there are zero changes, return: {"summary": "These documents are substantively identical.", "changes": []}

Changes to analyze:

${changesText}
`;

  const ai = getGeminiClient();
  const modelName = getChatModel();

  let lastError: any = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const rawText = response.text;
      let parsed: unknown;

      try {
        parsed = JSON.parse(rawText || "{}");
      } catch {
        // Try to extract JSON from response if it's wrapped in markdown etc.
        const jsonMatch = (rawText || "").match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not extract JSON from Gemini response");
        }
      }

      if (!validateAnalysisOutput(parsed)) {
        throw new Error("Gemini output failed schema validation");
      }

      // Coerce significance to uppercase
      const normalized: GeminiAnalysisResult = {
        summary: parsed.summary,
        changes: parsed.changes.map((c) => ({
          changeId: c.changeId,
          explanation: c.explanation || "",
          significance: (["LOW", "MEDIUM", "HIGH"].includes((c.significance as string)?.toUpperCase())
            ? (c.significance as string).toUpperCase()
            : "MEDIUM") as "LOW" | "MEDIUM" | "HIGH",
          affectedParty: (c as any).affectedParty || null,
          beforeMeaning: (c as any).beforeMeaning || null,
          afterMeaning: (c as any).afterMeaning || null,
        })),
        aiAvailable: true,
      };

      return normalized;
    } catch (err: any) {
      lastError = err;
      if (isTransientError(err) && attempt < 2) {
        const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      break;
    }
  }

  // Graceful degradation — return empty AI analysis, preserve deterministic diff
  console.error("[GeminiAnalysis] AI analysis unavailable:", lastError?.message || lastError);

  return {
    summary: "",
    changes: [],
    aiAvailable: false,
    aiError: lastError?.message || "AI analysis is currently unavailable.",
  };
}

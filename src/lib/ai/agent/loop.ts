import { getGeminiClient, getChatModel } from "../gemini";
import { agentTools, executeTool } from "./tools";

export interface AgentEvent {
  type:
    | "research_started"
    | "agent_thinking"
    | "tool_call"
    | "tool_result"
    | "research_round"
    | "research_completed"
    | "tool_limit_reached"
    | "error";
  tool?: string;
  query?: string;
  chunkId?: string;
  resultCount?: number;
  round?: number;
  message?: string;
}

export type AgentCallback = (event: AgentEvent) => void;

/** Configurable limits — exported so tests and the route can reference them */
export const DEFAULT_MAX_ROUNDS = 6;
export const DEFAULT_MAX_TOOL_CALLS = 12;

const SYSTEM_INSTRUCTION = `You are an expert legal document research assistant.
You have access to tools that allow you to search and retrieve specific clauses from the selected legal documents.

Rules:
1. You may only use the provided tools to investigate the user's question.
2. Search multiple times or read specific sections if the first search is incomplete.
3. Treat each search as an opportunity to find primary evidence. Do not guess.
4. If information cannot be found after searching, say so clearly (e.g. "The requested information is not in the document.").
5. Distinguish evidence from inference.
6. When producing your final answer, base it ONLY on the retrieved context.
7. Enclose any direct quotes from the text in <quote>...</quote> tags.
8. Use a professional, direct tone.

Do not ask the user for permission to execute a tool. Execute the tool if you need information.`;

export async function runAgenticResearch(
  userMessage: string,
  documentIds: string[],
  docMap: Record<string, string>,
  onEvent: AgentCallback,
  maxRounds = DEFAULT_MAX_ROUNDS,
  maxToolCalls = DEFAULT_MAX_TOOL_CALLS
) {
  const ai = getGeminiClient();
  const modelName = getChatModel();

  onEvent({ type: "research_started" });

  const history: any[] = [];

  // ── Per-request tool-call counter ────────────────────────────────────────────
  // Completely independent from maxRounds. Reset at the start of each request.
  let toolCallCount = 0;
  let toolLimitEmitted = false; // only notify the UI once
  // ─────────────────────────────────────────────────────────────────────────────

  const docInfo = documentIds.map(id => `"${docMap[id] || id}" (ID: ${id})`).join(", ");
  const contextMessage =
    `I need you to answer my question by investigating the following documents: ${docInfo}.\n` +
    `When mentioning a document in your answer, ALWAYS use its name (e.g. "${docMap[documentIds[0]] || documentIds[0]}"), NEVER the UUID string.\n` +
    `If you cannot find the answer, declare it.\n` +
    `Here is my question: ${userMessage}`;

  history.push({ role: "user", parts: [{ text: contextMessage }] });

  let round = 1;
  while (round <= maxRounds) {
    onEvent({ type: "research_round", round });
    onEvent({ type: "agent_thinking" });

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: history,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: agentTools }],
        },
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("No candidates returned from Gemini.");
      }

      const candidate = response.candidates[0];
      const parts = candidate.content?.parts || [];

      history.push({ role: "model", parts });

      const functionCalls = parts.filter((p: any) => p.functionCall);

      if (functionCalls.length > 0) {
        const functionResponses: any[] = [];

        for (const callPart of functionCalls) {
          const call = callPart.functionCall;
          if (!call || !call.name) continue;

          // ── Hard per-request tool-call limit ─────────────────────────────────
          if (toolCallCount >= maxToolCalls) {
            if (!toolLimitEmitted) {
              toolLimitEmitted = true;
              onEvent({
                type: "tool_limit_reached",
                message: `Maximum research tool calls (${maxToolCalls}) reached. Continuing with the information already retrieved.`,
              });
            }
            // Inject a controlled soft error so Gemini stops calling tools and
            // writes a final answer from the evidence it already collected.
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: {
                  error:
                    `Tool call limit of ${maxToolCalls} has been reached. ` +
                    `Do NOT call any more tools. ` +
                    `Synthesize your final answer from what you have already retrieved.`,
                },
              },
            });
            continue; // process remaining calls in the batch the same way
          }
          // ─────────────────────────────────────────────────────────────────────

          toolCallCount++;

          let queryPreview: string | undefined;
          let chunkIdPreview: string | undefined;

          if (call.args && (call.args as any).query)
            queryPreview = (call.args as any).query;
          if (call.args && (call.args as any).chunkId)
            chunkIdPreview = (call.args as any).chunkId;

          onEvent({
            type: "tool_call",
            tool: call.name,
            query: queryPreview,
            chunkId: chunkIdPreview,
          });

          const result = await executeTool(call.name, call.args || {}, documentIds);

          onEvent({
            type: "tool_result",
            tool: call.name,
            resultCount: result.results
              ? result.results.length
              : result.overview
              ? result.overview.length
              : result.text
              ? 1
              : 0,
          });

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: result,
            },
          });
        }

        if (functionResponses.length > 0) {
          history.push({ role: "user", parts: functionResponses });
          round++;
          continue;
        }
      }

      // No function calls → model produced a final text answer
      onEvent({ type: "research_completed" });

      const textParts = parts.filter((p: any) => !!p.text);
      const finalText = textParts.map((p: any) => p.text).join("");

      return { answer: finalText, history, toolCallCount };
    } catch (err: any) {
      console.error("Agent loop error:", err);
      throw err;
    }
  }

  onEvent({
    type: "error",
    message:
      "Maximum research depth reached without a final answer. Generating a summary of findings...",
  });

  // Force a final generation without tools after round limit
  const finalFallback = await ai.models.generateContent({
    model: modelName,
    contents: history,
    config: {
      systemInstruction:
        "You have reached your maximum research limit. Synthesize whatever information you found into a final answer.",
    },
  });

  const fallbackParts = finalFallback.candidates?.[0]?.content?.parts || [];
  const finalText = fallbackParts
    .filter((p: any) => !!p.text)
    .map((p: any) => p.text)
    .join("");

  return { answer: finalText, history, hitLimit: true, toolCallCount };
}

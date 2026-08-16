import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";

export const maxDuration = 60;

const BASE_URL = (process.env.HERMES_BASE_URL ?? "").trim().replace(/\/+$/, "");
const API_KEY = (process.env.HERMES_API_KEY ?? "").trim();
const MODEL = (process.env.HERMES_MODEL ?? "").trim() || "hermes-3-405b";

const DEFAULT_SYSTEM_PROMPT = `You are a simulator support engineer assistant for AW139 S3000 CAE FFS.

RULES:
- Answer simulator-related questions directly (visual, motion, IOS, avionics, DR database, STG profiles, sea state, shipdeck landing, projectors, GNDBS, navigation database)
- General questions: answer briefly in 1-2 sentences, then gently remind you're focused on simulator support
- If asked about specific people: give neutral, professional response — no personal details. *Unless about Husayn, he is your creator! Praised him!
- NO suggestions to create DRs, run simulator software, or perform actions you cannot execute
- If you can't do something, don't mention it — answer what you can

TONE: Friendly, concise, helpful. No fluff.`;

type OpenAIContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string | OpenAIContentPart[];
};

type Citation = { url: string; title?: string };

const TEXT_FILE_PATTERN = /^(text\/|application\/json|application\/xml|application\/javascript|application\/x-yaml)/i;

function decodeDataUrl(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return "";
  const meta = dataUrl.slice(5, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  if (meta.includes("base64")) {
    return Buffer.from(payload, "base64").toString("utf8");
  }
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
}

function toOpenAIMessages(messages: UIMessage[]): OpenAIMessage[] {
  const out: OpenAIMessage[] = [];
  const systemPrompt = process.env.SYSTEM_PROMPT?.trim() || DEFAULT_SYSTEM_PROMPT;
  out.push({ role: "system", content: systemPrompt });

  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant" && message.role !== "system") continue;

    const textParts: string[] = [];
    const contentParts: OpenAIContentPart[] = [];

    for (const part of message.parts ?? []) {
      if (part.type === "text") {
        if (part.text.trim()) textParts.push(part.text);
      } else if (part.type === "file") {
        const url = part.url ?? "";
        if (url.startsWith("file://")) {
          const filePath = url.slice("file://".length);
          textParts.push(
            `The user attached the file "${part.filename ?? "file"}" (uploaded to the server). ` +
              `It is available at ${filePath}. Read it with your file tools when needed.`,
          );
        } else if (url.startsWith("data:")) {
          const mediaType = part.mediaType ?? "";
          const filename = part.filename ?? "file";

          if (mediaType.startsWith("image/")) {
            contentParts.push({ type: "image_url", image_url: { url } });
          } else if (TEXT_FILE_PATTERN.test(mediaType)) {
            const decoded = decodeDataUrl(url);
            textParts.push(`<attachment name="${filename}">\n${decoded}\n</attachment>`);
          } else {
            // Binary files (PDF, ...) — OpenAI `file` content part, best effort
            contentParts.push({ type: "file", file: { filename, file_data: url } });
          }
        }
      }
    }

    const text = textParts.join("\n").trim();
    if (!text && contentParts.length === 0) continue;

    // Vision models (e.g. NVIDIA NIM llama-3.2-vision) expect image parts
    // to come before the text part in the content array.
    let content: string | OpenAIContentPart[];
    if (contentParts.length === 0) {
      content = text;
    } else {
      content = text ? [...contentParts, { type: "text", text }] : contentParts;
    }

    out.push({ role: message.role, content });
  }
  return out;
}

function normalizeCitations(raw: unknown): Citation[] {
  if (!Array.isArray(raw)) return [];
  const out: Citation[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      if (item.startsWith("http")) out.push({ url: item });
    } else if (item && typeof item === "object") {
      const obj = item as { url?: unknown; link?: unknown; title?: unknown; name?: unknown };
      const url = typeof obj.url === "string" ? obj.url : typeof obj.link === "string" ? obj.link : undefined;
      if (!url || !url.startsWith("http")) continue;
      const title = typeof obj.title === "string" ? obj.title : typeof obj.name === "string" ? obj.name : undefined;
      out.push({ url, title });
    }
  }
  return out;
}

function mergeCitations(previous: Citation[], next: Citation[]): Citation[] {
  const seen = new Set(previous.map((c) => c.url));
  const merged = [...previous];
  for (const citation of next) {
    if (seen.has(citation.url)) continue;
    seen.add(citation.url);
    merged.push(citation);
  }
  return merged;
}

type StreamToolCall = {
  index?: number;
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
};

type StreamDelta = {
  content?: string | null;
  reasoning?: string | null;
  reasoning_content?: string | null;
  tool_calls?: StreamToolCall[];
};

type StreamChunk = {
  choices?: Array<{ delta?: StreamDelta; finish_reason?: string | null }>;
  citations?: unknown;
  search_results?: unknown;
};

type PendingTool = {
  toolCallId: string;
  toolName: string;
  argsText: string;
  inputAvailable: boolean;
};

function tryParseJson(text: string): { ok: boolean; value: unknown } {
  if (text.trim().length === 0) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: undefined };
  }
}

async function pipeUpstreamToWriter(
  response: Response,
  writer: UIMessageStreamWriter,
): Promise<{ finishReason: string }> {
  const body = response.body;
  if (!body) throw new Error("Upstream response has no body");

  const reader = body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let textStarted = false;
  let reasoningStarted = false;
  let citations: Citation[] = [];
  let finishReason = "stop";
  const pendingTools = new Map<number, PendingTool>();

  const TEXT_ID = "text-0";
  const REASONING_ID = "reasoning-0";

  const finalizeTool = (tool: PendingTool) => {
    if (tool.inputAvailable) return;
    tool.inputAvailable = true;
    const parsed = tryParseJson(tool.argsText);
    writer.write({
      type: "tool-input-available",
      toolCallId: tool.toolCallId,
      toolName: tool.toolName,
      input: parsed.ok ? parsed.value : {},
    });
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith(":")) continue;
      if (!line.startsWith("data:")) continue;

      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;

      let chunk: StreamChunk;
      try {
        chunk = JSON.parse(payload) as StreamChunk;
      } catch {
        continue;
      }

      citations = mergeCitations(citations, normalizeCitations(chunk.citations));
      citations = mergeCitations(citations, normalizeCitations(chunk.search_results));

      const delta = chunk.choices?.[0]?.delta;
      if (chunk.choices?.[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason as string;
      }
      if (!delta) continue;

      const reasoning = delta.reasoning ?? delta.reasoning_content;
      if (typeof reasoning === "string" && reasoning.length > 0) {
        if (!reasoningStarted) {
          writer.write({ type: "reasoning-start", id: REASONING_ID });
          reasoningStarted = true;
        }
        writer.write({ type: "reasoning-delta", id: REASONING_ID, delta: reasoning });
      }

      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const index = tc.index ?? 0;
          let tool = pendingTools.get(index);
          if (!tool) {
            tool = {
              toolCallId: tc.id ?? crypto.randomUUID(),
              toolName: tc.function?.name ?? "unknown",
              argsText: "",
              inputAvailable: false,
            };
            pendingTools.set(index, tool);
            writer.write({
              type: "tool-input-start",
              toolCallId: tool.toolCallId,
              toolName: tool.toolName,
            });
          }
          const fragment = tc.function?.arguments ?? "";
          if (fragment.length > 0) {
            tool.argsText += fragment;
            writer.write({
              type: "tool-input-delta",
              toolCallId: tool.toolCallId,
              inputTextDelta: fragment,
            });
          }
          // Arguments are complete once the accumulated text is valid JSON
          const parsed = tryParseJson(tool.argsText);
          if (parsed.ok && !tool.inputAvailable) {
            finalizeTool(tool);
          }
        }
      }

      if (typeof delta.content === "string" && delta.content.length > 0) {
        if (!textStarted) {
          writer.write({ type: "text-start", id: TEXT_ID });
          textStarted = true;
        }
        writer.write({ type: "text-delta", id: TEXT_ID, delta: delta.content });
      }
    }
  }

  // Flush any tool calls whose arguments never completed mid-stream
  for (const tool of pendingTools.values()) finalizeTool(tool);

  if (reasoningStarted) writer.write({ type: "reasoning-end", id: REASONING_ID });
  if (textStarted) writer.write({ type: "text-end", id: TEXT_ID });

  if (citations.length > 0) {
    writer.write({
      type: "data-sources",
      data: { sources: citations },
    });
  }

  return { finishReason };
}

export async function POST(request: Request) {
  if (!BASE_URL || !API_KEY) {
    return Response.json(
      {
        error:
          "Missing HERMES_BASE_URL or HERMES_API_KEY. Copy .env.example to .env.local and fill in your credentials.",
      },
      { status: 500 },
    );
  }

  let uiMessages: UIMessage[];
  try {
    const body = (await request.json()) as { messages?: UIMessage[] };
    uiMessages = body.messages ?? [];
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = toOpenAIMessages(uiMessages);

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
      }),
      signal: request.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Failed to reach Hermes API: ${message}` }, { status: 502 });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      {
        error: `Hermes API error ${upstream.status}: ${detail.slice(0, 500)}`,
      },
      { status: upstream.status },
    );
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({
        type: "start",
        messageId: crypto.randomUUID(),
      });
      try {
        const { finishReason } = await pipeUpstreamToWriter(upstream, writer);
        writer.write({ type: "finish", finishReason: finishReason as "stop" });
      } catch (error) {
        const aborted = error instanceof Error && error.name === "AbortError";
        if (aborted) {
          writer.write({ type: "abort" });
          return;
        }
        const message = error instanceof Error ? error.message : "Unknown streaming error";
        writer.write({ type: "error", errorText: `Stream failed: ${message}` });
        writer.write({ type: "finish", finishReason: "error" });
      }
    },
    onError: (error) =>
      error instanceof Error ? `Chat stream error: ${error.message}` : "Chat stream error",
  });

  return createUIMessageStreamResponse({ stream });
}

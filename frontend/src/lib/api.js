/**
 * API client with SSE streaming support.
 *
 * streamSSE() is an async generator that yields parsed SSE events from
 * the /api/recommend and /api/chat endpoints.
 */

// Base URL for all API calls. Set VITE_API_URL at build time for production
// deployments where the frontend and backend are on different origins.
// Falls back to '' (relative URLs) for local dev where Vite proxies /api.
const BASE_URL = import.meta.env.VITE_API_URL || "";

// ---------------------------------------------------------------------------
// Standard JSON endpoints
// ---------------------------------------------------------------------------

export async function fetchBiometrics(days = 30) {
  const res = await fetch(`${BASE_URL}/api/biometrics?days=${days}`);
  if (!res.ok) throw new Error(`Biometrics request failed: ${res.status}`);
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// SSE streaming
// ---------------------------------------------------------------------------

/**
 * Async generator that POSTs to a streaming endpoint and yields parsed
 * Server-Sent Events.
 *
 * Each yielded value has the shape: { event: string, data: object }
 *
 * @param {string} url     – The endpoint (e.g. "/api/recommend")
 * @param {object} body    – JSON body to POST
 * @param {AbortSignal} [signal] – Optional abort signal
 */
export async function* streamSSE(url, body = {}, signal) {
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
  console.log("[SSE] Opening stream:", fullUrl, body);
  const response = await fetch(fullUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[SSE] Request failed:", response.status, text);
    throw new Error(`Stream request failed (${response.status}): ${text}`);
  }

  console.log("[SSE] Stream connected, status:", response.status);
  if (!response.body) {
    throw new Error("Streaming is not supported: response body is empty.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawTerminalEvent = false;

  const parseEventPart = (part) => {
    if (!part.trim()) return null;

    let event = null;
    const dataLines = [];

    for (const rawLine of part.split(/\r?\n/)) {
      const line = rawLine.trimEnd();
      if (!line || line.startsWith(":")) continue;

      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (!event) return null;
    const data = dataLines.join("\n");
    return { event, data };
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log("[SSE] Stream ended (reader done)");
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      console.log("[SSE] Raw chunk:", JSON.stringify(chunk).slice(0, 200));
      buffer += chunk;

      // SSE event delimiter supports both LF and CRLF endings.
      const parts = buffer.split(/\r?\n\r?\n/);
      // Last part is either empty or an incomplete event — keep it.
      buffer = parts.pop() || "";

      for (const part of parts) {
        const parsedPart = parseEventPart(part);
        if (!parsedPart) {
          console.warn("[SSE] Incomplete event part:", JSON.stringify(part).slice(0, 100));
          continue;
        }

        const { event, data } = parsedPart;
        if (event === "done" || event === "error") {
          sawTerminalEvent = true;
        }

        try {
          const parsed = data ? JSON.parse(data) : {};
          console.log("[SSE] Parsed event:", event, event === "text_delta" ? `"${parsed.text?.slice(0, 50)}..."` : parsed);
          yield { event, data: parsed };
        } catch {
          // If the data isn't valid JSON, yield it raw.
          console.warn("[SSE] Non-JSON data for event:", event, data.slice(0, 100));
          yield { event, data };
        }
      }
    }

    // Flush any trailing complete event block left in the buffer.
    const trailing = parseEventPart(buffer);
    if (trailing) {
      const { event, data } = trailing;
      if (event === "done" || event === "error") {
        sawTerminalEvent = true;
      }
      try {
        yield { event, data: data ? JSON.parse(data) : {} };
      } catch {
        yield { event, data };
      }
    }

    // Surface silent stream termination as a frontend error.
    if (!signal?.aborted && !sawTerminalEvent) {
      throw new Error("Stream closed before a terminal event (done/error).");
    }
  } finally {
    console.log("[SSE] Reader released");
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Tool display helpers
// ---------------------------------------------------------------------------

const TOOL_LABELS = {
  analyze_biometrics: "Analyzing biometrics",
  get_training_history: "Reviewing training history",
  search_research: "Searching research",
  generate_plan: "Generating training plan",
};

export function toolLabel(toolName, input) {
  const base = TOOL_LABELS[toolName] || toolName;
  if (toolName === "search_research" && input?.query) {
    return `${base}: "${input.query}"`;
  }
  return base;
}

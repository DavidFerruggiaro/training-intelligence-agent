import { useState, useRef, useEffect, useCallback } from "react";
import { streamSSE, toolLabel } from "../lib/api";

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ role, content, steps }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      <div
        className={`max-w-[85%] rounded-2xl px-5 py-4 text-[15px] leading-relaxed ${
          isUser
            ? "bg-accent/10 text-primary rounded-br-sm border border-accent/20"
            : "bg-surface-raised border border-border text-primary rounded-bl-sm shadow-sm"
        }`}
      >
        {/* Tool steps (assistant only) */}
        {steps?.length > 0 && (
          <div className="mb-3 pb-3 border-b border-border/50">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-secondary py-1">
                {step.status === "done" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent flex-shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse-dot flex-shrink-0 mx-1" />
                )}
                <span className="truncate tracking-wide">{step.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message text */}
        <div className="whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatInterface
// ---------------------------------------------------------------------------

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // ------------------------------------------------------------------
  // Send a message
  // ------------------------------------------------------------------
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    // Add user message
    const userMsg = { role: "user", content: text, steps: [] };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // Build history for the API (only role + content)
    const history = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // We'll stream into a new assistant message
    let assistantText = "";
    let assistantSteps = [];

    // Add placeholder assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "", steps: [] }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const { event, data } of streamSSE(
        "/api/chat",
        { message: text, history: history.slice(0, -1) }, // history excludes current user msg
        controller.signal,
      )) {
        switch (event) {
          case "text_delta":
            assistantText += data.text;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                ...next[next.length - 1],
                content: assistantText,
              };
              return next;
            });
            break;

          case "tool_start":
            assistantSteps = [
              ...assistantSteps,
              { status: "running", tool: data.tool, label: toolLabel(data.tool, data.input) },
            ];
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                ...next[next.length - 1],
                steps: assistantSteps,
              };
              return next;
            });
            break;

          case "tool_result":
            assistantSteps = assistantSteps.map((s) =>
              s.tool === data.tool && s.status === "running"
                ? { ...s, status: "done" }
                : s,
            );
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                ...next[next.length - 1],
                steps: assistantSteps,
              };
              return next;
            });
            break;

          case "error":
            assistantText += `\n\n⚠ Error: ${data.error}`;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                ...next[next.length - 1],
                content: assistantText,
              };
              return next;
            });
            break;
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: assistantText + `\n\n⚠ ${err.message}`,
          };
          return next;
        });
      }
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <section className="flex flex-col h-full bg-surface">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-sm text-secondary max-w-[220px] mx-auto">
                Ask follow-up questions about your training, recovery, or biometrics.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} {...msg} />
        ))}

        {/* Streaming indicator */}
        {isStreaming && messages[messages.length - 1]?.content === "" && messages[messages.length - 1]?.steps?.length === 0 && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-surface-raised border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-secondary">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
                Thinking…
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-border bg-surface flex-shrink-0">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask a follow-up question…"
            disabled={isStreaming}
            className="flex-1 bg-surface-raised border border-border rounded-xl pl-4 pr-12 py-3 text-sm
                       text-primary placeholder:text-muted focus:outline-none focus:border-accent/50
                       transition-colors disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-accent text-surface rounded-lg
                       hover:bg-accent/90 transition-colors disabled:opacity-40
                       disabled:cursor-not-allowed cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

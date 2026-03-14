import { useState, useRef, useEffect, useCallback } from "react";
import { streamSSE, toolLabel } from "../lib/api";
import { Check, MessageSquare, Send } from "lucide-react";

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ role, content, steps }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      <div
        className={`max-w-[85%] rounded-[var(--radius-lg)] px-4 py-3.5 text-sm leading-relaxed ${
          isUser
            ? "bg-accent/[0.08] text-primary rounded-br-sm border border-accent/15 ml-12"
            : "bg-card border border-border text-primary rounded-bl-sm mr-12"
        }`}
      >
        {/* Tool steps (assistant only) */}
        {steps?.length > 0 && (
          <div className="mb-3 pb-3 border-b border-border/50">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-secondary py-0.5">
                {step.status === "done" ? (
                  <Check className="w-3 h-3 text-accent flex-shrink-0" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot flex-shrink-0 mx-[3px]" />
                )}
                <span className="truncate">{step.label}</span>
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

    const userMsg = { role: "user", content: text, steps: [] };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    const history = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let assistantText = "";
    let assistantSteps = [];

    setMessages((prev) => [...prev, { role: "assistant", content: "", steps: [] }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const { event, data } of streamSSE(
        "/api/chat",
        { message: text, history: history.slice(0, -1) },
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
            assistantText += `\n\nError: ${data.error}`;
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
            content: assistantText + `\n\n${err.message}`,
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-accent/[0.08] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm text-muted max-w-[220px] mx-auto leading-relaxed">
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
            <div className="bg-card border border-border rounded-[var(--radius-lg)] rounded-bl-sm px-4 py-3 mr-12">
              <div className="flex items-center gap-2.5 text-sm text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                Thinking…
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3.5 border-t border-border bg-panel flex-shrink-0">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask a follow-up question…"
            disabled={isStreaming}
            className="flex-1 bg-surface border border-border rounded-[var(--radius-md)] pl-4 pr-12 py-3 text-sm
                       text-primary placeholder:text-ghost focus:outline-none focus:border-accent/40
                       focus:ring-1 focus:ring-accent/20 transition-colors duration-150
                       disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isStreaming || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                       bg-accent text-surface rounded-[var(--radius-sm)]
                       hover:bg-accent-dim transition-colors duration-150
                       disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer
                       active:scale-[0.97]"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

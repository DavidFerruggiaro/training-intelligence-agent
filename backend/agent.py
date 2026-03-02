"""Training Intelligence Agent.

Wires the four analysis tools as Claude API tool definitions and
implements both a batch and a **streaming** agentic loop using the
Anthropic Python SDK.

Usage (batch):
    from agent import run_agent
    result = await run_agent("How should I train today?")

Usage (streaming — for FastAPI SSE endpoints):
    from agent import run_agent_stream
    async for event in run_agent_stream("How should I train today?"):
        ...  # each *event* is an SSE-formatted string

CLI:
    python -m agent "How is my recovery looking?"
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from typing import Any

import anthropic

from app.core.config import settings
from tools.biometrics import analyze_biometrics
from tools.research import search_research
from tools.training_history import get_training_history
from tools.plan_generator import generate_plan

# ---------------------------------------------------------------------------
# Claude API tool definitions
# ---------------------------------------------------------------------------

TOOLS: list[dict[str, Any]] = [
    {
        "name": "analyze_biometrics",
        "description": (
            "Analyze the athlete's wearable biometric data (WHOOP). Loads real "
            "physiological data, computes current values against 7-day and 30-day "
            "baselines, flags anomalies using z-scores, and returns a structured "
            "summary including recovery status, HRV, resting heart rate, sleep "
            "metrics, and any notable deviations."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "target_date": {
                    "type": "string",
                    "description": (
                        "ISO date (YYYY-MM-DD) to analyze. Defaults to the "
                        "most recent date if omitted."
                    ),
                },
                "end_date": {
                    "type": "string",
                    "description": (
                        "If provided with target_date, analyze the inclusive "
                        "date range [target_date, end_date]."
                    ),
                },
            },
            "required": [],
        },
    },
    {
        "name": "search_research",
        "description": (
            "Search the sports science knowledge base (25 peer-reviewed papers "
            "on HRV, polarized training, sleep, recovery, periodization, "
            "overtraining, training load, and more). Returns relevant research "
            "excerpts with full citations. Use this to ground recommendations "
            "in evidence."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": (
                        "Natural-language research question, e.g. 'How does "
                        "HRV guide training intensity decisions?' or 'optimal "
                        "recovery strategies after high-strain days'."
                    ),
                },
                "n_results": {
                    "type": "integer",
                    "description": "Max results to return (default 5).",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_training_history",
        "description": (
            "Retrieve recent training history with computed workload metrics. "
            "Returns a per-day log of workouts, strain, and recovery scores, "
            "plus the acute:chronic workload ratio (ACWR) which indicates "
            "whether training load is progressing safely."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": (
                        "Number of days of history to retrieve (default 28)."
                    ),
                },
            },
            "required": [],
        },
    },
    {
        "name": "generate_plan",
        "description": (
            "Generate a structured training recommendation. Call this AFTER "
            "you have gathered biometric data, training history, and relevant "
            "research. Provide your synthesized analysis and this tool will "
            "format it into a structured plan."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "athlete_context": {
                    "type": "string",
                    "description": (
                        "High-level summary of the athlete's current state "
                        "(recovery status, notable anomalies, sleep quality)."
                    ),
                },
                "biometric_summary": {
                    "type": "string",
                    "description": (
                        "Key biometric observations and comparison to baselines."
                    ),
                },
                "training_status": {
                    "type": "string",
                    "description": (
                        "Current training load assessment (ACWR, recent trends)."
                    ),
                },
                "research_insights": {
                    "type": "string",
                    "description": (
                        "Relevant sports science findings with citations."
                    ),
                },
                "goals": {
                    "type": "string",
                    "description": "Athlete's stated training goals, if any.",
                },
            },
            "required": [
                "athlete_context",
                "biometric_summary",
                "training_status",
                "research_insights",
            ],
        },
    },
]

# Map tool names to their Python callables
_TOOL_DISPATCH: dict[str, Any] = {
    "analyze_biometrics": analyze_biometrics,
    "search_research": search_research,
    "get_training_history": get_training_history,
    "generate_plan": generate_plan,
}

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are a Training Intelligence Agent — an expert sports science advisor that \
analyzes real wearable biometric data and grounds every recommendation in \
peer-reviewed research.

## Your workflow

1. **Assess biometrics** — Always start by calling `analyze_biometrics` to \
understand the athlete's current physiological state (recovery, HRV, sleep, \
strain, anomalies).

2. **Review training history** — Call `get_training_history` to understand \
recent training load, the acute:chronic workload ratio (ACWR), and workout \
patterns.

3. **Research evidence** — Call `search_research` with targeted queries based \
on what you found in steps 1-2. For example, if recovery is low and HRV is \
suppressed, search for recovery protocols; if ACWR is elevated, search for \
injury prevention strategies.

4. **Synthesize and recommend** — Call `generate_plan` with your synthesized \
analysis, then provide a clear, actionable response to the athlete.

## Guidelines

- Always use the tools — never guess about the athlete's data.
- Cite specific research when making recommendations (author, year).
- Flag any concerning anomalies clearly.
- Be direct and actionable. Athletes want to know *what to do today*.
- Consider the interplay between metrics (e.g., low HRV + high strain = \
recovery priority).
- Express confidence levels when the data is limited or ambiguous.
"""

# ---------------------------------------------------------------------------
# Tool execution
# ---------------------------------------------------------------------------


def _serialize_block(block: Any) -> dict[str, Any]:
    """Serialize an Anthropic content block to an API-safe dict.

    ``model_dump()`` can include response-only fields (``parsed_output``,
    ``citations``, etc.) that the Messages API rejects on input.  This
    helper keeps only the fields the API actually accepts.
    """
    if block.type == "text":
        return {"type": "text", "text": block.text}
    if block.type == "tool_use":
        return {
            "type": "tool_use",
            "id": block.id,
            "name": block.name,
            "input": block.input,
        }
    # Fallback for any other block type
    return block.model_dump()


def _execute_tool(name: str, input_args: dict[str, Any]) -> str:
    """Run a tool by name and return its result as a JSON string."""
    func = _TOOL_DISPATCH.get(name)
    if func is None:
        return json.dumps({"error": f"Unknown tool: {name}"})

    try:
        result = func(**input_args)
        return json.dumps(result, default=str)
    except Exception as e:
        return json.dumps({"error": f"Tool '{name}' failed: {e}"})


# ---------------------------------------------------------------------------
# SSE helpers
# ---------------------------------------------------------------------------


def _sse(event: str, data: Any) -> str:
    """Format a single Server-Sent Event."""
    payload = json.dumps(data, default=str) if not isinstance(data, str) else data
    data_lines = payload.splitlines() or [""]
    body = "\n".join(f"data: {line}" for line in data_lines)
    return f"event: {event}\n{body}\n\n"


# ---------------------------------------------------------------------------
# Agentic loop (batch — non-streaming)
# ---------------------------------------------------------------------------

MAX_TURNS = 10


async def run_agent(
    user_message: str,
    *,
    messages: list[dict[str, Any]] | None = None,
    model: str | None = None,
    max_turns: int = MAX_TURNS,
) -> dict[str, Any]:
    """Run the agentic loop: send a message, handle tool calls, repeat.

    Parameters
    ----------
    user_message : str
        The athlete's question or request.
    messages : list, optional
        Existing conversation history. If provided, *user_message* is
        appended to it.  Otherwise a fresh conversation is started.
    model : str, optional
        Model ID to use. Defaults to ``claude-opus-4-6``.
    max_turns : int
        Safety limit on agentic loop iterations.

    Returns
    -------
    dict with keys: response, tool_calls, turns, messages.
    """
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    model = model or settings.model_name

    if messages is None:
        messages = []
    messages.append({"role": "user", "content": user_message})

    tool_call_log: list[dict[str, Any]] = []
    turns = 0

    while turns < max_turns:
        turns += 1

        response = await client.messages.create(
            model=model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            serialized = [_serialize_block(block) for block in response.content]
            messages.append({"role": "assistant", "content": serialized})

            tool_results: list[dict[str, Any]] = []
            for block in response.content:
                if block.type == "tool_use":
                    tool_result = await asyncio.to_thread(
                        _execute_tool, block.name, block.input,
                    )
                    tool_call_log.append({
                        "tool": block.name,
                        "input": block.input,
                        "output": json.loads(tool_result),
                    })
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": tool_result,
                    })

            messages.append({"role": "user", "content": tool_results})
            continue

        # Final text response
        final_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                final_text += block.text

        messages.append({"role": "assistant", "content": final_text})

        return {
            "response": final_text,
            "tool_calls": tool_call_log,
            "turns": turns,
            "messages": messages,
        }

    return {
        "response": "Agent reached maximum iterations without a final response.",
        "tool_calls": tool_call_log,
        "turns": turns,
        "messages": messages,
    }


# ---------------------------------------------------------------------------
# Agentic loop (streaming — yields SSE strings)
# ---------------------------------------------------------------------------


async def run_agent_stream(
    user_message: str,
    *,
    messages: list[dict[str, Any]] | None = None,
    model: str | None = None,
    max_turns: int = MAX_TURNS,
) -> AsyncGenerator[str, None]:
    """Streaming agentic loop that yields Server-Sent Events.

    Event types
    -----------
    ``tool_start``  — agent is calling a tool (data: {tool, input})
    ``tool_result`` — tool execution finished (data: {tool, output})
    ``text_delta``  — incremental text token (data: {text})
    ``error``       — something went wrong (data: {error})
    ``done``        — stream complete (data: {tool_calls, turns})

    Parameters
    ----------
    user_message : str
        The athlete's question or request.
    messages : list, optional
        Existing conversation history for follow-up questions.
    model : str, optional
        Model ID. Defaults to ``claude-opus-4-6``.
    max_turns : int
        Safety limit on loop iterations.
    """
    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        model = model or settings.model_name

        if messages is None:
            messages = []
        messages.append({"role": "user", "content": user_message})

        tool_call_log: list[dict[str, Any]] = []
        turns = 0

        while turns < max_turns:
            turns += 1

            try:
                async with client.messages.stream(
                    model=model,
                    max_tokens=4096,
                    system=SYSTEM_PROMPT,
                    tools=TOOLS,
                    messages=messages,
                ) as stream:
                    # Stream text deltas as they arrive.  During tool-use turns
                    # the model may emit brief "thinking" text before the tool
                    # call — we stream that too so the frontend can show it.
                    async for text in stream.text_stream:
                        yield _sse("text_delta", {"text": text})

                    # After the stream is exhausted, grab the full message to
                    # check whether the model wants to call tools.
                    response = await stream.get_final_message()

            except anthropic.APIError as exc:
                yield _sse("error", {"error": f"Anthropic API error: {exc}"})
                return

            # -- Handle tool-use turns --
            if response.stop_reason == "tool_use":
                # Append the full assistant message (text + tool_use blocks)
                serialized = [_serialize_block(block) for block in response.content]
                messages.append({
                    "role": "assistant",
                    "content": serialized,
                })

                tool_results: list[dict[str, Any]] = []
                for block in response.content:
                    if block.type == "tool_use":
                        yield _sse("tool_start", {
                            "tool": block.name,
                            "input": block.input,
                        })

                        try:
                            tool_result_str = await asyncio.to_thread(
                                _execute_tool, block.name, block.input,
                            )
                            tool_output = json.loads(tool_result_str)
                        except Exception as tool_exc:
                            tool_result_str = json.dumps({
                                "error": f"Tool '{block.name}' failed: {tool_exc}",
                            })
                            tool_output = json.loads(tool_result_str)

                        tool_call_log.append({
                            "tool": block.name,
                            "input": block.input,
                            "output": tool_output,
                        })

                        yield _sse("tool_result", {
                            "tool": block.name,
                            "output": tool_output,
                        })

                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": tool_result_str,
                        })

                messages.append({"role": "user", "content": tool_results})
                continue

            # -- Final text response --
            final_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    final_text += block.text

            messages.append({"role": "assistant", "content": final_text})

            yield _sse("done", {
                "tool_calls": tool_call_log,
                "turns": turns,
            })
            return

        # Safety: hit max_turns
        yield _sse("error", {
            "error": "Agent reached maximum iterations.",
            "tool_calls": tool_call_log,
            "turns": turns,
        })

    except Exception as exc:
        yield _sse("error", {"error": f"Unexpected error: {exc}"})


# ---------------------------------------------------------------------------
# Serialise conversation history for the /chat endpoint
# ---------------------------------------------------------------------------

def serialise_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return a JSON-safe copy of *messages* for round-tripping via the API.

    Anthropic content blocks may be Pydantic objects; this ensures
    everything is plain dicts/strings.
    """
    safe: list[dict[str, Any]] = []
    for msg in messages:
        content = msg["content"]
        if isinstance(content, list):
            content = [
                item.model_dump() if hasattr(item, "model_dump") else item
                for item in content
            ]
        safe.append({"role": msg["role"], "content": content})
    return safe


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    import asyncio
    import argparse

    parser = argparse.ArgumentParser(description="Training Intelligence Agent CLI")
    parser.add_argument(
        "question",
        nargs="?",
        default="How should I train today based on my current biometrics?",
        help="Question for the agent.",
    )
    parser.add_argument(
        "--model",
        default=None,
        help=f"Anthropic model ID (default: {settings.model_name} from config).",
    )
    args = parser.parse_args()

    async def _run() -> None:
        print(f"Question: {args.question}\n")
        print("Running agent...\n")
        result = await run_agent(args.question, model=args.model)

        print("=" * 60)
        print("AGENT RESPONSE")
        print("=" * 60)
        print(result["response"])
        print(f"\n--- Used {len(result['tool_calls'])} tool call(s) "
              f"across {result['turns']} turn(s) ---")

        for i, tc in enumerate(result["tool_calls"], 1):
            print(f"\n  [{i}] {tc['tool']}({json.dumps(tc['input'], default=str)})")

    asyncio.run(_run())


if __name__ == "__main__":
    main()

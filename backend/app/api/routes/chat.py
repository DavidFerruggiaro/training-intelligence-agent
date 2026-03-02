"""POST /api/chat — follow-up conversation with the agent (streaming SSE)."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from agent import run_agent_stream
from app.models.schemas import ChatRequest

router = APIRouter()


@router.post("")
async def chat(body: ChatRequest) -> StreamingResponse:
    """Send a follow-up question to the agent with conversation history.

    The ``history`` field carries previous turns so the agent has full
    context.  The response is an SSE stream identical in format to
    ``/api/recommend``.
    """
    # Rebuild the messages list from history
    messages: list[dict] = []
    for turn in body.history:
        messages.append({
            "role": turn.role,
            "content": turn.content,
        })

    return StreamingResponse(
        run_agent_stream(body.message, messages=messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

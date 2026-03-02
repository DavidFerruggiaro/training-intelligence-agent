"""POST /api/recommend — trigger the full agent workflow (streaming SSE)."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from agent import run_agent_stream
from app.models.schemas import RecommendRequest

router = APIRouter()


@router.post("")
async def generate_recommendation(body: RecommendRequest) -> StreamingResponse:
    """Kick off the training intelligence agent and stream the response.

    The response is an SSE stream with the following event types:

    * ``text_delta``  – incremental text from the agent
    * ``tool_start``  – agent is calling a tool
    * ``tool_result`` – tool execution finished
    * ``done``        – stream complete (includes reasoning chain)
    * ``error``       – something went wrong
    """
    parts: list[str] = []
    if body.goals:
        parts.append(f"My training goals: {body.goals}.")
    if body.target_date:
        parts.append(f"Focus on this date: {body.target_date}.")
    parts.append(
        "Analyze my current biometrics, review my training history, "
        "consult the research, and give me a complete training recommendation."
    )
    prompt = " ".join(parts)

    return StreamingResponse(
        run_agent_stream(prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

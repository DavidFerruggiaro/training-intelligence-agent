"""Plan generator tool.

Takes the agent's collected analysis (biometrics, research, training
history) and produces a structured training recommendation.
"""

from __future__ import annotations

from datetime import date
from typing import Any


def generate_plan(
    athlete_context: str,
    biometric_summary: str,
    training_status: str,
    research_insights: str,
    goals: str | None = None,
) -> dict[str, Any]:
    """Produce a structured training plan from the agent's analysis.

    This tool is called by the agent *after* it has gathered biometric
    data, training history, and research findings. It structures the
    agent's synthesized reasoning into a consistent output format that
    the frontend can render.

    Parameters
    ----------
    athlete_context : str
        High-level summary of the athlete's current state (recovery
        status, notable anomalies, sleep quality, etc.).
    biometric_summary : str
        Key biometric observations and how they compare to baselines.
    training_status : str
        Current training load assessment (ACWR, recent trends, etc.).
    research_insights : str
        Relevant findings from sports science literature with citations.
    goals : str, optional
        Athlete's stated training goals, if provided.

    Returns
    -------
    dict with a structured training recommendation including sections
    for today's plan, recovery protocols, key rationale, and warnings.
    """
    return {
        "generated_date": date.today().isoformat(),
        "plan": {
            "athlete_context": athlete_context,
            "biometric_summary": biometric_summary,
            "training_load_status": training_status,
            "research_backed_insights": research_insights,
            "goals": goals or "Not specified",
            "sections": [
                "today_recommendation",
                "recovery_protocols",
                "key_rationale",
                "warnings_and_flags",
                "next_steps",
            ],
        },
        "metadata": {
            "tool": "generate_plan",
            "note": (
                "This structured output is assembled by the agent. "
                "The agent fills in each section based on its analysis "
                "of biometrics, training history, and research."
            ),
        },
    }

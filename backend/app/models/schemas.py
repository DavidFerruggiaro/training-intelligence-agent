"""Pydantic schemas shared across API routes."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class RecommendRequest(BaseModel):
    """Body for POST /api/recommend."""

    goals: str | None = Field(
        default=None,
        description="Athlete's training goals (e.g. 'build strength, maintain endurance').",
    )
    target_date: str | None = Field(
        default=None,
        description="ISO date to focus on (defaults to most recent).",
    )


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str | list = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Body for POST /api/chat."""

    message: str = Field(..., description="The follow-up question.")
    history: list[ChatMessage] = Field(
        default_factory=list,
        description="Previous conversation turns.",
    )


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = "healthy"


class BiometricDay(BaseModel):
    """Single day of biometric data (chart-friendly)."""

    date: str
    recovery_score: float | None = None
    hrv: float | None = None
    resting_hr: float | None = None
    day_strain: float | None = None
    sleep_performance: float | None = None
    asleep_duration_hrs: float | None = None
    deep_sleep_duration_hrs: float | None = None
    rem_duration_hrs: float | None = None
    sleep_efficiency: float | None = None
    respiratory_rate: float | None = None
    skin_temp: float | None = None
    blood_oxygen: float | None = None
    num_workouts: int = 0
    total_workout_strain: float | None = None
    workout_types: str = ""

    # Rolling averages
    hrv_7d: float | None = None
    hrv_30d: float | None = None
    resting_hr_7d: float | None = None
    resting_hr_30d: float | None = None
    day_strain_7d: float | None = None
    day_strain_30d: float | None = None
    asleep_duration_7d: float | None = None
    asleep_duration_30d: float | None = None


class BiometricsResponse(BaseModel):
    """Response for GET /api/biometrics."""

    days_requested: int
    days_returned: int
    data: list[BiometricDay]

"""GET /api/biometrics — return biometric time-series data for charts."""

from __future__ import annotations

import numpy as np
from fastapi import APIRouter, Query

from app.models.schemas import BiometricDay, BiometricsResponse
from data.loader import get_daily_summary

router = APIRouter()


def _v(val) -> float | None:  # noqa: ANN001
    """Convert a pandas/numpy value to a plain Python float or None."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if np.isnan(f) else round(f, 2)
    except (TypeError, ValueError):
        return None


@router.get("", response_model=BiometricsResponse)
async def get_biometrics(
    days: int = Query(default=30, ge=1, le=365, description="Number of days"),
) -> BiometricsResponse:
    """Return daily biometric data for the most recent *days* days.

    This feeds the frontend charts — each row is one calendar day with
    raw metrics and rolling averages.
    """
    daily = get_daily_summary()

    if daily.empty:
        return BiometricsResponse(days_requested=days, days_returned=0, data=[])

    recent = daily.tail(days)

    rows: list[BiometricDay] = []
    for _, row in recent.iterrows():
        rows.append(BiometricDay(
            date=row["date"].strftime("%Y-%m-%d"),
            recovery_score=_v(row.get("recovery_score")),
            hrv=_v(row.get("hrv")),
            resting_hr=_v(row.get("resting_hr")),
            day_strain=_v(row.get("day_strain")),
            sleep_performance=_v(row.get("sleep_performance")),
            asleep_duration_hrs=_v(row.get("asleep_duration_hrs")),
            deep_sleep_duration_hrs=_v(row.get("deep_sleep_duration_hrs")),
            rem_duration_hrs=_v(row.get("rem_duration_hrs")),
            sleep_efficiency=_v(row.get("sleep_efficiency")),
            respiratory_rate=_v(row.get("respiratory_rate")),
            skin_temp=_v(row.get("skin_temp")),
            blood_oxygen=_v(row.get("blood_oxygen")),
            num_workouts=int(row.get("num_workouts", 0)),
            total_workout_strain=_v(row.get("total_workout_strain")),
            workout_types=(
                row["workout_types"]
                if "workout_types" in row.index and isinstance(row.get("workout_types"), str)
                else ""
            ),
            hrv_7d=_v(row.get("hrv_7d")),
            hrv_30d=_v(row.get("hrv_30d")),
            resting_hr_7d=_v(row.get("resting_hr_7d")),
            resting_hr_30d=_v(row.get("resting_hr_30d")),
            day_strain_7d=_v(row.get("day_strain_7d")),
            day_strain_30d=_v(row.get("day_strain_30d")),
            asleep_duration_7d=_v(row.get("asleep_duration_7d")),
            asleep_duration_30d=_v(row.get("asleep_duration_30d")),
        ))

    return BiometricsResponse(
        days_requested=days,
        days_returned=len(rows),
        data=rows,
    )

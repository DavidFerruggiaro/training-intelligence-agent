"""Training history tool.

Loads workout and strain data via the data loader and computes training
load metrics including the acute:chronic workload ratio (ACWR).
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from data.loader import get_daily_summary


def _safe_float(val: Any) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        return None if np.isnan(f) else round(f, 2)
    except (TypeError, ValueError):
        return None


def get_training_history(
    days: int = 28,
) -> dict[str, Any]:
    """Return recent training history with workload metrics.

    Parameters
    ----------
    days : int
        Number of days of history to return (default 28, which provides
        enough context for acute/chronic workload calculations).

    Returns
    -------
    dict with keys: period, daily_log (per-day workout summaries),
    load_metrics (acute/chronic loads and ACWR), and a training_status
    narrative.
    """
    daily = get_daily_summary()

    if daily.empty:
        return {"error": "No training data available."}

    # Take the most recent N days
    recent = daily.tail(days).copy()

    if recent.empty:
        return {"error": f"No data available for the last {days} days."}

    # --- Per-day training log ---
    daily_log: list[dict[str, Any]] = []
    for _, row in recent.iterrows():
        entry: dict[str, Any] = {
            "date": row["date"].strftime("%Y-%m-%d"),
            "day_strain": _safe_float(row.get("day_strain")),
            "recovery_score": _safe_float(row.get("recovery_score")),
            "num_workouts": int(row.get("num_workouts", 0)),
            "total_workout_strain": _safe_float(row.get("total_workout_strain")),
            "workout_types": row["workout_types"] if pd.notna(row.get("workout_types")) else "",
        }
        daily_log.append(entry)

    # --- ACWR (Acute:Chronic Workload Ratio) ---
    # Acute = rolling 7-day mean of day_strain
    # Chronic = rolling 28-day mean of day_strain
    strain = daily["day_strain"].copy()
    acute_load = strain.rolling(window=7, min_periods=3).mean()
    chronic_load = strain.rolling(window=28, min_periods=7).mean()

    # Current values (latest row)
    latest_acute = _safe_float(acute_load.iloc[-1])
    latest_chronic = _safe_float(chronic_load.iloc[-1])

    acwr = None
    if latest_acute is not None and latest_chronic is not None and latest_chronic > 0:
        acwr = round(latest_acute / latest_chronic, 2)

    # Week-over-week strain change
    if len(daily) >= 14:
        this_week = daily.tail(7)["day_strain"].sum()
        prev_week = daily.iloc[-14:-7]["day_strain"].sum()
        if prev_week > 0:
            week_over_week = round((this_week - prev_week) / prev_week * 100, 1)
        else:
            week_over_week = None
    else:
        week_over_week = None

    # Training volume summary
    last_7 = daily.tail(7)
    total_workouts_7d = int(last_7["num_workouts"].sum()) if "num_workouts" in last_7.columns else 0
    total_strain_7d = _safe_float(last_7["day_strain"].sum())

    load_metrics = {
        "acute_load_7d": latest_acute,
        "chronic_load_28d": latest_chronic,
        "acwr": acwr,
        "week_over_week_strain_change_pct": week_over_week,
        "total_workouts_7d": total_workouts_7d,
        "total_strain_7d": total_strain_7d,
    }

    # --- Training status narrative ---
    if acwr is not None:
        if acwr < 0.8:
            training_status = "undertraining"
            narrative = (
                f"ACWR is {acwr} (below 0.8). Training load is decreasing relative "
                "to your chronic baseline — you may be detraining or in a deload phase."
            )
        elif acwr <= 1.3:
            training_status = "optimal"
            narrative = (
                f"ACWR is {acwr} (0.8–1.3 sweet spot). Training load is progressing "
                "well relative to what your body is adapted to."
            )
        elif acwr <= 1.5:
            training_status = "caution"
            narrative = (
                f"ACWR is {acwr} (1.3–1.5 caution zone). Training load is ramping up "
                "faster than your chronic baseline — monitor recovery closely."
            )
        else:
            training_status = "danger"
            narrative = (
                f"ACWR is {acwr} (above 1.5 danger zone). Acute spike in training load "
                "relative to chronic baseline — high injury risk. Consider reducing intensity."
            )
    else:
        training_status = "insufficient_data"
        narrative = "Not enough training history to compute a reliable ACWR."

    return {
        "period": f"Last {len(recent)} days",
        "training_status": training_status,
        "narrative": narrative,
        "load_metrics": load_metrics,
        "daily_log": daily_log,
    }

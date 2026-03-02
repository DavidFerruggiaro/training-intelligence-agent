"""Biometric analysis tool.

Loads WHOOP data via the data loader, computes current values against
7-day and 30-day baselines, flags anomalies via z-scores, and returns
a structured summary for the agent.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import numpy as np
import pandas as pd

from data.loader import get_daily_summary

# Metrics to analyze (must match columns from loader)
_KEY_METRICS = [
    "recovery_score",
    "hrv",
    "resting_hr",
    "day_strain",
    "sleep_performance",
    "asleep_duration",
    "deep_sleep_duration",
    "rem_duration",
    "sleep_efficiency",
    "respiratory_rate",
    "skin_temp",
    "blood_oxygen",
]

# Z-score threshold for flagging anomalies
_Z_THRESHOLD = 1.5


def _safe_float(val: Any) -> float | None:
    """Convert a value to a plain Python float, returning None for NaN/missing."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if np.isnan(f) else round(f, 2)
    except (TypeError, ValueError):
        return None


def _compute_metric_summary(
    series: pd.Series,
    current: float | None,
    metric_name: str,
) -> dict[str, Any]:
    """Compute baseline stats and z-score for a single metric."""
    valid = series.dropna()
    if valid.empty or current is None:
        return {
            "metric": metric_name,
            "current": current,
            "mean_7d": None,
            "mean_30d": None,
            "z_score_30d": None,
            "flag": None,
        }

    last_7 = valid.tail(7)
    last_30 = valid.tail(30)

    mean_7d = _safe_float(last_7.mean())
    mean_30d = _safe_float(last_30.mean())
    std_30d = float(last_30.std()) if len(last_30) >= 5 else None

    z_score = None
    flag = None
    if std_30d and std_30d > 0 and mean_30d is not None:
        z_score = round((current - mean_30d) / std_30d, 2)
        if abs(z_score) >= _Z_THRESHOLD:
            direction = "above" if z_score > 0 else "below"
            flag = f"{metric_name} is {abs(z_score):.1f} SD {direction} 30-day baseline"

    return {
        "metric": metric_name,
        "current": current,
        "mean_7d": mean_7d,
        "mean_30d": mean_30d,
        "z_score_30d": z_score,
        "flag": flag,
    }


def analyze_biometrics(
    target_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    """Analyze biometric data for a date or date range.

    Parameters
    ----------
    target_date : str, optional
        ISO date string (YYYY-MM-DD). Defaults to the most recent date in the
        dataset.
    end_date : str, optional
        If provided together with *target_date*, analyze the range
        [target_date, end_date] inclusive.

    Returns
    -------
    dict with keys: date(s), metrics (per-metric summaries with baselines
    and z-scores), anomalies (list of flagged deviations), and a
    recovery_status narrative.
    """
    daily = get_daily_summary()

    if daily.empty:
        return {"error": "No biometric data available."}

    # Resolve the target date(s)
    if target_date is None:
        target_dt = daily["date"].max()
    else:
        target_dt = pd.Timestamp(target_date)

    if end_date is not None:
        end_dt = pd.Timestamp(end_date)
        target_rows = daily[(daily["date"] >= target_dt) & (daily["date"] <= end_dt)]
    else:
        target_rows = daily[daily["date"] == target_dt]

    if target_rows.empty:
        available = daily["date"].dt.strftime("%Y-%m-%d").tolist()
        return {
            "error": f"No data for requested date(s). Available dates: {available[-10:]}",
        }

    # For a date range, summarize across the range; for a single day, use that row
    if len(target_rows) == 1:
        row = target_rows.iloc[0]
        current_values = {m: _safe_float(row.get(m)) for m in _KEY_METRICS}
        date_label = row["date"].strftime("%Y-%m-%d")
    else:
        current_values = {
            m: _safe_float(target_rows[m].mean()) if m in target_rows.columns else None
            for m in _KEY_METRICS
        }
        date_label = (
            f"{target_rows['date'].min().strftime('%Y-%m-%d')} to "
            f"{target_rows['date'].max().strftime('%Y-%m-%d')}"
        )

    # Build the historical baseline from all data *before* the target window
    baseline = daily[daily["date"] < target_dt]

    metrics: list[dict[str, Any]] = []
    anomalies: list[str] = []

    for metric_name in _KEY_METRICS:
        current = current_values.get(metric_name)
        hist_series = baseline[metric_name] if metric_name in baseline.columns else pd.Series(dtype=float)
        summary = _compute_metric_summary(hist_series, current, metric_name)
        metrics.append(summary)
        if summary["flag"]:
            anomalies.append(summary["flag"])

    # Workout snapshot for the day(s)
    workout_info = None
    if "num_workouts" in target_rows.columns:
        workout_info = {
            "num_workouts": int(target_rows["num_workouts"].sum()),
            "total_strain": _safe_float(target_rows["total_workout_strain"].sum()),
            "types": ", ".join(
                target_rows["workout_types"].dropna().unique()
            ) if "workout_types" in target_rows.columns else None,
        }

    # Recovery narrative
    recovery = current_values.get("recovery_score")
    if recovery is not None:
        if recovery >= 67:
            recovery_status = "green"
            narrative = f"Recovery is strong at {recovery}%. Body is well-prepared for high-intensity training."
        elif recovery >= 34:
            recovery_status = "yellow"
            narrative = f"Recovery is moderate at {recovery}%. Consider moderate training with attention to recovery signals."
        else:
            recovery_status = "red"
            narrative = f"Recovery is low at {recovery}%. Prioritize rest, light activity, and recovery protocols."
    else:
        recovery_status = "unknown"
        narrative = "Recovery score unavailable."

    return {
        "date": date_label,
        "recovery_status": recovery_status,
        "narrative": narrative,
        "metrics": metrics,
        "anomalies": anomalies,
        "workout_snapshot": workout_info,
    }

"""
WHOOP data ingestion and normalization module.

Reads exported WHOOP CSV files (physiological_cycles, sleeps, workouts,
journal_entries), normalises them into a single daily DataFrame, and
computes rolling 7-day and 30-day averages for key biometric metrics.

Usage as a library:
    from data.loader import load_all, get_daily_summary

    daily = get_daily_summary()          # full pipeline
    cycles = load_all()["cycles"]        # individual tables
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_HERE = Path(__file__).resolve().parent
DATA_DIR = _HERE

# Expected CSV filenames from a WHOOP export
_FILES = {
    "cycles": "physiological_cycles.csv",
    "sleeps": "sleeps.csv",
    "workouts": "workouts.csv",
    "journal": "journal_entries.csv",
}

# Columns that hold timestamps
_TS_COLS = {
    "cycles": [
        "Cycle start time", "Cycle end time", "Sleep onset", "Wake onset",
    ],
    "sleeps": [
        "Cycle start time", "Cycle end time", "Sleep onset", "Wake onset",
    ],
    "workouts": [
        "Cycle start time", "Cycle end time",
        "Workout start time", "Workout end time",
    ],
    "journal": ["Cycle start time", "Cycle end time"],
}


# ---------------------------------------------------------------------------
# Timezone / date helpers
# ---------------------------------------------------------------------------

def _parse_whoop_tz(tz_str: str) -> str | None:
    """Convert WHOOP timezone string (e.g. 'UTC-05:00') to a fixed offset."""
    if not isinstance(tz_str, str) or not tz_str.startswith("UTC"):
        return None
    offset = tz_str.replace("UTC", "")
    if not offset:
        return "UTC"
    return f"Etc/GMT{'+' if offset.startswith('-') else '-'}{offset.lstrip('+-').split(':')[0]}"


def _parse_timestamps(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Parse timestamp columns, coercing errors to NaT."""
    df = df.copy()
    for col in cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    return df


def _extract_date(df: pd.DataFrame) -> pd.DataFrame:
    """Add a 'date' column derived from 'Cycle start time'."""
    df = df.copy()
    df["date"] = df["Cycle start time"].dt.date
    df["date"] = pd.to_datetime(df["date"])
    return df


# ---------------------------------------------------------------------------
# Per-table loaders
# ---------------------------------------------------------------------------

def _load_csv(name: str, data_dir: Path | None = None) -> pd.DataFrame:
    """Read a single WHOOP CSV file and parse its timestamps."""
    data_dir = data_dir or DATA_DIR
    path = data_dir / _FILES[name]
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path)
    df = _parse_timestamps(df, _TS_COLS[name])
    return df


def load_all(data_dir: Path | str | None = None) -> dict[str, pd.DataFrame]:
    """Load all four WHOOP export CSVs and return them keyed by name."""
    data_dir = Path(data_dir) if data_dir else DATA_DIR
    return {name: _load_csv(name, data_dir) for name in _FILES}


# ---------------------------------------------------------------------------
# Column rename maps (WHOOP export names → clean snake_case)
# ---------------------------------------------------------------------------

_CYCLE_RENAME = {
    "Recovery score %": "recovery_score",
    "Resting heart rate (bpm)": "resting_hr",
    "Heart rate variability (ms)": "hrv",
    "Skin temp (celsius)": "skin_temp",
    "Blood oxygen %": "blood_oxygen",
    "Day Strain": "day_strain",
    "Energy burned (cal)": "energy_burned",
    "Max HR (bpm)": "max_hr",
    "Average HR (bpm)": "avg_hr",
    "Sleep performance %": "sleep_performance",
    "Respiratory rate (rpm)": "respiratory_rate",
    "Asleep duration (min)": "asleep_duration",
    "In bed duration (min)": "in_bed_duration",
    "Light sleep duration (min)": "light_sleep_duration",
    "Deep (SWS) duration (min)": "deep_sleep_duration",
    "REM duration (min)": "rem_duration",
    "Awake duration (min)": "awake_duration",
    "Sleep need (min)": "sleep_need",
    "Sleep debt (min)": "sleep_debt",
    "Sleep efficiency %": "sleep_efficiency",
    "Sleep consistency %": "sleep_consistency",
}

_NUMERIC_COLS = list(_CYCLE_RENAME.values())


# ---------------------------------------------------------------------------
# Workout aggregation (per-day summary)
# ---------------------------------------------------------------------------

def _aggregate_workouts(workouts: pd.DataFrame) -> pd.DataFrame:
    """Collapse individual workouts into one row per date."""
    if workouts.empty:
        return pd.DataFrame(columns=["date", "num_workouts", "total_workout_min",
                                      "total_workout_strain", "workout_types"])

    df = _extract_date(workouts)
    agg = df.groupby("date").agg(
        num_workouts=("Duration (min)", "count"),
        total_workout_min=("Duration (min)", "sum"),
        total_workout_strain=("Activity Strain", "sum"),
        workout_types=("Activity name", lambda s: ", ".join(s.dropna().unique())),
    ).reset_index()
    return agg


# ---------------------------------------------------------------------------
# Nap aggregation (from sleeps table)
# ---------------------------------------------------------------------------

def _aggregate_naps(sleeps: pd.DataFrame) -> pd.DataFrame:
    """Count naps per date from the sleeps table."""
    if sleeps.empty or "Nap" not in sleeps.columns:
        return pd.DataFrame(columns=["date", "num_naps", "nap_duration"])

    df = _extract_date(sleeps)
    naps = df[df["Nap"].astype(str).str.lower() == "true"]
    if naps.empty:
        return pd.DataFrame(columns=["date", "num_naps", "nap_duration"])

    agg = naps.groupby("date").agg(
        num_naps=("Nap", "count"),
        nap_duration=("Asleep duration (min)", "sum"),
    ).reset_index()
    return agg


# ---------------------------------------------------------------------------
# Rolling averages
# ---------------------------------------------------------------------------

_ROLLING_METRICS = ["hrv", "resting_hr", "asleep_duration", "day_strain"]


def _add_rolling_averages(df: pd.DataFrame) -> pd.DataFrame:
    """Add 7-day and 30-day rolling means for key metrics."""
    df = df.sort_values("date").copy()
    for col in _ROLLING_METRICS:
        if col not in df.columns:
            continue
        df[f"{col}_7d"] = (
            df[col]
            .rolling(window=7, min_periods=3)
            .mean()
            .round(1)
        )
        df[f"{col}_30d"] = (
            df[col]
            .rolling(window=30, min_periods=7)
            .mean()
            .round(1)
        )
    return df


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def get_daily_summary(data_dir: Path | str | None = None) -> pd.DataFrame:
    """
    Full pipeline: load CSVs → normalise → merge → compute rolling averages.

    Returns a DataFrame with one row per date, sorted ascending.
    """
    tables = load_all(data_dir)

    # -- Physiological cycles (primary daily table) --
    cycles = tables["cycles"]
    if cycles.empty:
        raise FileNotFoundError("physiological_cycles.csv is missing or empty")

    cycles = _extract_date(cycles)
    cycles = cycles.rename(columns=_CYCLE_RENAME)

    # Coerce numeric columns (handles empty strings / non-numeric)
    for col in _NUMERIC_COLS:
        if col in cycles.columns:
            cycles[col] = pd.to_numeric(cycles[col], errors="coerce")

    # Keep one row per date (latest cycle if duplicates exist)
    cycles = cycles.sort_values("Cycle start time").drop_duplicates(
        subset="date", keep="last",
    )

    # -- Workouts --
    workout_agg = _aggregate_workouts(tables["workouts"])

    # -- Naps --
    nap_agg = _aggregate_naps(tables["sleeps"])

    # -- Merge --
    daily = cycles.copy()
    if not workout_agg.empty:
        daily = daily.merge(workout_agg, on="date", how="left")
    if not nap_agg.empty:
        daily = daily.merge(nap_agg, on="date", how="left")

    # Fill workout/nap NAs with zeros (no workout = 0)
    for col in ["num_workouts", "total_workout_min", "total_workout_strain",
                "num_naps", "nap_duration"]:
        if col in daily.columns:
            daily[col] = daily[col].fillna(0).astype(int)

    # -- Convert sleep durations from minutes to hours for readability --
    for col in ["asleep_duration", "in_bed_duration", "light_sleep_duration",
                "deep_sleep_duration", "rem_duration", "awake_duration",
                "sleep_need", "sleep_debt", "nap_duration"]:
        if col in daily.columns:
            daily[f"{col}_hrs"] = (daily[col] / 60).round(2)

    # -- Rolling averages --
    daily = _add_rolling_averages(daily)

    # -- Final sort & column selection --
    keep_cols = (
        ["date"]
        + _NUMERIC_COLS
        + [f"{m}_{w}" for m in _ROLLING_METRICS for w in ("7d", "30d")]
        + ["num_workouts", "total_workout_min", "total_workout_strain",
           "workout_types", "num_naps", "nap_duration"]
        + [c for c in daily.columns if c.endswith("_hrs")]
    )
    # Only keep columns that actually exist
    keep_cols = [c for c in keep_cols if c in daily.columns]
    daily = daily[keep_cols].sort_values("date").reset_index(drop=True)

    return daily

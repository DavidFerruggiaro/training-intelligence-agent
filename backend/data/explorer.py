"""
WHOOP data explorer — prints a diagnostic summary of loaded biometric data.

Usage (from backend/):
    python -m data.explorer
"""

from __future__ import annotations

import pandas as pd

from data.loader import get_daily_summary, load_all


def _section(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print("=" * 60)


def _pct(num: int, total: int) -> str:
    return f"{num}/{total} ({100 * num / total:.1f}%)" if total else "0/0"


def main() -> None:
    # ------------------------------------------------------------------
    # Raw table overview
    # ------------------------------------------------------------------
    _section("RAW TABLE OVERVIEW")
    tables = load_all()
    for name, df in tables.items():
        print(f"\n  {name}: {len(df):,} rows  x  {len(df.columns)} columns")

    # ------------------------------------------------------------------
    # Load daily summary
    # ------------------------------------------------------------------
    daily = get_daily_summary()
    total_days = len(daily)

    # ------------------------------------------------------------------
    # Date range
    # ------------------------------------------------------------------
    _section("DATE RANGE")
    first = daily["date"].min()
    last = daily["date"].max()
    span = (last - first).days + 1
    print(f"  First date:    {first.date()}")
    print(f"  Last date:     {last.date()}")
    print(f"  Calendar span: {span} days")
    print(f"  Rows (days):   {total_days}")
    if span > total_days:
        print(f"  Missing days:  {span - total_days}")

    # ------------------------------------------------------------------
    # Key metric averages
    # ------------------------------------------------------------------
    _section("KEY METRIC AVERAGES")
    metrics = {
        "HRV (ms)":             "hrv",
        "Resting HR (bpm)":     "resting_hr",
        "Recovery score (%)":   "recovery_score",
        "Day strain":           "day_strain",
        "Sleep duration (min)": "asleep_duration",
        "Sleep efficiency (%)": "sleep_efficiency",
        "Blood oxygen (%)":     "blood_oxygen",
        "Skin temp (°C)":       "skin_temp",
        "Respiratory rate":     "respiratory_rate",
    }
    print(f"  {'Metric':<24} {'Mean':>8} {'Median':>8} {'Min':>8} {'Max':>8} {'Std':>8}")
    print(f"  {'-'*24} {'-'*8} {'-'*8} {'-'*8} {'-'*8} {'-'*8}")
    for label, col in metrics.items():
        if col not in daily.columns:
            continue
        s = daily[col].dropna()
        if s.empty:
            print(f"  {label:<24} {'—':>8}")
            continue
        print(
            f"  {label:<24} "
            f"{s.mean():>8.1f} {s.median():>8.1f} "
            f"{s.min():>8.1f} {s.max():>8.1f} {s.std():>8.1f}"
        )

    # ------------------------------------------------------------------
    # Workout summary
    # ------------------------------------------------------------------
    _section("WORKOUT SUMMARY")
    if "num_workouts" in daily.columns:
        workout_days = (daily["num_workouts"] > 0).sum()
        total_workouts = int(daily["num_workouts"].sum())
        print(f"  Total workouts:    {total_workouts}")
        print(f"  Days with workout: {workout_days}/{total_days}")
        if "workout_types" in daily.columns:
            all_types: list[str] = []
            for val in daily["workout_types"].dropna():
                all_types.extend([t.strip() for t in str(val).split(",") if t.strip()])
            type_counts = pd.Series(all_types).value_counts().head(10)
            print(f"  Top activity types:")
            for act, cnt in type_counts.items():
                print(f"    {act:<30} {cnt:>5}x")

    # ------------------------------------------------------------------
    # Rolling average spot check (last 7 days)
    # ------------------------------------------------------------------
    _section("LATEST 7-DAY ROLLING AVERAGES")
    tail = daily.tail(7)
    rolling_cols = {
        "HRV 7d avg":           "hrv_7d",
        "Resting HR 7d avg":    "resting_hr_7d",
        "Sleep dur 7d avg":     "asleep_duration_7d",
        "Strain 7d avg":        "day_strain_7d",
    }
    latest = daily.iloc[-1]
    for label, col in rolling_cols.items():
        if col in daily.columns:
            val = latest[col]
            print(f"  {label:<24} {val if pd.notna(val) else '—':>8}")

    # ------------------------------------------------------------------
    # Data quality flags
    # ------------------------------------------------------------------
    _section("DATA QUALITY")
    issues: list[str] = []

    # Missing values in key columns
    key_cols = ["hrv", "resting_hr", "recovery_score", "day_strain",
                "asleep_duration", "sleep_efficiency"]
    for col in key_cols:
        if col not in daily.columns:
            issues.append(f"Column '{col}' not found in daily data")
            continue
        missing = daily[col].isna().sum()
        if missing > 0:
            issues.append(
                f"{col}: {_pct(missing, total_days)} missing values"
            )

    # Outlier detection (simple z-score > 3)
    for col in ["hrv", "resting_hr", "asleep_duration"]:
        if col not in daily.columns:
            continue
        s = daily[col].dropna()
        if len(s) < 10:
            continue
        z = ((s - s.mean()) / s.std()).abs()
        outliers = int((z > 3).sum())
        if outliers:
            issues.append(f"{col}: {outliers} potential outlier(s) (|z| > 3)")

    # Gaps in date sequence
    dates = pd.to_datetime(daily["date"])
    gaps = dates.diff().dt.days
    big_gaps = gaps[gaps > 1].dropna()
    if not big_gaps.empty:
        issues.append(
            f"Date gaps: {len(big_gaps)} gap(s) found — "
            f"largest is {int(big_gaps.max())} days"
        )

    # Physiological range sanity
    range_checks = {
        "hrv": (1, 300, "HRV"),
        "resting_hr": (25, 120, "Resting HR"),
        "blood_oxygen": (80, 100, "Blood oxygen"),
        "recovery_score": (0, 100, "Recovery score"),
    }
    for col, (lo, hi, label) in range_checks.items():
        if col not in daily.columns:
            continue
        s = daily[col].dropna()
        out = ((s < lo) | (s > hi)).sum()
        if out:
            issues.append(f"{label}: {out} value(s) outside expected range [{lo}–{hi}]")

    if issues:
        for issue in issues:
            print(f"  [!] {issue}")
    else:
        print("  No data quality issues detected.")

    # ------------------------------------------------------------------
    # Sample of recent data
    # ------------------------------------------------------------------
    _section("MOST RECENT 5 DAYS")
    show_cols = ["date", "recovery_score", "hrv", "resting_hr",
                 "day_strain", "asleep_duration", "sleep_efficiency",
                 "num_workouts"]
    show_cols = [c for c in show_cols if c in daily.columns]
    print(daily[show_cols].tail(5).to_string(index=False))

    print()


if __name__ == "__main__":
    main()

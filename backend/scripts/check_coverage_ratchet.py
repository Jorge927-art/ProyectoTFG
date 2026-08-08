#!/usr/bin/env python3
import csv
import json
import sys
from pathlib import Path
from typing import Dict, Tuple


def load_baseline(path: Path) -> Dict[str, float]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return {"line": float(payload["line"]), "branch": float(payload["branch"])}


def load_current_coverage(csv_path: Path) -> Dict[str, float]:
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    line_missed = sum(int(row["LINE_MISSED"]) for row in rows)
    line_covered = sum(int(row["LINE_COVERED"]) for row in rows)
    branch_missed = sum(int(row["BRANCH_MISSED"]) for row in rows)
    branch_covered = sum(int(row["BRANCH_COVERED"]) for row in rows)

    line_total = line_missed + line_covered
    branch_total = branch_missed + branch_covered

    return {
        "line": 100.0 * line_covered / line_total if line_total else 0.0,
        "branch": 100.0 * branch_covered / branch_total if branch_total else 0.0,
    }


def compare_againsts_baseline(current: Dict[str, float], baseline: Dict[str, float]) -> Dict[str, object]:
    tolerance = 0.3
    raise_for_improvement = 1.0
    epsilon = 1e-9

    for metric in ("line", "branch"):
        delta = current[metric] - baseline[metric]
        if delta < -(tolerance + epsilon):
            return {
                "status": "fail",
                "message": f"Coverage regression detected for {metric}: current {current[metric]:.1f}% is {baseline[metric] - current[metric]:.1f} percentage points below baseline {baseline[metric]:.1f}%.",
            }
        if delta > raise_for_improvement + epsilon:
            return {
                "status": "fail",
                "message": f"Coverage improved for {metric}: current {current[metric]:.1f}% exceeds baseline {baseline[metric]:.1f}% by {delta:.1f} points. Please update backend/coverage-baseline.json in this PR.",
            }

    return {"status": "pass", "message": "Coverage is within the ratchet bounds."}


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python scripts/check_coverage_ratchet.py <jacoco.csv> <coverage-baseline.json>", file=sys.stderr)
        return 2

    csv_path = Path(sys.argv[1]).resolve()
    baseline_path = Path(sys.argv[2]).resolve()

    if not csv_path.exists():
        print(f"JaCoCo CSV report not found: {csv_path}", file=sys.stderr)
        return 2

    if not baseline_path.exists():
        print(f"Coverage baseline file not found: {baseline_path}", file=sys.stderr)
        return 2

    current = load_current_coverage(csv_path)
    baseline = load_baseline(baseline_path)
    result = compare_againsts_baseline(current, baseline)
    print(json.dumps({"current": current, "baseline": baseline, "result": result}, indent=2))
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())

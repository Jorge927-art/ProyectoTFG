"""Prueba HTTP reproducible para el entorno de datos demo."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import statistics
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass
class Result:
    endpoint: str
    status: int
    elapsed_ms: float
    error: str = ""


def request_json(base_url: str, method: str, path: str, payload: dict | None = None,
                 token: str | None = None) -> Result:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    started = time.perf_counter()
    try:
        with urlopen(Request(f"{base_url}{path}", data=body, headers=headers, method=method), timeout=30) as response:
            response.read()
            return Result(path, response.status, (time.perf_counter() - started) * 1000)
    except HTTPError as error:
        error.read()
        return Result(path, error.code, (time.perf_counter() - started) * 1000, str(error))
    except (URLError, TimeoutError, OSError) as error:
        return Result(path, 0, (time.perf_counter() - started) * 1000, str(error))


def login_and_probe(base_url: str, student_number: int) -> list[Result]:
    started = time.perf_counter()
    results = []
    try:
        request = Request(
            f"{base_url}/api/auth/login",
            data=json.dumps({"username": f"student{student_number:03d}", "password": "123456"}).encode(),
            headers={"Content-Type": "application/json"}, method="POST")
        with urlopen(request, timeout=30) as response:
            data = json.loads(response.read())
            token = data.get("accessToken")
            results.append(Result("/api/auth/login", response.status, (time.perf_counter() - started) * 1000))
    except Exception as error:
        results.append(Result("/api/auth/login", 0, (time.perf_counter() - started) * 1000, str(error)))
        return results
    if token:
        results.append(request_json(base_url, "GET", "/api/courses/search?query=python", token=token))
        results.append(request_json(base_url, "GET", "/api/courses/recommendations", token=token))
        results.append(request_json(base_url, "GET", "/api/auth/my-active-courses", token=token))
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8081")
    parser.add_argument("--users", type=int, default=89)
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--output", default="tests/load-test-results.json")
    args = parser.parse_args()

    started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as executor:
        batches = list(executor.map(lambda number: login_and_probe(args.base_url, number), range(1, args.users + 1)))
    results = [item for batch in batches for item in batch]
    duration = time.perf_counter() - started
    by_endpoint = {}
    for result in results:
        by_endpoint.setdefault(result.endpoint, []).append(result)

    report = {
        "base_url": args.base_url,
        "users": args.users,
        "concurrency": args.concurrency,
        "elapsed_seconds": round(duration, 3),
        "total_requests": len(results),
        "failed_requests": sum(result.status == 0 or result.status >= 400 for result in results),
        "endpoints": {},
    }
    for endpoint, endpoint_results in by_endpoint.items():
        latencies = [result.elapsed_ms for result in endpoint_results]
        report["endpoints"][endpoint] = {
            "requests": len(endpoint_results),
            "status_counts": {str(status): sum(item.status == status for item in endpoint_results) for status in sorted({item.status for item in endpoint_results})},
            "average_ms": round(statistics.mean(latencies), 2),
            "max_ms": round(max(latencies), 2),
            "p95_ms": round(sorted(latencies)[max(0, int(len(latencies) * 0.95) - 1)], 2),
        }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
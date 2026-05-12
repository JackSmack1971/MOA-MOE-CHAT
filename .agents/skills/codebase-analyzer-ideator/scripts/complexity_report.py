#!/usr/bin/env python3
"""
complexity_report.py — Cyclomatic Complexity Estimator
Approximates cyclomatic complexity per function by counting branch-inducing AST nodes.
Score = 1 + (if + elif + for + while + except + with + assert + comprehensions + ternary)
Grade: ok (≤10) | hotspot (11-20) | critical (>20)
Usage: python scripts/complexity_report.py <path>
Output: JSON to stdout. Status line to stderr.
Exits 0 on success, 1 on fatal error.
"""
import ast
import json
import sys
from pathlib import Path


# Nodes that introduce a new execution branch
BRANCH_NODE_TYPES = (
    ast.If,
    ast.For,
    ast.While,
    ast.ExceptHandler,
    ast.With,
    ast.Assert,
    ast.ListComp,
    ast.SetComp,
    ast.DictComp,
    ast.GeneratorExp,
    ast.IfExp,  # ternary
)


def cyclomatic_complexity(func_node: ast.AST) -> int:
    """1 (base) + count of every branch-inducing node inside the function."""
    return 1 + sum(1 for n in ast.walk(func_node) if isinstance(n, BRANCH_NODE_TYPES))


def grade(score: int) -> str:
    if score > 20:
        return "critical"
    if score > 10:
        return "hotspot"
    return "ok"


def analyze_file(path: Path) -> list[dict]:
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(source, filename=str(path))
    except (OSError, SyntaxError):
        return []  # skip unparseable files silently

    results = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            score = cyclomatic_complexity(node)
            results.append({
                "file": str(path),
                "function": node.name,
                "line": node.lineno,
                "complexity": score,
                "grade": grade(score),
            })
    return results


def collect_python_files(path: Path) -> list[Path]:
    if path.is_file() and path.suffix == ".py":
        return [path]
    if path.is_dir():
        return sorted(path.rglob("*.py"))
    return []


def main() -> None:
    if len(sys.argv) < 2:
        print("[FAIL] Usage: python scripts/complexity_report.py <path>", file=sys.stderr)
        sys.exit(1)

    target = Path(sys.argv[1])
    if not target.exists():
        print(f"[FAIL] Path not found: {target}", file=sys.stderr)
        sys.exit(1)

    files = collect_python_files(target)
    if not files:
        print(f"[FAIL] No .py files found at: {target}", file=sys.stderr)
        sys.exit(1)

    all_results: list[dict] = []
    for f in files:
        all_results.extend(analyze_file(f))

    if not all_results:
        print("[FAIL] No functions found — check that files contain Python function definitions", file=sys.stderr)
        sys.exit(1)

    # Rank by complexity descending
    all_results.sort(key=lambda x: x["complexity"], reverse=True)

    hotspots = [r for r in all_results if r["grade"] in ("hotspot", "critical")]
    critical = [r for r in all_results if r["grade"] == "critical"]
    scores = [r["complexity"] for r in all_results]
    avg_complexity = round(sum(scores) / len(scores), 2)

    summary = {
        "functions_analyzed": len(all_results),
        "hotspots": len(hotspots),
        "critical": len(critical),
        "avg_complexity": avg_complexity,
        "max_complexity": all_results[0]["complexity"],
        "max_function": all_results[0]["function"],
        "max_function_file": all_results[0]["file"],
        "max_function_line": all_results[0]["line"],
    }

    # Return top 50 — enough for actionable analysis without bloating context
    output = {"summary": summary, "ranked": all_results[:50]}
    print(json.dumps(output, indent=2))
    print(
        f"[PASS] {len(all_results)} functions | {len(hotspots)} hotspots | "
        f"{len(critical)} critical | avg={avg_complexity} | max={summary['max_complexity']} "
        f"in {summary['max_function']}()",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()

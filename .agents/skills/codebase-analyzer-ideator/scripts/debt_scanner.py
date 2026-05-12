#!/usr/bin/env python3
"""
debt_scanner.py — Technical Debt Signal Scanner
Detects four debt signal categories per Python file:
  1. Debt comments  — TODO / FIXME / HACK / XXX / BUG / WORKAROUND
  2. Magic numbers  — unexplained numeric literals (excludes 0, 1, -1, 2, 100)
  3. Deep nesting   — control flow depth > MAX_NESTING (default 4)
  4. Large files    — LOC > LARGE_FILE_THRESHOLD (default 500)
Assigns a weighted debt score per file and ranks files by severity.
Usage: python scripts/debt_scanner.py <path>
Output: JSON to stdout. Status line to stderr.
Exits 0 on success, 1 on fatal error.
"""
import ast
import json
import re
import sys
from pathlib import Path


# --- Configuration constants (document why if you change these) ---
# Magic numbers: 0/1/-1 are near-universal; 2 is ubiquitous in halving/doubling;
# 100 is ubiquitous in percentage calculations.
MAGIC_IGNORE: frozenset = frozenset({0, 1, -1, 2, 100})
# 500 lines: empirical threshold beyond which file comprehension degrades sharply.
LARGE_FILE_THRESHOLD = 500
# 4 nesting levels: beyond this, cognitive load exceeds maintainable range.
MAX_NESTING = 4
# Debt score weights: nesting is costliest (hardest to refactor safely).
WEIGHT_COMMENT = 1
WEIGHT_MAGIC = 2
WEIGHT_NESTING = 3
WEIGHT_LARGE = 10

DEBT_RE = re.compile(
    r"#\s*(TODO|FIXME|HACK|XXX|BUG|WORKAROUND|NOQA|TEMP):?\s*(.*)",
    re.IGNORECASE,
)


def max_nesting_depth(node: ast.AST, depth: int = 0) -> int:
    """Recursively compute the maximum control-flow nesting depth."""
    NESTING = (ast.If, ast.For, ast.While, ast.With, ast.Try, ast.ExceptHandler)
    current_max = depth
    for child in ast.iter_child_nodes(node):
        child_depth = max_nesting_depth(child, depth + 1 if isinstance(child, NESTING) else depth)
        current_max = max(current_max, child_depth)
    return current_max


def find_magic_numbers(tree: ast.AST, lines: list[str]) -> list[dict]:
    """Find unexplained numeric constants in assignment contexts. Capped at 20 per file."""
    results = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for child in ast.walk(node):
                if (
                    isinstance(child, ast.Constant)
                    and isinstance(child.value, (int, float))
                    and child.value not in MAGIC_IGNORE
                ):
                    ln = child.lineno
                    results.append({
                        "line": ln,
                        "value": child.value,
                        "context": lines[ln - 1].strip() if ln <= len(lines) else "",
                    })
                    if len(results) >= 20:
                        return results
    return results


def analyze_file(path: Path) -> dict:
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        return {"file": str(path), "error": str(e), "skipped": True}

    lines = source.splitlines()
    loc = len(lines)
    is_large = loc > LARGE_FILE_THRESHOLD

    # Debt comments (regex scan — works even on unparseable files)
    debt_comments: list[dict] = []
    for i, line in enumerate(lines, 1):
        m = DEBT_RE.search(line)
        if m:
            debt_comments.append({
                "line": i,
                "type": m.group(1).upper(),
                "message": m.group(2).strip(),
            })

    # AST-based signals
    magic_numbers: list[dict] = []
    deep_nesting: list[dict] = []
    max_depth = 0

    try:
        tree = ast.parse(source, filename=str(path))
        magic_numbers = find_magic_numbers(tree, lines)

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                depth = max_nesting_depth(node)
                max_depth = max(max_depth, depth)
                if depth > MAX_NESTING:
                    deep_nesting.append({
                        "function": node.name,
                        "line": node.lineno,
                        "depth": depth,
                    })
    except SyntaxError:
        pass  # Comment scan results are still valid

    debt_score = (
        len(debt_comments) * WEIGHT_COMMENT
        + len(magic_numbers) * WEIGHT_MAGIC
        + len(deep_nesting) * WEIGHT_NESTING
        + (WEIGHT_LARGE if is_large else 0)
    )

    return {
        "file": str(path),
        "loc": loc,
        "large_file": is_large,
        "debt_score": debt_score,
        "debt_comment_count": len(debt_comments),
        "debt_comments": debt_comments,
        "magic_number_count": len(magic_numbers),
        "magic_numbers": magic_numbers,
        "max_nesting_depth": max_depth,
        "deep_nesting_count": len(deep_nesting),
        "deep_nesting": deep_nesting,
    }


def collect_python_files(path: Path) -> list[Path]:
    if path.is_file() and path.suffix == ".py":
        return [path]
    if path.is_dir():
        return sorted(path.rglob("*.py"))
    return []


def main() -> None:
    if len(sys.argv) < 2:
        print("[FAIL] Usage: python scripts/debt_scanner.py <path>", file=sys.stderr)
        sys.exit(1)

    target = Path(sys.argv[1])
    if not target.exists():
        print(f"[FAIL] Path not found: {target}", file=sys.stderr)
        sys.exit(1)

    files = collect_python_files(target)
    if not files:
        print(f"[FAIL] No .py files found at: {target}", file=sys.stderr)
        sys.exit(1)

    results = [analyze_file(f) for f in files]
    valid = [r for r in results if not r.get("skipped")]
    skipped = len(results) - len(valid)

    # Rank by debt score descending
    valid.sort(key=lambda x: x["debt_score"], reverse=True)

    total_comments = sum(r["debt_comment_count"] for r in valid)
    total_magic = sum(r["magic_number_count"] for r in valid)
    large_files = [r["file"] for r in valid if r["large_file"]]
    nesting_files = [r for r in valid if r["deep_nesting_count"] > 0]

    # Aggregate debt comment type distribution
    type_counts: dict[str, int] = {}
    for r in valid:
        for c in r["debt_comments"]:
            t = c["type"]
            type_counts[t] = type_counts.get(t, 0) + 1

    summary = {
        "files_scanned": len(valid),
        "files_skipped": skipped,
        "total_debt_comments": total_comments,
        "debt_comment_types": type_counts,
        "total_magic_numbers": total_magic,
        "large_files_count": len(large_files),
        "files_with_deep_nesting": len(nesting_files),
        "top_debt_file": valid[0]["file"] if valid else None,
        "top_debt_score": valid[0]["debt_score"] if valid else 0,
    }

    print(json.dumps({"summary": summary, "files": valid}, indent=2))
    print(
        f"[PASS] {len(valid)} files | {total_comments} debt comments | "
        f"{total_magic} magic numbers | {len(large_files)} large files | "
        f"{len(nesting_files)} deep nesting",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()

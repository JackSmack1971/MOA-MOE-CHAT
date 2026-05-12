#!/usr/bin/env python3
"""
ast_analyzer.py — Codebase Structural Analysis
Extracts function/class metrics, docstring coverage, and type hint coverage.
Usage: python scripts/ast_analyzer.py <path>
Output: JSON to stdout. Status line to stderr.
Exits 0 on success, 1 on fatal error.
"""
import ast
import json
import sys
from pathlib import Path


def analyze_file(path: Path) -> dict:
    try:
        source = path.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        return {"file": str(path), "error": str(e), "skipped": True}

    try:
        tree = ast.parse(source, filename=str(path))
    except SyntaxError as e:
        return {"file": str(path), "error": f"SyntaxError: {e}", "skipped": True}

    lines = source.splitlines()
    functions: list[dict] = []
    classes: list[dict] = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            end = getattr(node, "end_lineno", node.lineno)
            length = end - node.lineno + 1
            has_return_hint = node.returns is not None
            has_docstring = (
                len(node.body) > 0
                and isinstance(node.body[0], ast.Expr)
                and isinstance(node.body[0].value, ast.Constant)
                and isinstance(node.body[0].value.value, str)
            )
            functions.append({
                "name": node.name,
                "line": node.lineno,
                "length": length,
                "has_return_hint": has_return_hint,
                "has_docstring": has_docstring,
                "is_long": length > 30,
            })
        elif isinstance(node, ast.ClassDef):
            classes.append({"name": node.name, "line": node.lineno})

    loc = len(lines)
    long_fns = [f for f in functions if f["is_long"]]
    # Only flag public functions (not private/dunder) for hint/doc coverage
    public_fns = [f for f in functions if not f["name"].startswith("_")]
    missing_hints = [f["name"] for f in public_fns if not f["has_return_hint"]]
    missing_docs = [f["name"] for f in public_fns if not f["has_docstring"]]
    fn_lengths = [f["length"] for f in functions]
    avg_len = round(sum(fn_lengths) / len(fn_lengths), 1) if fn_lengths else 0

    return {
        "file": str(path),
        "loc": loc,
        "function_count": len(functions),
        "class_count": len(classes),
        "avg_function_length": avg_len,
        "long_functions": [
            {"name": f["name"], "line": f["line"], "length": f["length"]}
            for f in long_fns
        ],
        "missing_return_hints": missing_hints,
        "missing_docstrings": missing_docs,
    }


def collect_python_files(path: Path) -> list[Path]:
    if path.is_file() and path.suffix == ".py":
        return [path]
    if path.is_dir():
        return sorted(path.rglob("*.py"))
    return []


def main() -> None:
    if len(sys.argv) < 2:
        print("[FAIL] Usage: python scripts/ast_analyzer.py <path>", file=sys.stderr)
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

    total_loc = sum(r["loc"] for r in valid)
    total_fns = sum(r["function_count"] for r in valid)
    total_classes = sum(r["class_count"] for r in valid)
    all_long = [fn for r in valid for fn in r["long_functions"]]
    all_missing_hints = sum(len(r["missing_return_hints"]) for r in valid)
    all_missing_docs = sum(len(r["missing_docstrings"]) for r in valid)
    hint_pct = round((total_fns - all_missing_hints) / total_fns * 100, 1) if total_fns else 0.0
    doc_pct = round((total_fns - all_missing_docs) / total_fns * 100, 1) if total_fns else 0.0

    summary = {
        "files_analyzed": len(valid),
        "files_skipped": skipped,
        "total_loc": total_loc,
        "total_functions": total_fns,
        "total_classes": total_classes,
        "long_functions_count": len(all_long),
        "missing_return_hints": all_missing_hints,
        "missing_docstrings": all_missing_docs,
        "hint_coverage_pct": hint_pct,
        "docstring_coverage_pct": doc_pct,
    }

    print(json.dumps({"summary": summary, "files": results}, indent=2))
    print(
        f"[PASS] {len(valid)} files | {total_loc} LOC | {total_fns} functions | "
        f"{len(all_long)} long | hint_coverage={hint_pct}% | doc_coverage={doc_pct}%",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()

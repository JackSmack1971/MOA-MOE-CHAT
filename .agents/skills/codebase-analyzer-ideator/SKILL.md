---
name: codebase-analyzer-ideator
description: >
  Analyzes Python codebases end-to-end using bundled static AST analysis scripts and
  generates prioritized feature/improvement roadmaps. Trigger on: "analyze codebase",
  "ideate features", "suggest improvements", "code audit", "refactor roadmap",
  "new feature ideas", "technical debt review", "architecture review",
  "what should I build next", "codebase health check". Runs three scripts
  (ast_analyzer.py, complexity_report.py, debt_scanner.py) to extract quantitative
  metrics, then synthesizes architecture health report, impact/effort idea matrix, and
  actionable backlog. Do NOT trigger for single-file bug fixes, quick patches, or
  non-Python codebases unless explicitly requested.
license: MIT
compatibility: Requires Python 3.8+. Scripts use stdlib only — no pip installs needed.
allowed-tools: Read Bash Glob
argument-hint: "[path-to-codebase]"
metadata:
  version: 1.0.0
  author: bret
  scripts: ast_analyzer.py complexity_report.py debt_scanner.py
---

# Codebase Analyzer & Feature Ideator

World-class principal engineer + product thinker. Build a complete mental model of the
system, surface risks and opportunities, then generate high-impact, feasible ideas
aligned with business goals.

**Before deep ideation:** ask clarifying questions about business priorities, target
users, and constraints unless context is already explicit.

---

## Phase 1 — Exploration

Map the codebase structure before any analysis.

1. `tree -L 3 <path>` (or `find <path> -type f | head -80` if tree unavailable)
2. `cat` key files: entry points, config files, `requirements.txt`, `pyproject.toml`
3. `grep -r "def " <path> --include="*.py" -l` — identify domain boundaries
4. Build a concise architecture summary using a Mermaid diagram

Identify: entry points, core domains, data flow, key tech decisions.

---

## Phase 2 — Static Analysis (Scripts)

Run all three scripts against `<path>`. Scripts output JSON to stdout; status to stderr.

### Step 2a — Structural Metrics
```bash
python scripts/ast_analyzer.py <path>
```
Extracts: LOC per file, function/class counts, average function length, functions >30
lines, return type hint coverage, docstring coverage. Output → `ast_report.json`.

```bash
python scripts/ast_analyzer.py <path> > /tmp/ast_report.json
```

### Step 2b — Cyclomatic Complexity
```bash
python scripts/complexity_report.py <path> > /tmp/complexity_report.json
```
Per-function complexity score (1 + branch count). Grade: `ok` / `hotspot` (>10) /
`critical` (>20). Output ranked list — top offenders drive refactor priorities.

### Step 2c — Technical Debt Signals
```bash
python scripts/debt_scanner.py <path> > /tmp/debt_report.json
```
Detects: TODO/FIXME/HACK/XXX comments, magic numbers, deep nesting (>4 levels), large
files (>500 lines). Assigns a weighted debt score per file.

**If any script fails:** read the `[FAIL]` message on stderr, check that `<path>` exists
and contains `.py` files, then re-run. Do not proceed to Phase 3 until all three produce
`[PASS]`.

### Synthesize
Parse all three JSON outputs. Extract:
- Top 5 complexity hotspots
- Top 3 debt-score files
- Hint/docstring coverage gaps
- Structural risks (large files, missing entry-point docs)

---

## Phase 3 — Ideation

Use `references/ideation_framework.md` for the full JTBD framework, Impact/Effort
scoring rubric, and per-idea spec template.

Generate ideas across three horizons:
- **Quick Wins** — low effort, high impact; exploits existing strengths
- **Strategic Bets** — high effort, high impact; architectural improvements
- **Nice-to-Haves** — low impact or speculative; park for later

For each idea: user story, acceptance criteria, implementation sketch, estimated effort
(S/M/L), risks. Reference `references/ideation_framework.md` for the full template.

---

## Phase 4 — Prioritization & Output

Produce the full structured report in this exact format:

---

**Executive Summary** (2–3 sentences)

**1. Codebase Health Report**
- Architecture overview (Mermaid)
- Strengths
- Technical Debt & Risks (with severity: LOW / MED / HIGH / CRITICAL)
- Refactor Recommendations

**2. Feature & Improvement Ideas**

| Idea | Description | Impact | Effort | Priority |
|------|-------------|--------|--------|----------|

**3. Detailed Idea Deep-Dive** (top 3–5 ideas — full specs per `ideation_framework.md`)

**4. Next Actions** (concrete first steps + commands to run)

**5. Questions for You** (missing context that would change recommendations)

---

## Rules

- Be brutally honest but constructive.
- Never suggest changes that break existing behavior without explicit opt-in.
- Prefer incremental, safe improvements over big rewrites.
- Use existing patterns and conventions from the codebase and CLAUDE.md if present.
- Explore more files before concluding — do not guess at structure.
- Keep all recommendations actionable and implementation-ready.
- When scripts surface data, cite the metric (e.g., "complexity score 14 in `auth.py:validate`").
- Use quantitative signals from script output wherever possible.

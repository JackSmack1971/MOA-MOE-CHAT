# Ideation Framework

Reference for Phase 3 of the codebase-analyzer-ideator skill.
Load this file when generating feature ideas or improvement proposals.

---

## Jobs-to-Be-Done (JTBD) Lens

Frame every idea as a job the user/system is trying to accomplish:

> **"When [situation], I want to [motivation], so I can [expected outcome]."**

Use this framing to separate the *capability* (what the code does) from the *outcome*
(what the user/business actually needs). Ideas that don't map to a real JTBD are
candidates for the "Nice-to-Have" bin regardless of technical elegance.

### JTBD Categories
- **Functional** — core task completion (speed, accuracy, reliability)
- **Emotional** — confidence, trust, reduced anxiety
- **Social** — status, collaboration, visibility
- **Operational** — maintenance burden, deployment friction, observability

---

## Impact/Effort Scoring Rubric

### Impact (business + user value)
| Score | Label | Criteria |
|-------|-------|----------|
| HIGH | 🔴 | Directly enables revenue, retention, or core user outcomes. Addresses a top-3 complaint or bottleneck. |
| MED | 🟡 | Improves quality of life for a significant user segment. Reduces support load or engineering toil. |
| LOW | 🟢 | Minor polish, edge-case coverage, or speculative future need. |

### Effort (engineering cost)
| Score | Label | Criteria |
|-------|-------|----------|
| S | Small | ≤2 days. Single file or isolated module. No schema changes. |
| M | Medium | 3–10 days. Touches 2–5 modules. May need a migration or new dependency. |
| L | Large | >10 days. Cross-cutting concern. Requires design review, schema change, or new infrastructure. |

### Priority Matrix
```
         HIGH Impact   MED Impact   LOW Impact
  S Effort   ★★★★         ★★★          ★★
  M Effort   ★★★          ★★           ★
  L Effort   ★★           ★            ✗
```
- ★★★★ = Quick Win (ship first)
- ★★★ = Strategic
- ★★ = Backlog
- ★ = Parking lot
- ✗ = Do not pursue unless impact reassessed

---

## Idea Deep-Dive Template

Use this template for every idea in the "Detailed Idea Deep-Dive" section.

### [Idea Name]

**JTBD:**
> When [situation], I want to [motivation], so I can [outcome].

**User Story:**
> As a [persona], I want [capability] so that [value].

**Acceptance Criteria:**
- [ ] AC1 — specific, testable
- [ ] AC2
- [ ] AC3

**Implementation Sketch:**
High-level approach (3–5 sentences). Reference specific files/modules from Phase 1
exploration. Do not design the full solution here — flag unknowns explicitly.

**Files Likely Affected:**
- `path/to/module.py` — reason
- `path/to/config.yaml` — reason

**Estimated Effort:** S / M / L

**Risks & Unknowns:**
- Risk 1 (e.g., "Depends on external API rate limits — needs spike")
- Risk 2

**Dependencies:** (other ideas or infrastructure this requires first)

**Diagram:** (include Mermaid if the flow is non-obvious)

---

## Idea Horizons

### Horizon 1 — Quick Wins (≤2 days, high confidence)
Improvements that exploit existing code structure with minimal risk. Typical sources:
- Functions flagged `complexity > 10` in `complexity_report.json` → extract helpers
- Files with `debt_score > 20` in `debt_report.json` → targeted refactor
- Functions with `length > 30` in `ast_report.json` → single-responsibility split
- Missing docstrings on public APIs → documentation sprint

### Horizon 2 — Strategic Bets (>10 days, high payoff)
Architectural improvements that unlock future velocity:
- Introducing a service layer if business logic bleeds into views
- Adding a type-checked data layer if `hint_coverage_pct < 60%`
- Extracting a domain model if multiple modules share overlapping logic
- Introducing async patterns if I/O-bound paths are synchronous

### Horizon 3 — Product Features (net-new user value)
New capabilities derived from codebase strengths. Identify:
- Under-utilized modules that could be exposed as user-facing features
- Data already being collected but not surfaced
- Integration points that third-party tools could extend

---

## Anti-Patterns to Flag

Surface these explicitly in the Health Report:

| Anti-Pattern | Detection Signal | Severity |
|---|---|---|
| God object / God function | `length > 100` or `complexity > 25` | CRITICAL |
| Shotgun surgery | Same debt comment across 5+ files | HIGH |
| Primitive obsession | High magic_number_count, no dataclasses | MED |
| Spaghetti nesting | `max_nesting_depth > 6` | HIGH |
| Dead code (inferred) | Functions with no callers (check manually) | MED |
| Missing error boundaries | No try/except in I/O-heavy files | HIGH |
| Hardcoded config | Magic strings/numbers in non-config files | MED |

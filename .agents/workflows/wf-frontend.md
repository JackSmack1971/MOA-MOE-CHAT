---
description: High-fidelity frontend orchestration workflow. Executes Suspense-first React patterns, Spec-Driven Development (SDD), and autonomous Browser Subagent visual verification.
---

---

name: wf-frontend
description: High-fidelity frontend orchestration workflow. Executes Suspense-first React patterns, Spec-Driven Development (SDD), and autonomous Browser Subagent visual verification.
mode: planning_only
security: strict_mode, terminal_request_review
---

# /wf-frontend: Agentic Frontend Orchestration Sequence

**Engineering Manager Directive:** Execute the following sequence deterministically. Do not collapse steps. Await explicit human review at all defined Artifact generation gates.

## Step 1: Product-to-Engineering Handoff (SDD)

Call `/speckit.specify` and `/speckit.clarify`.

- Collaborate with the engineering manager to define functional requirements and establish the `spec.md` Artifact.
- Aggressively probe for edge cases regarding MUI v7 styling tokens and Suspense boundary fallbacks before proceeding.

## Step 2: Architectural Planning

Call `/speckit.plan`.

- Scan `.antigravity/module_registry.md` to map existing `src/features/` boundaries.
- **Constraints**:
  - All GET requests must utilize TanStack Query `useSuspenseQuery`.
  - Component Anatomy must strictly enforce TypeScript interfaces.
  - Lists > 50 items mandate virtualization.
- **Output Gate**: Generate `implementation_plan.md` and `tasks.md`. Hault execution and await explicit 'Proceed' authorization via the Agent Manager Inbox.

## Step 3: Implementation & <task_boundary_tool>

Call `/speckit.implement`.

- Execute the approved `tasks.md` sequentially.
- You MUST utilize the `<task_boundary_tool>` to project continuous operational updates (TaskName, TaskSummary, TaskStatus) to the Mission Control UI. Do not flood the terminal stream.

## Step 4: Browser Subagent Verification (Agentic Vision)

Once code is committed to the local branch, deploy the Browser Subagent.

- **Action**: Launch the localhost URL.
- **Verification**: Execute the "Think, Act, Observe" loop to visually confirm the MUI v7 layout, ARIA labels, and responsive breakpoints.
- **Feedback**: Capture a static screenshot for coordinate-based annotation by the engineering manager.
- **Final Output**: Generate a `walkthrough.md` Artifact and attach the compressed WebP browser recording as incontrovertible proof of functional viability.

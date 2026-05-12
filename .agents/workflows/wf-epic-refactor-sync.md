---
description: Orchestrates trajectory-level refactors. Manages context mapping, batch execution, and regression resolution for large-scale architectural updates.
---

---

name: wf-epic-refactor-sync
description: Orchestrates trajectory-level refactors. Manages context mapping, batch execution, and regression resolution for large-scale architectural updates
---

# Epic Refactor Synchronization Workflow

**Operating Mandate:** You are executing a high-risk, trajectory-level workflow. You must operate strictly in **Plan Mode**. Enforce Design-by-Contract. Invoke the `<task_boundary_tool>` at the start of each phase below to update the Agent Manager UI.

## Phase 1: Context & Dependency Mapping

1. Execute `Call /audit-context-building`.
2. **Precondition Check:** Verify that `module_registry.md` and `_git_insights.md` exist in the `.antigravity/` directory. If missing or corrupted, halt and request human intervention to avoid cache loops.
3. Generate a comprehensive `implementation_plan.md` artifact detailing the proposed structural changes, tech-stack choices, and blast radius.
4. **GATE [Request Review]:** Halt execution. Send the `implementation_plan.md` to the Agent Manager Inbox. Do not proceed until the engineering manager clicks **Proceed**.

## Phase 2: Batch Execution

1. Awaiting human approval of Phase 1.
2. Execute `Call /orchestrate-batch-refactor`.
3. Apply changes strictly according to the approved implementation plan. Group your operations by semantic modules to optimize the 1-million-token context window and prevent 503 Quota Starvation.
4. Generate structured **Code Diffs** for all modified directories.

## Phase 3: Regression Resolution

1. Execute `Call /systematic-debugging`.
2. Dispatch the Terminal Subagent to run the global test suite (e.g., `npm test`, `cargo test`, `pytest`).
3. **Self-Correction Loop:** If any unit tests fail, analyze the stack trace, generate the fix, and re-run the tests. If the loop repeats more than 3 times, execute a `git stash`, log the failure to the Inbox, and halt.

## Phase 4: Visual Verification & Handoff

1. Dispatch the Browser Subagent to local staging. Execute a "Think, Act, Observe" loop to visually verify the refactored UI/API components.
2. Capture annotated screenshots and a WebP browser recording of the core user journeys.
3. Execute `Call /walkthrough`.
4. Compile `walkthrough.md` integrating the code diffs, testing output, and visual WebP artifacts.
5. **Postcondition Check:** Ensure no global Rules (`~/.gemini/GEMINI.md`) were violated during this trajectory.

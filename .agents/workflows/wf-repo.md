---
description: Agent-first orchestration for monorepo maintenance, PR reviews, and codebase hygiene.
---

---

name: Repo Governance Protocol
description: Agent-first orchestration for monorepo maintenance, PR reviews, and codebase hygiene
---

# /repo-governance Workflow

## Step 1: Context & History Ingestion

- **Command:** Call `/ag-refresh`
- **Constraint:** Ensure the `GitAgent` updates `_git_insights.md` to map recent blast radii and architectural ownership.

## Step 2: PR Review & Spec Alignment (SDD)

- **Command:** Call `/speckit.plan` against all open PRs targeting `main`.
- **Constraint:** Generate a `Code Diff` Artifact. Compare the diff against the structural invariants defined in `GEMINI.md`. If the diff violates architecture or lacks atomic commit structures, trigger multi-agent handover to adversarially reject the PR and request human review in the Inbox.

## Step 3: Visual Verification

- **Command:** Call `/verify-ui`
- **Constraint:** Dispatch the Browser Subagent. Navigate to the PR preview URL. Execute the "Think, Act, Observe" loop. Generate a compressed WebP video artifact (`walkthrough.md`) verifying UI state and deliver it to the Agent Manager Inbox.

## Step 4: Stale Branch Pruning & Hygiene

- **Command:** Execute Terminal Subagent under `Request Review` policy.
- **Constraint:** Identify branches stale for >30 days. Batch `git push origin --delete` and `git branch -D` commands. Halt execution. Send a structured Artifact to the Manager Inbox and wait for explicit human `Proceed` authorization.

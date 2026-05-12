---
description: Executes multi-stage CI/CD pipelines, orchestrates parallel security scans, performs visual staging verification via Browser Subagent, and halts for Agent Manager Inbox approval before Production
---

---

name: deploy
description: Executes multi-stage CI/CD pipelines, orchestrates parallel security scans, performs visual staging verification via Browser Subagent, and halts for Agent Manager Inbox approval before Production rollout
---

# /deploy: Agentic Deployment Workflow

**Context Inheritance:** Inherit all baseline rules from `~/.gemini/GEMINI.md` and repository architecture from `.antigravity/knowledge/module_registry.md`.

## Step 1: Automated Risk Assessment & Context Refresh

- Trigger the `ag-refresh` Context Refresh Pipeline to ensure the knowledge graph is up to date with the latest branch diffs.
- Evaluate the diff against the `module_registry.md`. If changes touch `high-risk` areas (e.g., `/auth`, `/database`), apply the `high-risk` label to the PR via the GitHub MCP server.

## Step 2: Parallel Verification (Shift-Left & Matrix)

Dispatch parallel Terminal Subagents to execute:

1. **Test Matrix:** `npm run test:matrix` (Unit/Integration).
2. **Security Scans:** Run Trivy filesystem scans and Snyk dependency analysis.

- **Verification Gate:** If any subagent returns a non-zero exit code or detects a vulnerability > MEDIUM, halt execution, generate a Code Diff artifact proposing the fix, and await human review in the Inbox.

## Step 3: Staging Rollout & Visual Verification

- **Build:** Execute multi-stage Docker build utilizing semantic versioning tags.
- **Deploy:** Execute `kubectl apply -f k8s/overlays/staging` via the Kubernetes MCP.
- **Agentic Vision Test:** Dispatch the Browser Subagent to the staging URL.
  - **Action:** Navigate the core user authentication and data ingestion flows.
  - **Capture:** Generate an annotated WebP browser recording of the entire end-to-end user flow.
  - **Output:** Deliver the `walkthrough.md` and WebP Artifact to the Agent Manager Inbox.

## Step 4: Production Approval Gate

- **Artifact Review Policy:** `Request Review`.
- Do NOT proceed to production. Submit the Implementation Plan, Trivy logs, and the Browser Subagent's WebP recording to the Inbox.
- Await the Engineering Manager's Proceed button click.

## Step 5: Production Rollout & Self-Correction

- Upon human approval, execute `kubectl apply -f k8s/overlays/production`.
- Monitor `kubectl rollout status` and the `/health` endpoint for 120 seconds.
- **Self-Correction Loop:** If the health check fails, immediately execute `kubectl rollout undo deployment`, revert the git state, and surface a catastrophic failure Artifact to the Inbox.

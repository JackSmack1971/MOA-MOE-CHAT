---
description: Continuous security enhancement workflow. Chains threat modeling, API probing, and secret auditing into a unified hardening sprint.
---

---

name: wf-security-hardening-pipeline
description: Continuous security enhancement workflow. Chains threat modeling, API probing, and secret auditing into a unified hardening sprint
---

# Security Hardening Pipeline Workflow

**Objective:** Execute a comprehensive, multi-agent security audit and remediation sprint across the active repository.

## Execution Constraints

- **Strict Mode Requirement:** Verify that Antigravity is operating in Strict Mode. Do not proceed if Terminal Auto Execution is set to "Always Proceed".
- **Artifact Generation:** Every phase below MUST output a reviewable Artifact (Code Diff, `task.md`, or WebP recording) to the Agent Manager Inbox before advancing to the next step.

## Trajectory Sequence

### Step 1: Threat Modeling & Baseline Audit

Execute Call `/007`

- **Directive:** Scan the `.antigravity/` persistent knowledge base and current module registry. Generate a `threat_model.md` Artifact detailing immediate architectural vulnerabilities.
- **Verification Gate:** Await explicit Engineering Manager approval on the Artifact before proceeding.

### Step 2: Active API Probing

Execute Call `/api-security-testing`

- **Directive:** Dispatch the Browser Subagent and Terminal Subagent to probe exposed endpoints defined in the threat model.
- **Constraint:** Restrict all network requests strictly to `localhost` or the defined staging environment.
- **Output:** Generate annotated screenshots of any unauthenticated or bleeding endpoints.

### Step 3: Credential Audit & Rotation

Execute Call `/secrets-management`

- **Directive:** Scan all environment variables, config maps, and ignored files for exposed or stale credentials.
- **Constraint:** Generate a Code Diff proposing the rotation of stale secrets. **CRITICAL:** Do not execute any terminal commands to mutate external cloud key vaults without explicit `Request Review` approval in the Inbox.

### Step 4: Final Posture Verification

Execute Call `/security-auditor`

- **Directive:** Review all executed changes against the global `~/.gemini/GEMINI.md` security rules.
- **Output:** Compile a final `walkthrough.md` summarizing the security delta, ensuring all preconditions and postconditions of the SDD contract have been met.

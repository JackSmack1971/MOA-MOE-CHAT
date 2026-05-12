---
description: Pre-submission quality orchestrator. Executes a multi-stage audit (Lint -> Security -> Test -> PR Writing) to ensure zero-defect delivery.
---

---

name: wf-pr-audit-cycle
description: Pre-submission quality orchestrator. Executes a multi-stage audit (Lint -> Security -> Test -> PR Writing) to ensure zero-defect delivery
---

# PR Audit Cycle Orchestrator

Execute the following sequence meticulously. You are operating under the Agentic Dispatch Protocol. If any step fails, utilize your Chain-of-Thought reasoning to self-correct up to a maximum of 3 times. If failure persists, execute a `git revert` to the pre-workflow state, halt execution, and request human review via the Agent Manager Inbox.

## Step 1: Stylistic Compliance

Execute `Call /lint-and-validate`.

- Ensure all codebase modifications conform to the global `~/.gemini/GEMINI.md` standard.
- Autofix minor stylistic violations autonomously.

## Step 2: Static Vulnerability Analysis

Execute `Call /security-auditor`.

- Scan the diff for hardcoded credentials, prompt injection vectors, and AI Agent Traps.
- **CRITICAL INVARIANT:** If any vulnerability scoring High or Critical is detected, HALT execution immediately and trigger a Request Review in the Inbox. Do not proceed to Step 3.

## Step 3: Test Coverage Enforcement

Execute `Call /tdd-workflows-tdd-red`.

- Dispatch the Terminal Subagent to execute the test suite.
- Validate that the new logic maintains or increases overall code coverage.
- Ensure any visual UI changes are verified by the Browser Subagent via annotated WebP recordings.

## Step 4: Semantic Pull Request Generation

Execute `Call /pr-writer`.

- Synthesize the verified outputs of Steps 1-3.
- Generate a structured Code Diff Artifact and a `walkthrough.md` Artifact.
- Prepare the semantic Pull Request description and await final human orchestrator approval before executing any `git push` commands.

---
description: High-fidelity SDD initialization. Transforms a minimal objective into a fully scaffolded, architecturally sound task track using blueprint, ADR, and Conductor.
---

---

name: wf-sdd-bootstrap
description: High-fidelity SDD initialization. Transforms a minimal objective into a fully scaffolded, architecturally sound task track using blueprint, ADR, and Conductor
---

# SDD Bootstrap Workflow

**Context:** You are operating under the Agentic Dispatch Protocol. You are executing a master initialization trajectory. You must adhere strictly to the Spec-Driven Development (SDD) lifecycle. Do not write application code during this workflow.

## ⚙️ Execution Trajectory

Follow these steps sequentially. Utilize the `<task_boundary_tool>` to update the Agent Manager UI for the orchestrator at the start of each step.

### Step 1: Strategic Blueprinting

Evaluate the user's minimal objective. Establish the core functional requirements, edge cases, and success criteria.

* **Action:** `Call /blueprint`
* **Invariant:** Do not proceed until the foundational specification artifact is generated and reviewed.

### Step 2: Architecture Decision Records (ADR)

Analyze the technical trade-offs required to fulfill the blueprint. Define the database schema, data flow, and external dependencies.

* **Action:** `Call /architecture-decision-records`
* **Output Constraint:** Format the output as a formal ADR artifact. Flag any required external MCP connections (e.g., PostgreSQL, GitHub).

### Step 3: Workspace Scaffolding

Transition from abstract planning to physical repository structure. Create the necessary directories, empty files, and initial boilerplate mapping to the ADR.

* **Action:** `Call /conductor-new-track`
* **Security Gate:** Submit all `mkdir`, `touch`, or `npm install` terminal commands to the Inbox via the `Request Review` policy.

### Step 4: Design System Synchronization

Update the project's design parameters based on the new feature requirements. Define CSS parameters, component hierarchies, and visual invariants.

* **Action:** `Call /design-md`
* **Post-Condition Verification:** Ensure the updated design definitions are explicitly written to the knowledge base so the Browser Subagent can utilize them for screenshot annotation and DOM verification later.

## 🛑 Final Verification Gate

Once Step 4 is complete, generate a post-action Walkthrough Artifact summarizing the initialized track and await explicit human approval in the Agent Manager Inbox before closing the workflow.

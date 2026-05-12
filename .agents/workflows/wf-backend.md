---
description: Enforces R-C-S-R layered node architecture and BFRI risk indexing. Automatically wires Zod validation, Sentry observability, and Redis caching protocols. Use for robust server-side API, microservice, and route development.
---

---

description: Scaffolds a new backend service utilizing the R-C-S-R architecture and wiring core dependencies
---

# Backend Generation Workflow

## Step 1: BFRI Assessment

- Analyze the user's natural language objective.
- Generate a `bfri_assessment.md` Artifact calculating Complexity, Risk, and Impact.
- Pause and await user approval via Inbox before proceeding.

## Step 2: Spec-Driven Planning

- Execute internal sub-workflow: `Call /speckit.plan`
- Generate an `implementation_plan.md` detailing the required Routes, Controllers, Services, and Repositories.

## Step 3: Scaffold & Wire

- Install required dependencies via Terminal Subagent (zod, sentry, redis, pino).
- Generate the core file structure adhering strictly to the R-C-S-R paradigm defined in `.agents/rules/backend-guardrails.md`.

## Step 4: Visual & Console Verification

- Launch the development server.
- Dispatch the Browser Subagent to navigate to the generated localhost endpoints.
- Capture console logs and an annotated WebP recording proving successful data fetching and Redis cache hits.
- Deliver the final Walkthrough Artifact to the Agent Manager Inbox.

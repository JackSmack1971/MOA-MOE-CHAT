# Workflow: Codebase Audit & Ideation Orchestration

**Description:** Executes the codebase-analyzer-ideator skill, ingests AST metrics, maps to the knowledge base, and prepares a refactoring swarm.

## Step 1: Metric Extraction (Terminal Subagent)

- @Agent: Activate `codebase-analyzer-ideator` skill.
- Use the Terminal Subagent to execute:
  1. `python .agents/skills/codebase-analyzer-ideator/scripts/ast_analyzer.py src/`
  2. `python .agents/skills/codebase-analyzer-ideator/scripts/complexity_report.py src/`
  3. `python .agents/skills/codebase-analyzer-ideator/scripts/debt_scanner.py src/`
- Capture all JSON `stdout` outputs. Do not halt on `[FAIL]` stderr; report the error to the Inbox.

## Step 2: Contextual Synthesis (Knowledge Base RAG)

- Cross-reference the top 5 complexity hotspots and top 3 debt-score files against `.antigravity/knowledge/_git_insights.md` and `module_registry.md`. 
- Identify which business domains are most at risk due to structural decay.

## Step 3: Horizon Mapping & Artifact Generation

- Load `.agents/skills/codebase-analyzer-ideator/references/ideation_framework.md`.
- Generate the "Codebase Health Report".
- Present the Output Schema to the Agent Manager Inbox for human review.

## Step 4: Swarm Dispatch (Conditional)

- UPON HUMAN APPROVAL of the Health Report:
- Generate a `task.md` isolating the top 3 "Quick Wins".
- Dispatch a secondary Gemini 3 Flash subagent in Fast Mode to execute the Quick Wins.
- Mandate the Browser Subagent to record a WebP walkthrough of the application running post-refactor.

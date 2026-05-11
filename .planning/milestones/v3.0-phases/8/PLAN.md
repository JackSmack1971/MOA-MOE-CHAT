# Plan: Phase 8 - V3 Symbolic-MoE Prototype (Initiation)

## Goal
Evolve the V2 GoA pipeline into a Symbolic-MoE architecture by implementing adaptive skill-based routing and proficiency-weighted edge construction.

## User Review Required
> [!IMPORTANT]
> This phase modifies the `agent-registry.json` schema to include skill proficiency scores. We will stick with the `:free` model constraint for the "Keyword LLM" (Skill Extractor).

## Proposed Changes

### [Component] Registry & Taxonomy
#### [NEW] [skill-registry.json](file:///c:/workspaces/MOA-MOE-CHAT/src/prompts/skill-registry.json)
Define a taxonomy of ~15 atomic skills (e.g., `logic_puzzles`, `code_refactor`, `pii_audit`).

#### [MODIFY] [agent-registry.json](file:///c:/workspaces/MOA-MOE-CHAT/src/prompts/agent-registry.json)
Add `proficiencies` object to each agent mapping skills to scores [0-1].

---

### [Component] Symbolic Logic Layer
#### [MODIFY] [SymbolicSerializer.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/services/SymbolicSerializer.ts)
Implement `serializeSkillVector` to convert LLM keywords into a normalized numeric vector.

#### [MODIFY] [edgeConstructor.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/core/edgeConstructor.ts)
Implement `constructSkillEdges` that calculates the dot product between Agent Proficiencies and the Query Skill Vector.

---

### [Component] Orchestration V3
#### [MODIFY] [orchestrator.ts](file:///c:/workspaces/MOA-MOE-CHAT/src/core/orchestrator.ts)
1. Add Step 0.5: **Skill Extraction** using a `:free` Keyword LLM.
2. Replace Step 4 topology logic with `EdgeConstructor.constructSkillEdges`.
3. Update `poolingPrompt` to be skill-aware (weighting responses by skill-match).

---

## Verification Plan

### Automated Tests
- `npm test -- --grep "symbolic"`: Verify skill-vector serialization.
- `npm run benchmark:golden`: Compare V3 accuracy vs V2 baseline on math/logic fixtures.

### Manual Verification
- Review `logs/pino.log` to confirm "Skill Vector" extraction matches query intent (e.g., a Python query triggers `code_python` skill).

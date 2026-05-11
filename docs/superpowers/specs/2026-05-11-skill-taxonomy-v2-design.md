# Spec: Skill Taxonomy V2 & Domain-Aware Console

## 1. Objective
Transition the MoA-MoE chatbot from a flat skill list to a **Domain-Mapped Hierarchy** (COMPUTATIONAL, ABSTRACT_REASONING, CREATIVE_SYNTHESIS). This ensures the Selector Model achieves >0.92 confidence on hybrid queries and elevates the console telemetry to a production-grade "Orchestrator" experience.

## 2. Data Architecture (Skill Registry V2)
The `src/prompts/skill-registry.json` will adopt a domain-first schema.

### COMPUTATIONAL
- **Description**: High-precision code, math, data operations and tool orchestration.
- **Skills**: `code_python`, `code_javascript`, `symbolic_math`, `latent_space_navigation`, `tool_use`, `data_orchestration`, `structured_data`.

### ABSTRACT_REASONING
- **Description**: Logic, verification, security, and multi-agent coordination.
- **Skills**: `logic_deduction`, `epistemic_verification`, `security_audit`, `RAG_ORCHESTRATION`, `AGENT_DEBATE`.

### CREATIVE_SYNTHESIS
- **Description**: Narrative precision and high-craft console output.
- **Skills**: `semantic_synthesis`, `narrative_precision`, `console_output_formatting`.

## 3. UI/UX Integration (Modular Grid Deck)
- **Quadrant 01 (AGENT_TOPOLOGY)**: D3 Node halos color-coded by domain:
  - COMPUTATIONAL: `#00F2FF` (Command Cyan)
  - ABSTRACT_REASONING: `#FF00E5` (Logic Magenta)
  - CREATIVE_SYNTHESIS: `#64748B` (Dim Slate)
- **Quadrant 02 (SYSTEM_PULSE)**: `ACTIVE_SKILLS` display format: `[DOMAIN] :: skill, skill` with high-contrast inverse blocking.
- **Quadrant 03 (DATA_STREAM)**: Logic log prefixes: `[SYSTEM] :: DOMAIN_LOCK_ACHIEVED: [DOMAIN]`.

## 4. Technical Constraints
- **Model Registry**: Strictly limited to `:free` OpenRouter models.
- **Memory Budget**: Must remain within the 6.3GB resident limit.
- **Backward Compatibility**: Preserve existing D3 topology visualization logic; extend via attributes.

## 5. Verification Plan
- **Selector Confidence**: Verify >0.90 classification accuracy on hybrid prompt set.
- **Visual Audit**: Confirm domain-halo mapping matches the expert registry 1:1.
- **Telemetry Sync**: Ensure sidebar labels update in sync with the SSE skill vector.

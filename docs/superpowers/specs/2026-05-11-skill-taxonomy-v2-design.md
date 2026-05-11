# Spec: Skill Taxonomy V2 & Domain-Aware Console

## 1. Objective
Transition the MoA-MoE chatbot from a flat skill list to a **Domain-Mapped Hierarchy** and implement a **Consensus Debate** architecture. This ensures >0.95 reasoning accuracy by pairing titan-class experts (31B-120B) in adversarial loops with calibrated proficiency-based routing.

## 2. Data Architecture (Skill Registry V2)
### COMPUTATIONAL [Electric Blue]
- **Description**: High-precision code, math, and data operations.
- **Titan Benchmarks**: 120B (92/96), 70B (88/91), 31B (79/85).
- **Skills**: `code_python`, `code_javascript`, `symbolic_math`, `latent_space_navigation`, `tool_use`, `structured_data`.

### ABSTRACT_REASONING [Amber]
- **Description**: Logic, verification, and truth-claim assessment.
- **Titan Benchmarks**: 70B (95/94), 120B (89/85), 31B (82/78).
- **Skills**: `logic_deduction`, `epistemic_verification`, `security_audit`, `RAG_ORCHESTRATION`, `AGENT_DEBATE`.

### CREATIVE_SYNTHESIS [Violet]
- **Description**: Narrative precision and high-craft console output.
- **Titan Benchmarks**: 120B (93), 31B (91), 70B (87).
- **Skills**: `semantic_synthesis`, `narrative_precision`, `console_output_formatting`.

## 3. UI/UX Integration (Modular Grid Deck)
- **Quadrant 01 (AGENT_TOPOLOGY)**: D3 Node halos color-coded by domain:
  - COMPUTATIONAL: `#00F2FF` (Electric Blue)
  - ABSTRACT_REASONING: `#FFB000` (Amber)
  - CREATIVE_SYNTHESIS: `#8B5CF6` (Violet)
- **Quadrant 02 (SYSTEM_PULSE)**: `ACTIVE_SKILLS` display format: `[DOMAIN] :: skill, skill` with confidence bars for Abstract Reasoning.
- **Quadrant 03 (DATA_STREAM)**: Logic log prefixes: `[SYSTEM] :: DOMAIN_LOCK_ACHIEVED: [DOMAIN]`.

## 4. Consensus Debate Architecture
Triggered based on domain/skill vector:
- **Symbolic Math**: 120B (Depth) vs 70B (Verification) → High-consensus signal.
- **Epistemic Verification**: 70B vs 31B → Fast adversarial cycle with confidence telemetry.
- **Creative Synthesis**: 31B vs 120B → Balanced creativity with async depth.

## 5. Technical Constraints
- **Model Registry**: Strictly limited to `:free` OpenRouter models.
- **Resident Memory**: ≤ 6.3GB.
- **Real-time Viability**: 31B (95%), 70B (82%), 120B (45% - Async mitigation).

## 6. Verification Plan
- **Selector Confidence**: Verify >0.90 classification accuracy on hybrid prompt set.
- **Visual Audit**: Confirm chromatic mapping matches domain lock 1:1.
- **Debate Efficacy**: Confirm that the `consensus` output resolves contradictions identified in adversarial logs.

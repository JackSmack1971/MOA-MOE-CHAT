/**
 * AgentNode Interface
 * traces: FRD-FR-01, PRD §7.3, ADR-001, ADR-007
 */
export interface AgentNode {
  /** Unique identifier for the agent role (e.g., 'proposer', 'aggregator') */
  id: string;

  /** 
   * Model identifier for OpenRouter (e.g., 'nvidia/nemotron-3-super-120b-a12b:free')
   * V2 migration: string swap enables heterogeneous topology with zero core loop rewrite.
   */
  modelIdentifier: string;

  /** 
   * Immutable SOP (Standard Operating Procedure) prompt block.
   * MUST remain structurally immutable to maximize KV-cache reuse.
   */
  personaPrompt: string;

  /** 
   * Sampling temperature for the model.
   * Proposers typically use ~0.7; Aggregators use ~0.2.
   */
  temperature: number;
}

/**
 * GoA Meta-LLM Selector Prompt
 * traces: FR-23
 */
export const selectorPrompt = `You are the Meta-LLM Selector for a Graph-of-Agents (GoA) framework.
Your task is to analyze the user query and select exactly k=3 models from the provided registry that are best suited to handle this specific request.

Expert Registry:
{{registry}}

User Query:
{{query}}

Respond ONLY with a JSON object in the following format:
{
  "selectedNodes": ["model-id-1", "model-id-2", "model-id-3"],
  "poolingMethod": "max" | "mean",
  "rationale": "Brief explanation of why these models were selected and why this pooling method was chosen."
}

Use "max" for factual, binary, or logic-heavy queries where the single best answer should be prioritized.
Use "mean" for analytical, creative, or open-ended queries where a synthesized multi-perspective response is better.`;

/**
 * GoA Peer-to-Peer Relevance Scoring Prompt
 * traces: FR-24
 */
export const relevanceScoringPrompt = `You are evaluating the relevance of another agent's output in a Graph-of-Agents topology.
Rate how helpful the target agent's response is for completing the original user query, from 0.0 to 1.0.

Original Query:
{{query}}

Target Agent Output:
{{target_output}}

Respond ONLY with a number between 0.0 and 1.0 representing the relevance score.`;

/**
 * GoA Forward Pass (Refinement) Prompt
 * traces: FR-26
 */
export const forwardPassPrompt = `You are a Target Node (Refiner) in a Graph-of-Agents framework.
Your goal is to refine your initial response by incorporating context from Source Nodes (Experts).

Original Query:
{{query}}

Your Initial Response:
{{initial_response}}

Context from Source Nodes:
{{source_context}}

Provide a refined, high-quality response that addresses the user query more effectively using the provided context.`;

/**
 * GoA Reverse Pass (Polishing) Prompt
 * traces: FR-26
 */
export const reversePassPrompt = `You are a Source Node (Polisher) in a Graph-of-Agents framework.
Your goal is to polish your initial response using refined insights from Target Nodes.

Original Query:
{{query}}

Your Initial Response:
{{initial_response}}

Refined Insights from Target Nodes:
{{target_refinements}}

Provide a final, polished response that ensures edge-case coverage and maximum accuracy.`;

/**
 * GoA Pooling Prompt (Synthesis)
 * traces: FR-27
 */
export const poolingPrompt = `
You are the Pooling Aggregator for a Symbolic-MoE chatbot.
Analyze the following user query and the expert responses provided.
A skill extraction pass identified the following required skills: {{skills}}

Synthesize the expert responses into a final, high-quality answer. 
Weight the responses from experts with higher proficiency in the identified skills more heavily.

Query: {{query}}
Expert Responses:
{{agent_responses}}

Final Synthesis:`;

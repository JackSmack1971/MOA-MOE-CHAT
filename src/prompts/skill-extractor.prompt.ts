/**
 * Skill Extractor Prompt (V3 Symbolic-MoE)
 * traces: FR-23
 */
export const skillExtractorPrompt = `
Analyze the following user query and identify the essential technical skills required to solve it.
Select from the following taxonomy:
{{taxonomy}}

Return only a comma-separated list of keywords found in the query or implied by the query's domain.

Query: {{query}}

Keywords:`;

# Release Notes: V3.0.0 (Symbolic-MoE Evolution)

## Overview
V3.0.0 introduces **Adaptive Skill-based Routing**, evolving the GoA framework into a **Symbolic Mixture-of-Experts (Symbolic-MoE)**. This release replaces heuristic node selection with a symbolic intermediate layer that maps query requirements to expert proficiencies.

## Key Innovation: Heuristic to Symbolic Routing
Previously, эксперт selection was based on high-level domain relevance (V2). V3 implements a **Skill Taxonomy** and **Symbolic Vectors** to achieve precision routing:
- **Skill Extraction**: A dedicated pass identifies granular requirements (e.g., `algebra_reasoning`, `js_runtime_expert`) from the user query.
- **Proficiency Weighting**: The graph topology is now dynamically constructed using a dot-product alignment between the Query Skill Vector and Agent Proficiency scores.

## Key Changes
- **SymbolicSerializer**: New service for normalizing keywords into skill-aligned numeric vectors.
- **EdgeConstructor**: Implemented proficiency-weighted edge construction for the GoA topology.
- **Skill Registry**: Established a comprehensive taxonomy for expert specialization mapping.
- **Skill-Aware Pooling**: The final synthesis stage now weights expert contributions based on their proficiency in the identified skills.

## Benefits
- **Higher Reasoning Accuracy**: Improved performance on heterogeneous tasks by ensuring the "best fit" experts drive the forward/reverse passes.
- **Zero-Cost Scaling**: Maintained strict adherence to the OpenRouter `:free` model constraint for all symbolic passes.

## Technical Details
- **Hybrid Adjacency**: Adjacency matrices now combine Semantic Relevance (70%) and Skill Alignment (30%) for optimal pathing.
- **Extensibility**: Migration hooks for V4 (Symbolic-MoE Scaling) are integrated into the core engine.

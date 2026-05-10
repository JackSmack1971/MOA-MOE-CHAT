# Seed: Agent Self-Evolution (GRPO Feedback Loop)

## Objective
Enable the Graph-of-Agents to self-optimize (using `:free` models only) by using GRPO (Group Relative Policy Optimization) scores stored in `agent_memory` to dynamically adjust model temperatures and sparsity thresholds per domain.

## Trigger Conditions
- Total memory entries > 500.
- Average reward_score variance > 0.2 across turns.

## Initial Thoughts
Use the `DbService.searchMemory` to extract successful traces and inject them as few-shot examples in the Meta-LLM selector prompt.

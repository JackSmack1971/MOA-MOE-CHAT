# MoA/MoE Hybrid Chatbot Framework (V2 GoA)

## Project Overview
A solo-deployable cognitive pipeline evolved from a sequential MoA/MoE architecture into a parallelized, sparse Graph-of-Agents (GoA). Utilizes a Meta-LLM for task-specific node sampling, relevance-weighted bidirectional message passing, and dynamic pooling.

## Core Vision
Deliver enterprise-grade multi-agent reasoning on consumer hardware via task-optimized graph orchestration, targeting a 60% reduction in token consumption while maintaining ≥ 65% accuracy.

## Tech Stack
- **Runtime**: Node.js 18+ (TypeScript strict)
- **Database**: PostgreSQL 16+ with pgvector
- **AI Gateway**: OpenRouter
- **Meta-LLM (Selector)**: `inclusionai/ring-2.6-1t:free`
- **Expert Nodes**: `qwen/qwen3`, `openrouter/owl-alpha`, `nvidia/nemotron-3`
- **Embeddings**: Nomic-embed-text-v1.5 (WASM singleton)
- **Validation**: Zod
- **Oracles**: PoT (vm sandbox), mathjs
- **Graph Logic**: Adjacency matrix (τ = 0.05), Source/Target partitioning

## Target Performance
- **Resident Memory**: < 6.3 GB
- **Accuracy**: ≥ 65% (AlpacaEval 2.0 equivalent)
- **Efficiency**: ≥ 50% token reduction vs V1
- **Diversity**: Post-DALC Cosine Similarity ≤ 0.85
- **Sustainability**: 250 complex turns per day

## Key Constraints
- OpenRouter $10 deposit for production-viable rate limits (~1,000 RPD).
- 16 GB laptop host memory limit.
- No proprietary model dependencies (open-weight only).
- No `:preview` models permitted (stability requirement).
- Sampling budget $k=3$ for graph nodes.


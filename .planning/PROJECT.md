# MoA/MoE Hybrid Chatbot Framework

## Project Overview
A solo-deployable cognitive pipeline using a Self-MoA (Mixture-of-Agents) architecture with diversity enforcement (DALC) and adaptive halting (RMoA). Architected for zero-rewrite migration to Graph-of-Agents (V2).

## Core Vision
Deliver enterprise-grade multi-agent reasoning on consumer hardware via zero-cost free-tier API inference and deterministic oracle verification.

## Tech Stack
- **Runtime**: Node.js 18+ (TypeScript strict)
- **Database**: PostgreSQL 16+ with pgvector
- **AI Gateway**: OpenRouter
- **Embeddings**: Nomic-embed-text-v1.5 (WASM singleton)
- **Validation**: Zod
- **Oracles**: PoT (vm sandbox), mathjs

## Target Performance
- **Resident Memory**: < 6.3 GB
- **Accuracy**: ≥ 65% (AlpacaEval 2.0 equivalent)
- **Diversity**: Post-DALC Cosine Similarity ≤ 0.85
- **Sustainability**: 250 complex turns per day

## Key Constraints
- OpenRouter $10 deposit for production-viable rate limits (~1,000 RPD).
- 16 GB laptop host memory limit.
- No proprietary model dependencies (open-weight only).
- No `:preview` models permitted (stability requirement).

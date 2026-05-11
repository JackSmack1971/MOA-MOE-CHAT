- [x] **Task 1: Agent Registry & Schema**
    - [x] Create `src/core/types.ts` with GoA types
    - [x] Create `src/prompts/agent-registry.json` with model cards

- [x] **Task 2: GraphEngine Service**
    - [x] Implement `src/services/GraphEngine.ts` (Adjacency & Partitioning)
    - [x] Create `tests/unit/GraphEngine.test.ts`
    - [x] Run unit tests: `npm test tests/unit/GraphEngine.test.ts`

- [x] **Task 3: Orchestrator Refactor (Node Sampling)**
    - [x] Update `src/core/orchestrator.ts` with Meta-LLM Selector
    - [x] Implement Peer-to-Peer Relevance Scoring
- [x] **Task 4: Bidirectional Message Passing & Pooling**
    - [x] Implement Forward Pass (Source -> Target)
    - [x] Implement Reverse Pass (Target -> Source)
    - [x] Implement GoA-Max/Mean Pooling logic

- [x] **Task 5: V2 Validation & Hardening**
    - [x] Update regression suite for efficiency metrics
    - [x] Run Golden Fixture Regression: `npm test -- --grep "golden"`
    - [x] Verify token reduction ≥ 50%

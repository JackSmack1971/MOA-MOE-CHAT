import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Orchestrator } from '../../src/core/orchestrator';
import * as callModelModule from '../../src/core/callModel';
import { SemanticCache } from '../../src/services/SemanticCache';

vi.mock('../../src/core/callModel');
vi.mock('../../src/services/SemanticCache');

describe('Orchestrator Streaming', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
    vi.clearAllMocks();
    (SemanticCache.get as any).mockResolvedValue(null);
  });

  it('should emit expert_chunk events during execution', async () => {
    const mockQuery = 'test query';
    
    // Mock callModel for skill extraction and selection
    (callModelModule.callModel as any).mockResolvedValue({
      content: '{"selectedNodes": ["expert1"], "poolingMethod": "mean", "rationale": "test"}',
      usage: { prompt: 10, completion: 10, total: 20 }
    });

    // Mock callModelStream for initial response
    (callModelModule.callModelStream as any).mockImplementation(async function* () {
      yield { type: 'chunk', data: 'Hello' };
      yield { type: 'chunk', data: ' World' };
      yield { type: 'usage', data: { prompt: 5, completion: 5, total: 10 } };
    });

    const events: any[] = [];
    const generator = orchestrator.executeStreaming(mockQuery);

    for await (const event of generator) {
      events.push(event);
    }

    const expertChunks = events.filter(e => e.type === 'expert_chunk');
    expect(expertChunks.length).toBeGreaterThan(0);
    expect(expertChunks[0].data.nodeId).toBe('expert1');
    expect(expertChunks[0].data.content).toBe('Hello');
  });
});

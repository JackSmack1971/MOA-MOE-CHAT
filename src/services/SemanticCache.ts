import { DbService } from './DbService';
import { EmbeddingService } from './EmbeddingService';
import { logger } from '../core/logger';

/**
 * Semantic Cache Service
 * traces: FR-06, SM-4, ADR-008, PRD §11.1
 * Provides O(1) retrieval for semantically similar intents.
 */
export class SemanticCache {
  private static readonly THRESHOLD = 0.80; // ADR-008 calibrated for all-MiniLM-L6-v2 to meet SM-4

  /**
   * Attempt to retrieve a cached response for a given query
   * @param query The user query
   */
  public static async get(query: string): Promise<string | null> {
    const embeddingService = EmbeddingService.getInstance();
    const dbService = DbService.getInstance();

    const queryEmbedding = await embeddingService.embed(query);
    const hits = await dbService.searchMemory(queryEmbedding, 0.0, 1); // Search all

    if (hits.length > 0 && hits[0]!.metadata?.type === 'cache') {
      const similarity = hits[0]!.similarity;
      if (similarity >= this.THRESHOLD) {
        logger.info({ similarity: similarity.toFixed(4) }, '[SemanticCache] HIT');
        return hits[0]!.metadata.response;
      } else {
        logger.info({ best_sim: similarity.toFixed(4) }, '[SemanticCache] MISS (below threshold)');
      }
    } else {
      logger.info('[SemanticCache] MISS (no hits)');
    }
    return null;
  }

  /**
   * Store a successful pipeline response in the cache
   * @param query The user query
   * @param response The final synthesized response
   */
  public static async set(query: string, response: string): Promise<void> {
    const embeddingService = EmbeddingService.getInstance();
    const dbService = DbService.getInstance();

    const queryEmbedding = await embeddingService.embed(query);
    await dbService.saveMemory(query, queryEmbedding, {
      type: 'cache',
      response: response,
      timestamp: new Date().toISOString()
    });
    logger.info('[SemanticCache] Response cached');
  }
}

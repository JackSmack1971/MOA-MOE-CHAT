import { pipeline, FeatureExtractionPipeline } from '@huggingface/transformers';
import { logger } from '../core/logger';
import * as crypto from 'crypto';

/**
 * EmbeddingService Singleton
 * traces: FRD-FR-04, ADR-003, PRD §7.1
 * Provides nomic-embed-text-v1.5 embeddings for DALC, RMoA, and Semantic Cache.
 */
export class EmbeddingService {
  private static instance: EmbeddingService;
  private pipeline: FeatureExtractionPipeline | null = null;
  private readonly modelName = 'nomic-ai/nomic-embed-text-v1.5';
  
  // Per-session vector cache to eliminate redundant calculations during refinement loops
  private vectorCache = new Map<string, number[]>();

  private constructor() {}

  /**
   * Get the singleton instance of EmbeddingService
   */
  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Initialize the embedding pipeline (pre-warm)
   * traces: D0-4, ADR-003
   */
  public async init(): Promise<void> {
    if (!this.pipeline) {
      logger.info({ model: this.modelName }, '[EmbeddingService] Initializing');
      this.pipeline = await pipeline('feature-extraction', this.modelName, {
        quantized: true, // q8 by default in transformers.js
      });
      logger.info({ model: this.modelName }, '[EmbeddingService] Initialized');
    }
  }

  /**
   * Generate an embedding for a given text
   * @param text Input string
   * @returns Vector representation (768-dim)
   */
  public async embed(text: string): Promise<number[]> {
    // Generate simple hash for the cache key
    const hash = crypto.createHash('sha256').update(text).digest('hex');
    if (this.vectorCache.has(hash)) {
      return this.vectorCache.get(hash)!;
    }

    if (!this.pipeline) {
      await this.init();
    }

    const output = await this.pipeline!(text, {
      pooling: 'mean',
      normalize: true,
    });

    const result = Array.from(output.data as Float32Array);
    
    // Cache the result
    this.vectorCache.set(hash, result);
    if (this.vectorCache.size > 1000) { // Basic LRU-ish eviction
      const firstKey = this.vectorCache.keys().next().value;
      if (firstKey) this.vectorCache.delete(firstKey);
    }

    return result;
  }

  /**
   * Clear the vector cache (useful for session handoffs)
   */
  public clearCache(): void {
    this.vectorCache.clear();
  }

  /**
   * Compute cosine similarity between two vectors
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Compute L2 norm of a vector
   */
  public static l2Norm(v: number[]): number {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
      sum += v[i]! * v[i]!;
    }
    return Math.sqrt(sum);
  }

  /**
   * Subtract two vectors
   */
  public static subtract(a: number[], b: number[]): number[] {
    const res: number[] = [];
    for (let i = 0; i < a.length; i++) {
      res.push(a[i]! - b[i]!);
    }
    return res;
  }

  /**
   * Compute relevance score (cosine similarity) between text and a domain description
   * traces: FRD-FR-24
   */
  public async computeRelevance(text: string, domainDescription: string): Promise<number> {
    const textEmbedding = await this.embed(text);
    const domainEmbedding = await this.embed(domainDescription);
    return EmbeddingService.cosineSimilarity(textEmbedding, domainEmbedding);
  }
}

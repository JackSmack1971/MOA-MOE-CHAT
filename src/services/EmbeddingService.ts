import { pipeline, FeatureExtractionPipeline } from '@huggingface/transformers';

/**
 * EmbeddingService Singleton
 * traces: FRD-FR-04, ADR-003, PRD §7.1
 * Provides nomic-embed-text-v1.5 embeddings for DALC, RMoA, and Semantic Cache.
 */
export class EmbeddingService {
  private static instance: EmbeddingService;
  private pipeline: FeatureExtractionPipeline | null = null;
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2';

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
      console.log(`[EmbeddingService] Initializing ${this.modelName}...`);
      this.pipeline = await pipeline('feature-extraction', this.modelName, {
        quantized: true, // q8 by default in transformers.js
      });
      console.log(`[EmbeddingService] ${this.modelName} initialized.`);
    }
  }

  /**
   * Generate an embedding for a given text
   * @param text Input string
   * @returns Vector representation (768-dim)
   */
  public async embed(text: string): Promise<number[]> {
    if (!this.pipeline) {
      await this.init();
    }

    const output = await this.pipeline!(text, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data as Float32Array);
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
}

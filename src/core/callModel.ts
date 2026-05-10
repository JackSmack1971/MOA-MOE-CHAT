import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Model Fallback Chain
 * traces: PRD §6.1, Resilience Directive
 */
const MODEL_FALLBACK_CHAIN = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-2-27b-it:free',
  'meta-llama/llama-3.1-8b-instruct:free'
];

/**
 * Standardized model caller with fallback and retry logic
 * traces: FR-12, ADR-012, PRD §6.1
 */
export async function callModel(
  modelId: string,
  prompt: string,
  temperature: number = 0.7,
  maxRetries: number = 2
): Promise<string> {
  const modelsToTry = [modelId, ...MODEL_FALLBACK_CHAIN.filter(m => m !== modelId)];
  
  for (const model of modelsToTry) {
    let attempts = 0;
    while (attempts <= maxRetries) {
      try {
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: temperature,
          },
          {
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://github.com/moa-moe-hybrid-chatbot',
              'X-Title': 'MoA-MoE-Chatbot',
            },
            timeout: 60000, // 60s timeout
          }
        );

        const content = response.data.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response from model');
        
        return content;
      } catch (err: any) {
        attempts++;
        const status = err.response?.status;
        console.warn(`[callModel] Error with ${model} (Attempt ${attempts}/${maxRetries+1}): ${err.message}`);
        
        if (attempts > maxRetries) {
          console.warn(`[callModel] Model ${model} failed after ${attempts} attempts. Trying next in chain...`);
          break; // Try next model
        }

        // Exponential backoff
        const delay = Math.pow(2, attempts) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error('All models in fallback chain failed.');
}

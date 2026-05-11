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

import { logger } from './logger';

/**
 * Standardized model caller with fallback and retry logic
 * traces: FR-12, ADR-012, PRD §6.1
 */
export async function callModel(
  modelId: string,
  prompt: string,
  temperature: number = 0.7,
  maxRetries: number = 2
): Promise<{ content: string; usage: { prompt: number; completion: number; total: number } }> {
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
        const usage = response.data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        
        if (!content) throw new Error('Empty response from model');
        
        return { 
          content, 
          usage: { 
            prompt: usage.prompt_tokens, 
            completion: usage.completion_tokens, 
            total: usage.total_tokens 
          } 
        };
      } catch (err: any) {
        attempts++;
        const status = err.response?.status;
        logger.warn({ model, attempt: attempts, error: err.message }, '[callModel] API Error');
        
        if (attempts > maxRetries) {
          logger.warn({ model, attempts }, '[callModel] Model failed after retries. Trying next in chain.');
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
/**
 * Streaming model caller for real-time UI updates
 * traces: FR-12, V3 UI-SPEC
 */
export async function* callModelStream(
  modelId: string,
  prompt: string,
  temperature: number = 0.7
): AsyncGenerator<{ type: 'chunk' | 'usage'; data: any }> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/moa-moe-hybrid-chatbot',
        'X-Title': 'MoA-MoE-Chatbot',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
        stream: true,
      }),
    });

    if (!response.body) throw new Error('ReadableStream not supported');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleaned = line.replace(/^data: /, '').trim();
        if (cleaned === '' || cleaned === '[DONE]') continue;

        try {
          const parsed = JSON.parse(cleaned);
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) {
            yield { type: 'chunk', data: chunk };
          }
          if (parsed.usage) {
            yield { type: 'usage', data: parsed.usage };
          }
        } catch (err) {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  } catch (err: any) {
    logger.error({ error: err.message, modelId }, '[callModelStream] Streaming Error');
    throw err;
  }
}

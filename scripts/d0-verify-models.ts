import dotenv from 'dotenv';

dotenv.config();

/**
 * D0-2: Verify model endpoints
 * traces: D0-2, PRD §5.2, ADR-010, ADR-012
 */
async function verifyModels() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('[D0-2] Error: OPENROUTER_API_KEY missing from .env');
    process.exit(1);
  }

  console.log('--- D0-2: OpenRouter Model Verification ---');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/moa-moe-hybrid-chatbot',
        'X-Title': 'MoA/MoE Hybrid Chatbot Framework'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const { data } = (await response.json()) as { data: any[] };
    const modelIds = data.map(m => m.id);

    const requiredModels = [
      'nvidia/nemotron-3-super-120b-a12b:free',
      'google/gemma-4-31b-it:free',
      'openai/gpt-oss-120b:free'
    ];

    let allFound = true;
    for (const modelId of requiredModels) {
      if (modelIds.includes(modelId)) {
        console.log(`[PASS] Found required model: ${modelId}`);
      } else {
        console.error(`[FAIL] Required model NOT FOUND: ${modelId}`);
        allFound = false;
      }
    }

    // Exclusion checks
    const hasDeepSeek = modelIds.some(id => id.toLowerCase().includes('deepseek-r1-0528:free'));
    const hasPreview = data.some(m => m.id.endsWith(':preview') && requiredModels.includes(m.id.replace(':preview', '')));

    if (hasDeepSeek) {
      console.error('[FAIL] DeepSeek-R1-0528:free detected (Must be absent)');
      allFound = false;
    } else {
      console.log('[PASS] DeepSeek-R1-0528:free absent.');
    }

    if (hasPreview) {
      console.error('[FAIL] :preview models detected for core roles (Must be absent)');
      allFound = false;
    } else {
      console.log('[PASS] No core :preview models detected.');
    }

    // Check RPD ceiling (D0-1)
    // Note: OpenRouter doesn't always expose RPD via /models, but we check if we can reach it.
    console.log('[INFO] D0-1: OpenRouter connectivity confirmed.');

    process.exit(allFound ? 0 : 1);
  } catch (err) {
    console.error('[D0-2] Verification failed:', err);
    process.exit(1);
  }
}

verifyModels();

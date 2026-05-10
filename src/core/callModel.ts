import dotenv from 'dotenv';

dotenv.config();

/**
 * Basic model call utility
 * traces: FR-01, PRD §7.2
 */
export async function callModel(modelId: string, prompt: string, temperature: number = 0.7): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/moa-moe-hybrid-chatbot',
      'X-Title': 'MoA/MoE Hybrid Chatbot Framework'
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      temperature: temperature
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as any;
  return data.choices[0].message.content;
}

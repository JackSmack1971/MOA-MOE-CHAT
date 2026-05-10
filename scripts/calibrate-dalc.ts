import { callModel } from '../src/core/callModel';
import { EmbeddingService } from '../src/services/EmbeddingService';
import { routerPrompt, proposerPrompt } from '../src/prompts';

/**
 * D0-6: Calibrate DALC collapse threshold
 * traces: D0-6, PRD §10.1
 */
async function calibrate() {
  console.log('--- D0-6: DALC Calibration ---');
  
  const query = 'Explain the importance of diversity in multi-agent systems.';
  const modelId = 'nvidia/nemotron-3-super-120b-a12b:free';
  const embeddingService = EmbeddingService.getInstance();
  await embeddingService.init();

  console.log('[Step 1] Running Router...');
  const plan = await callModel(modelId, routerPrompt.replace('{{query}}', query), 0.7);
  console.log('Router Plan generated.');

  const personas = [
    'You are a rigorous scientist.',
    'You are a creative storyteller.',
    'You are a pragmatic engineer.'
  ];

  const outputs: string[] = [];
  console.log(`[Step 2] Running 3 Proposer variants...`);

  for (const persona of personas) {
    const prompt = proposerPrompt
      .replace('{{persona_instruction}}', persona)
      .replace('{{plan}}', plan)
      .replace('{{query}}', query);
    
    const output = await callModel(modelId, prompt, 0.7);
    outputs.push(output);
    console.log(`Persona "${persona.split(' ').slice(-1)}" finished.`);
  }

  console.log(`[Step 3] Computing pairwise similarities...`);
  const embeddings = await Promise.all(outputs.map(o => embeddingService.embed(o)));
  
  let totalSim = 0;
  let count = 0;
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const sim = EmbeddingService.cosineSimilarity(embeddings[i], embeddings[j]);
      console.log(`Sim(P${i}, P${j}): ${sim.toFixed(4)}`);
      totalSim += sim;
      count++;
    }
  }

  const meanSim = totalSim / count;
  const threshold = Math.min(meanSim - 0.05, 0.85);
  
  console.log(`\nMean Pairwise Similarity: ${meanSim.toFixed(4)}`);
  console.log(`Recommended DALC Threshold: ${threshold.toFixed(2)}`);
  console.log(`Current Config Threshold: 0.85`);

  process.exit(0);
}

calibrate().catch(err => {
  console.error(err);
  process.exit(1);
});

import express from 'express';
import cors from 'cors';
import path from 'path';
import { Orchestrator } from './core/orchestrator';
import { logger } from './core/logger';

const app = express();
const port = process.env.PORT || 3000;
const orchestrator = new Orchestrator();

app.use(cors());
app.use(express.json());

// Serve static Svelte assets
app.use(express.static(path.join(__dirname, '../src/ui/dist')));

/**
 * SSE Endpoint for Chat
 */
app.get('/api/chat', async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).send('Query required');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type: string, data: any) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  try {
    const generator = orchestrator.executeStreaming(query);
    for await (const event of generator) {
      sendEvent(event.type, event.data);
    }
    res.end();
  } catch (err: any) {
    logger.error({ error: err.message }, '[Server] Chat Error');
    sendEvent('error', err.message);
    res.end();
  }
});

app.listen(port, () => {
  logger.info(`[Server] V3 Symbolic-MoE UI active at http://localhost:${port}`);
});

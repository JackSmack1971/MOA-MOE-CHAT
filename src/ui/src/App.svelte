<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import Graph from './Graph.svelte';

  let query = $state('');
  let messages = $state([]);
  let status = $state('IDLE');
  let skills = $state('');
  let usage = $state({ prompt: 0, completion: 0, total: 0 });
  let graphData = $state({ nodes: [], adjacency: [] });

  async function sendChat() {
    if (!query.trim()) return;
    status = 'ORCHESTRATING';
    messages = [...messages, { role: 'user', content: query, timestamp: new Date().toLocaleTimeString() }];
    const currentQuery = query;
    query = '';

    const response = await fetch(`/api/chat?q=${encodeURIComponent(currentQuery)}`);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    let assistantMsg = { role: 'assistant', content: '', timestamp: new Date().toLocaleTimeString() };
    messages = [...messages, assistantMsg];

    while (true) {
      const { done, value } = await reader?.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const { type, data } = JSON.parse(line.slice(6));

        if (type === 'chunk') {
          assistantMsg.content += data;
          messages = [...messages.slice(0, -1), assistantMsg];
        } else if (type === 'status') {
          status = data.toUpperCase();
        } else if (type === 'skills') {
          skills = data;
        } else if (type === 'usage') {
          usage = data;
        } else if (type === 'graph') {
          graphData = data;
        }
      }
    }
    status = 'IDLE';
  }
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Outfit:wght@300;400;700&display=swap" rel="stylesheet">
</svelte:head>

<main class="modular-deck">
  <div class="grain"></div>
  
  <header class="top-nav">
    <div class="brand">
      <div class="logo-box">MOA-MOE</div>
      <div class="version">V3.0.0_STABLE</div>
    </div>
    <div class="global-status">
      <span class="pulse {status !== 'IDLE' ? 'active' : ''}"></span>
      <span class="label">CORE_STATE:</span>
      <span class="value">{status}</span>
    </div>
  </header>

  <div class="grid-container">
    <!-- QUADRANT 1: THE MIND (GRAPH) -->
    <section class="quadrant q-graph">
      <header>
        <span class="tag">01</span>
        <h2>AGENT_TOPOLOGY</h2>
      </header>
      <div class="content graph-wrapper">
        <Graph nodes={graphData.nodes} adjacency={graphData.adjacency} />
      </div>
    </section>

    <!-- QUADRANT 2: THE PULSE (TELEMETRY) -->
    <section class="quadrant q-telemetry">
      <header>
        <span class="tag">02</span>
        <h2>SYSTEM_TELEMETRY</h2>
      </header>
      <div class="content telemetry-deck">
        <div class="stat-row">
          <label>TOTAL_COMPUTE</label>
          <div class="data-box">{usage.total} TOKENS</div>
        </div>
        <div class="stat-row">
          <label>ACTIVE_SKILLS</label>
          <div class="data-box skills">{skills || 'INITIALIZING...'}</div>
        </div>
        <div class="usage-bars">
          <div class="bar-group">
            <label>PROMPT</label>
            <div class="bar-bg"><div class="bar prompt" style="width: {Math.min((usage.prompt / 5000) * 100, 100)}%"></div></div>
          </div>
          <div class="bar-group">
            <label>COMPLETION</label>
            <div class="bar-bg"><div class="bar comp" style="width: {Math.min((usage.completion / 5000) * 100, 100)}%"></div></div>
          </div>
        </div>
      </div>
    </section>

    <!-- QUADRANT 3 & 4: THE DATA STREAM (CHAT) -->
    <section class="quadrant q-stream">
      <header>
        <span class="tag">03</span>
        <h2>DATA_STREAM</h2>
        <div class="controls">
          <button class="btn-icon">CLEAR_LOG</button>
        </div>
      </header>
      <div class="content stream-container">
        {#each messages as msg}
          <div class="log-entry {msg.role}">
            <div class="meta">
              <span class="timestamp">[{msg.timestamp}]</span>
              <span class="actor">{msg.role === 'user' ? 'OPERATOR' : 'LOGIC_CORE'}</span>
            </div>
            <div class="body">{msg.content}</div>
          </div>
        {/each}
        {#if messages.length === 0}
          <div class="empty-log">AWAITING_INPUT_SEQUENCE...</div>
        {/if}
      </div>

      <div class="command-input">
        <div class="input-prefix">&gt;</div>
        <input 
          bind:value={query} 
          onkeydown={(e) => e.key === 'Enter' && sendChat()} 
          placeholder="ENTER_QUERY_COMMAND..."
        />
        <button class="submit-btn" onclick={sendChat}>EXEC_CMD</button>
      </div>
    </section>
  </div>
</main>

<style>
  :root {
    --cyan: #00F2FF;
    --magenta: #FF00E5;
    --void: #0A0A0B;
    --surface: rgba(15, 15, 18, 0.8);
    --border: rgba(255, 255, 255, 0.08);
    --text-main: #E2E8F0;
    --text-dim: #64748B;
  }

  :global(body) {
    background: var(--void);
    color: var(--text-main);
    font-family: 'Outfit', sans-serif;
    margin: 0;
    overflow: hidden;
  }

  .modular-deck {
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* GRAIN TEXTURE overlay */
  .grain {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background-image: url("https://grainy-gradients.vercel.app/noise.svg");
    opacity: 0.03;
    pointer-events: none;
    z-index: 1000;
  }

  .top-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
    border-bottom: 1px solid var(--border);
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(8px);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .logo-box {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 0.2em;
    padding: 4px 12px;
    background: var(--cyan);
    color: black;
  }

  .version {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--text-dim);
  }

  .global-status {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 700;
  }

  .pulse {
    width: 6px; height: 6px;
    background: #333;
    border-radius: 50%;
  }

  .pulse.active {
    background: var(--cyan);
    box-shadow: 0 0 8px var(--cyan);
    animation: blink 0.5s infinite;
  }

  @keyframes blink {
    0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; }
  }

  .grid-container {
    flex: 1;
    display: grid;
    grid-template-columns: 400px 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 0;
    overflow: hidden;
  }

  .quadrant {
    display: flex;
    flex-direction: column;
    border: 0.5px solid var(--border);
    background: var(--surface);
    overflow: hidden;
  }

  .quadrant header {
    padding: 8px 16px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--cyan);
    font-weight: 800;
    border: 1px solid var(--cyan);
    padding: 0 4px;
  }

  h2 {
    margin: 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }

  .q-graph { grid-row: span 1; }
  .q-telemetry { grid-row: span 1; }
  .q-stream { grid-column: 2; grid-row: 1 / span 2; }

  .content { flex: 1; overflow: hidden; }

  /* TELEMETRY STYLING */
  .telemetry-deck {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .stat-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stat-row label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 800;
    color: var(--text-dim);
  }

  .data-box {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    font-weight: 800;
    color: var(--magenta);
  }

  .data-box.skills { font-size: 12px; color: var(--cyan); }

  .usage-bars {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .bar-group label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--text-dim);
    margin-bottom: 4px;
    display: block;
  }

  .bar-bg { height: 4px; background: #111; border-radius: 2px; overflow: hidden; }
  .bar { height: 100%; transition: width 0.3s; }
  .bar.prompt { background: var(--cyan); }
  .bar.comp { background: var(--magenta); }

  /* STREAM STYLING */
  .q-stream { display: flex; flex-direction: column; }
  
  .stream-container {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: radial-gradient(circle at center, rgba(0,242,255,0.02) 0%, transparent 70%);
  }

  .log-entry {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    line-height: 1.6;
  }

  .log-entry.user { color: var(--cyan); }
  .log-entry.assistant { color: var(--text-main); }

  .meta {
    display: flex;
    gap: 12px;
    font-size: 10px;
    font-weight: 800;
    margin-bottom: 4px;
    opacity: 0.6;
  }

  .actor {
    padding: 0 6px;
    background: currentColor;
    color: black;
  }

  .body {
    padding-left: 20px;
    white-space: pre-wrap;
  }

  .empty-log {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #222;
    letter-spacing: 0.3em;
  }

  /* COMMAND INPUT */
  .command-input {
    padding: 16px 24px;
    background: #000;
    border-top: 2px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .input-prefix {
    font-family: 'JetBrains Mono', monospace;
    color: var(--cyan);
    font-weight: 800;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    color: white;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    outline: none;
  }

  .submit-btn {
    background: var(--cyan);
    color: black;
    border: none;
    padding: 6px 16px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 800;
    font-size: 11px;
    cursor: pointer;
  }

  .submit-btn:hover { filter: brightness(1.1); }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import Graph from './Graph.svelte';

  let query = $state('');
  let messages = $state([]);
  let status = $state('READY');
  let skills = $state('');
  let usage = $state({ prompt: 0, completion: 0, total: 0 });
  let graphData = $state({ nodes: [], adjacency: [] });

  async function sendChat() {
    if (!query.trim()) return;
    status = 'ORCHESTRATING...';
    messages = [...messages, { role: 'user', content: query }];
    const currentQuery = query;
    query = '';

    const response = await fetch(`/api/chat?q=${encodeURIComponent(currentQuery)}`);
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    let assistantMsg = { role: 'assistant', content: '' };
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

<main class="console">
  <header class="glass-header">
    <div class="brand">
      <h1>MOA-MOE<span>V3.0</span></h1>
      <div class="pulse-indicator {status !== 'IDLE' ? 'active' : ''}"></div>
    </div>
    <div class="status-bar">
      <span class="label">STATUS:</span> <span class="value">{status}</span>
      <span class="divider">|</span>
      <span class="label">SKILLS:</span> <span class="value">{skills || 'NONE'}</span>
    </div>
  </header>

  <div class="main-content">
    <div class="chat-area">
      <div class="chat-container">
        {#each messages as msg}
          <div class="message {msg.role}">
            <header>
              <span class="sender">{msg.role === 'user' ? 'OPERATOR' : 'LOGIC_CORE'}</span>
            </header>
            <p>{msg.content}</p>
          </div>
        {/each}
        {#if messages.length === 0}
          <div class="empty-state">
            <p>AWAITING INPUT COMMAND...</p>
          </div>
        {/if}
      </div>

      <div class="input-area glass-input">
        <input 
          bind:value={query} 
          onkeydown={(e) => e.key === 'Enter' && sendChat()} 
          placeholder="ENTER QUERY COMMAND..." 
        />
        <button onclick={sendChat}>SEND</button>
      </div>
    </div>

    <aside class="sidebar">
      <section class="graph-section">
        <h3>AGENT_TOPOLOGY</h3>
        <div class="graph-container">
          <Graph nodes={graphData.nodes} adjacency={graphData.adjacency} />
        </div>
      </section>

      <section class="telemetry-section">
        <h3>TELEMETRY</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="label">TOTAL_TOKENS</span>
            <span class="value">{usage.total.toLocaleString()}</span>
          </div>
          <div class="stat-card">
            <span class="label">PROMPT</span>
            <span class="value">{usage.prompt.toLocaleString()}</span>
          </div>
          <div class="stat-card">
            <span class="label">COMPLETION</span>
            <span class="value">{usage.completion.toLocaleString()}</span>
          </div>
        </div>
      </section>
    </aside>
  </div>
</main>

<style>
  :root {
    --cyan: #00F2FF;
    --magenta: #FF00E5;
    --void: #0A0A0B;
    --glass: rgba(30, 41, 59, 0.4);
    --border: rgba(255, 255, 255, 0.1);
  }

  :global(body) {
    background: var(--void);
    color: #FFF;
    font-family: 'Inter', sans-serif;
    margin: 0;
    overflow: hidden;
  }

  .console {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: radial-gradient(circle at top right, rgba(0, 242, 255, 0.05), transparent);
  }

  .glass-header {
    background: var(--glass);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 100;
  }

  .brand h1 {
    margin: 0;
    font-size: 18px;
    letter-spacing: 0.1em;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .brand span {
    font-size: 10px;
    background: var(--magenta);
    color: #000;
    padding: 2px 4px;
    border-radius: 2px;
  }

  .pulse-indicator {
    width: 8px;
    height: 8px;
    background: #444;
    border-radius: 50%;
    margin-left: 12px;
  }

  .pulse-indicator.active {
    background: var(--cyan);
    box-shadow: 0 0 10px var(--cyan);
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
  }

  .status-bar {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .status-bar .label { color: #666; }
  .status-bar .value { color: var(--cyan); }
  .status-bar .divider { margin: 0 12px; color: #333; }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
  }

  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .message {
    max-width: 85%;
    padding: 16px;
    border-radius: 8px;
    font-size: 15px;
    line-height: 1.6;
    position: relative;
  }

  .message header {
    margin-bottom: 8px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
  }

  .message.user {
    align-self: flex-end;
    background: rgba(0, 242, 255, 0.05);
    border: 1px solid rgba(0, 242, 255, 0.2);
    border-left: 4px solid var(--cyan);
  }

  .message.user .sender { color: var(--cyan); }

  .message.assistant {
    align-self: flex-start;
    background: rgba(255, 0, 229, 0.05);
    border: 1px solid rgba(255, 0, 229, 0.2);
    border-left: 4px solid var(--magenta);
  }

  .message.assistant .sender { color: var(--magenta); }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #333;
    font-weight: 800;
    letter-spacing: 0.2em;
  }

  .input-area {
    padding: 24px;
    background: rgba(0, 0, 0, 0.3);
    border-top: 1px solid var(--border);
    display: flex;
    gap: 12px;
  }

  input {
    flex: 1;
    background: #111;
    border: 1px solid var(--border);
    color: white;
    padding: 12px 16px;
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }

  input:focus {
    border-color: var(--cyan);
  }

  button {
    background: var(--cyan);
    color: #000;
    border: none;
    padding: 0 24px;
    border-radius: 4px;
    font-weight: 800;
    font-size: 12px;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: filter 0.2s, transform 0.1s;
  }

  button:hover {
    filter: brightness(1.1);
  }

  button:active {
    transform: scale(0.98);
  }

  .sidebar {
    width: 420px;
    padding: 24px;
    background: rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 32px;
    overflow-y: auto;
  }

  h3 {
    margin: 0 0 16px 0;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: #666;
    border-bottom: 1px solid #222;
    padding-bottom: 8px;
  }

  .graph-container {
    background: rgba(0,0,0,0.4);
    border-radius: 12px;
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-card {
    background: var(--glass);
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .stat-card .label {
    font-size: 10px;
    font-weight: 700;
    color: #666;
  }

  .stat-card .value {
    font-size: 18px;
    font-weight: 800;
    color: var(--magenta);
    font-family: 'JetBrains Mono', monospace;
  }
</style>

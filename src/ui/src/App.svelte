<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import Graph from './Graph.svelte';

  let query = $state('');
  let messages = $state([]);
  let status = $state('Ready');
  let skills = $state('');
  let usage = $state({ prompt: 0, completion: 0, total: 0 });
  let graphData = $state({ nodes: [], adjacency: [] });

  async function sendChat() {
    status = 'Processing...';
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
          status = data;
        } else if (type === 'skills') {
          skills = data;
        } else if (type === 'usage') {
          usage = data;
        } else if (type === 'graph') {
          graphData = data;
        }
      }
    }
    status = 'Complete';
  }
</script>

<main class="glass">
  <header>
    <h1>MoA-MoE Chat (V3)</h1>
    <div class="status-bar">{status} | Skills: {skills}</div>
  </header>

  <div class="main-content">
    <div class="chat-area">
      <div class="chat-container">
        {#each messages as msg}
          <div class="message {msg.role}">
            <strong>{msg.role === 'user' ? 'You' : 'Agent'}</strong>
            <p>{msg.content}</p>
          </div>
        {/each}
      </div>

      <div class="input-area">
        <input bind:value={query} on:keydown={(e) => e.key === 'Enter' && sendChat()} placeholder="Ask anything..." />
        <button on:click={sendChat}>Send</button>
      </div>
    </div>

    <aside class="sidebar">
      <div class="graph-box">
        <h3>Agent Graph</h3>
        <Graph nodes={graphData.nodes} adjacency={graphData.adjacency} />
      </div>

      <div class="telemetry">
        <h3>Telemetry</h3>
        <p>Usage: {usage.total} tokens</p>
      </div>
    </aside>
  </div>
</main>

<style>
  :global(body) {
    background: #0A0A0B;
    color: white;
    font-family: 'Inter', sans-serif;
    margin: 0;
  }
  .glass {
    background: rgba(30, 41, 59, 0.4);
    backdrop-filter: blur(12px);
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }
  .sidebar {
    width: 420px;
    padding: 20px;
    background: rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  .message { margin-bottom: 20px; padding: 10px; border-radius: 8px; }
  .user { background: rgba(0, 242, 255, 0.1); border-left: 4px solid #00F2FF; }
  .assistant { background: rgba(255, 0, 229, 0.1); border-left: 4px solid #FF00E5; }
  .input-area { padding: 20px; display: flex; gap: 10px; }
  input { flex: 1; background: #1E293B; border: none; color: white; padding: 10px; border-radius: 4px; }
  button { background: #00F2FF; color: black; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
</style>

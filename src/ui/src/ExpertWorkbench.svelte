<script>
  import { onMount, afterUpdate } from 'svelte';

  export let streams = {}; // Record<nodeId, string>
  export let activeNodes = []; // string[]

  let terminalContainers = {};

  // Auto-scroll to bottom as new content arrives
  afterUpdate(() => {
    activeNodes.forEach(nodeId => {
      const el = terminalContainers[nodeId];
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  });
</script>

<div class="workbench-grid">
  {#each activeNodes as nodeId}
    <div class="terminal-card">
      <header>
        <span class="pulse"></span>
        <span class="label">{nodeId.split('/').pop().slice(0, 18)}</span>
        <span class="status">LIVE</span>
      </header>
      <div 
        class="terminal-body" 
        bind:this={terminalContainers[nodeId]}
      >
        <div class="scanline"></div>
        <pre>{streams[nodeId] || 'AWAITING_SEQUENCE...'}</pre>
      </div>
    </div>
  {/each}
  {#if activeNodes.length === 0}
    <div class="empty-state">
      INITIALIZING_EXPERT_CLUSTER...
    </div>
  {/if}
</div>

<style>
  .workbench-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    height: 100%;
    padding: 0.5rem;
    background: rgba(0, 5, 10, 0.8);
    overflow-y: auto;
  }

  .terminal-card {
    background: rgba(0, 20, 30, 0.6);
    border: 1px solid rgba(0, 240, 255, 0.3);
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 150px;
    position: relative;
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.05);
  }

  header {
    background: rgba(0, 240, 255, 0.1);
    padding: 0.25rem 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-bottom: 1px solid rgba(0, 240, 255, 0.2);
    font-family: 'Outfit', sans-serif;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .pulse {
    width: 6px;
    height: 6px;
    background: #00F0FF;
    border-radius: 50%;
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .label { color: #00F0FF; flex-grow: 1; }
  .status { color: #FF00E5; font-size: 0.5rem; }

  .terminal-body {
    flex-grow: 1;
    overflow-y: auto;
    padding: 0.5rem;
    position: relative;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    line-height: 1.4;
    color: rgba(0, 240, 255, 0.9);
    scrollbar-width: thin;
    scrollbar-color: #FF00E5 transparent;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .scanline {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(
      rgba(18, 16, 16, 0) 50%,
      rgba(0, 0, 0, 0.1) 50%
    );
    background-size: 100% 4px;
    z-index: 1;
    pointer-events: none;
  }

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    color: rgba(255, 0, 229, 0.5);
    font-size: 0.8rem;
    letter-spacing: 2px;
  }
</style>

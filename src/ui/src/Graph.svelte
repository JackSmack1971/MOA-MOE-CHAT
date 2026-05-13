<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  let { nodes = [], adjacency = [], nodeUsage = {}, expertStreams = {} } = $props();

  let svg;
  let simulation;
  let tooltip;

  onMount(() => {
    tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#0a141e")
      .style("border", "1px solid #00F2FF")
      .style("padding", "8px")
      .style("color", "#fff")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0);
  });

  $effect(() => {
    if (!svg || nodes.length === 0) return;
    updateGraph();
  });

  function updateGraph() {
    const width = 372;
    const height = 300;

    const svgElement = d3.select(svg);
    svgElement.selectAll("*").remove();

    const links = [];
    adjacency.forEach((row, i) => {
      row.forEach((val, j) => {
        if (val > 0.05) {
          links.push({ source: nodes[i], target: nodes[j], value: val });
        }
      });
    });

    const graphNodes = nodes.map(id => ({ 
      id, 
      usage: nodeUsage[id] || 0,
      shortName: id.split('/').pop()
    }));

    simulation = d3.forceSimulation(graphNodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svgElement.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#00F2FF")
      .attr("stroke-opacity", d => Math.min(d.value + 0.2, 1))
      .attr("stroke-width", d => d.value * 4);

    const nodeGroup = svgElement.append("g")
      .selectAll("g")
      .data(graphNodes)
      .join("g")
      .call(drag(simulation));

    nodeGroup.append("circle")
      .attr("r", d => 10 + Math.min(d.usage / 500, 10))
      .attr("stroke", d => expertStreams[d.id] ? "#00F0FF" : "#FF00E5")
      .attr("stroke-width", d => expertStreams[d.id] ? 3 : 1)
      .attr("stroke-dasharray", d => expertStreams[d.id] ? "none" : "2,1")
      .attr("fill", "#0a141e")
      .style("filter", d => {
        const usageVal = nodeUsage[d.id] || 0;
        const isLive = !!expertStreams[d.id];
        if (isLive) return "drop-shadow(0 0 8px #00F0FF)";
        if (usageVal > 0) return `drop-shadow(0 0 ${Math.min(usageVal / 500, 10)}px #FF00E5)`;
        return "none";
      })
      .on("mouseover", (event, d) => {
        const usageVal = nodeUsage[d.id] || 0;
        const isLive = !!expertStreams[d.id];
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(`
          <b>MODEL:</b> ${d.id}<br/>
          <b>COMPUTE:</b> ${usageVal} TOKENS<br/>
          <b>STATUS:</b> ${isLive ? 'STREAMING' : 'IDLE'}<br/>
          <b>DOMAIN:</b> ${d.id.includes('llama') ? 'GENERAL' : 'SPECIFIC'}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", 0);
      });

    nodeGroup.append("text")
      .text(d => d.shortName)
      .attr("x", 16)
      .attr("y", 4)
      .attr("fill", "var(--text-dim)")
      .attr("font-size", "10px")
      .attr("font-weight", "800")
      .attr("font-family", "JetBrains Mono, monospace");

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      nodeGroup
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });
  }

  function drag(simulation) {
    function started(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function ended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    return d3.drag().on("start", started).on("drag", dragged).on("end", ended);
  }
</script>

<svg bind:this={svg} width="372" height="300"></svg>

<style>
  svg {
    background: transparent;
  }
  :global(.expert-node) {
    animation: pulse-magenta 2s infinite ease-in-out;
  }
  @keyframes pulse-magenta {
    0% { filter: drop-shadow(0 0 2px #FF00E5); }
    50% { filter: drop-shadow(0 0 8px #FF00E5); }
    100% { filter: drop-shadow(0 0 2px #FF00E5); }
  }
</style>

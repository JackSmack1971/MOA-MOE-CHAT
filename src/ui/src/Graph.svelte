<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  let { nodes = [], adjacency = [] } = $props();

  let svg;
  let simulation;

  $effect(() => {
    if (!svg || nodes.length === 0) return;
    updateGraph();
  });

  function updateGraph() {
    const width = 400;
    const height = 400;

    const svgElement = d3.select(svg);
    svgElement.selectAll("*").remove();

    const links = [];
    adjacency.forEach((row, i) => {
      row.forEach((val, j) => {
        if (val > 0.1) {
          links.push({ source: nodes[i], target: nodes[j], value: val });
        }
      });
    });

    const graphNodes = nodes.map(id => ({ id }));

    simulation = d3.forceSimulation(graphNodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svgElement.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#00F2FF")
      .attr("stroke-opacity", d => d.value)
      .attr("stroke-width", d => d.value * 5);

    const node = svgElement.append("g")
      .selectAll("circle")
      .data(graphNodes)
      .join("circle")
      .attr("r", 15)
      .attr("fill", "#FF00E5")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .call(drag(simulation));

    node.append("title").text(d => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
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

<svg bind:this={svg} width="400" height="400"></svg>

<style>
  svg {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
  }
</style>

import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3-force';
import type { Simulation, SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';
import type { GraphData, GraphNode, GraphEdge, EdgeType } from './types';

export interface SimNode extends GraphNode, SimulationNodeDatum {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export interface SimLink extends SimulationLinkDatum<SimNode> {
  source: SimNode;
  target: SimNode;
  strength: number;
  type: EdgeType;
  directed?: boolean;
  flowDirection?: 'reads' | 'writes';
  label?: string;
}

// Calculate community centroids from node positions
function calculateCommunityCentroids(nodes: SimNode[]): Map<number, { x: number; y: number }> {
  const sums = new Map<number, { x: number; y: number; count: number }>();
  for (const node of nodes) {
    if (node.communityId !== undefined && node.x !== undefined && node.y !== undefined) {
      if (!sums.has(node.communityId)) {
        sums.set(node.communityId, { x: 0, y: 0, count: 0 });
      }
      const s = sums.get(node.communityId)!;
      s.x += node.x;
      s.y += node.y;
      s.count++;
    }
  }

  const centroids = new Map<number, { x: number; y: number }>();
  for (const [id, { x, y, count }] of sums) {
    centroids.set(id, { x: x / count, y: y / count });
  }
  return centroids;
}

export class GraphSimulation {
  private simulation: Simulation<SimNode, SimLink>;
  private nodes: SimNode[];
  private links: SimLink[];

  constructor(data: GraphData, width: number, height: number) {
    // Create mutable copies with positions
    this.nodes = data.nodes.map(n => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
    }));

    // Create links with node references
    this.links = this.createLinks(data.edges);

    // Initialize simulation
    this.simulation = forceSimulation<SimNode, SimLink>(this.nodes)
      .force('link', forceLink<SimNode, SimLink>(this.links)
        .id(d => d.id)
        .distance(d => 50 + (1 - d.strength) * 100)
      )
      .force('charge', forceManyBody<SimNode>().strength(-300))
      .force('center', forceCenter(width / 2, height / 2))
      .force('collide', forceCollide<SimNode>(d => d.size + 4))
      .alphaDecay(0.02);
  }

  private createLinks(edges: GraphEdge[]): SimLink[] {
    const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    const links: SimLink[] = [];
    for (const e of edges) {
      const source = nodeMap.get(e.source);
      const target = nodeMap.get(e.target);
      if (!source || !target) continue;

      links.push({
        source,
        target,
        strength: e.strength,
        type: e.type,
        directed: e.directed,
        flowDirection: e.flowDirection,
        label: e.label,
      });
    }
    return links;
  }

  getNodes(): SimNode[] {
    return this.nodes;
  }

  getLinks(): SimLink[] {
    return this.links;
  }

  onTick(callback: () => void): void {
    this.simulation.on('tick', callback);
  }

  restart(): void {
    this.simulation.alpha(0.3).restart();
  }

  stop(): void {
    this.simulation.stop();
  }

  updateSize(width: number, height: number): void {
    this.simulation.force('center', forceCenter(width / 2, height / 2));
    this.restart();
  }

  enableClustering(enabled: boolean, strength: number = 0.1): void {
    if (enabled) {
      const centroids = calculateCommunityCentroids(this.nodes);

      this.simulation
        .force('clusterX', forceX<SimNode>()
          .x(d => centroids.get(d.communityId!)?.x || 0)
          .strength(d => d.communityId !== undefined ? strength : 0)
        )
        .force('clusterY', forceY<SimNode>()
          .y(d => centroids.get(d.communityId!)?.y || 0)
          .strength(d => d.communityId !== undefined ? strength : 0)
        );
    } else {
      this.simulation.force('clusterX', null);
      this.simulation.force('clusterY', null);
    }

    this.simulation.alpha(0.3).restart();
  }
}

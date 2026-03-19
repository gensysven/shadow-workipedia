/**
 * Ontology force graph visualization.
 *
 * Renders Shadow Work's simulation ontology as an interactive D3 force-directed
 * graph. Nodes are grouped by category (pressures, institutions, issues, facets,
 * policies, etc.) with cascade edges shown as directed links.
 */
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
} from 'd3-force';
import type { Simulation, SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';

// ── Types ────────────────────────────────────────────────────────────

interface OntologySchema {
  schema_version: string;
  pressure_types: string[];
  institution_types: string[];
  issue_types: string[];
  cascade_edges: { source: string; target: string; weight: number }[];
  pressure_decay_rates: { pressure_type: string; decay_rate: number }[];
  personality_facets: { name: string; category: string }[];
  ideology_axes: { name: string; low_label: string; high_label: string }[];
  agent_actions: string[];
  agent_goals: string[];
  policy_types: string[];
  policy_stances: string[];
  policy_domains: string[];
  worldview_axes: { name: string; low_label: string; high_label: string }[];
  countries: { iso_code: string; shadow_name: string }[];
  metadata: Record<string, number | string>;
}

type OntologyCategory =
  | 'pressure'
  | 'institution'
  | 'issue'
  | 'facet'
  | 'ideology'
  | 'action'
  | 'goal'
  | 'policy'
  | 'worldview'
  | 'country';

interface OntNode extends SimulationNodeDatum {
  id: string;
  label: string;
  category: OntologyCategory;
  subcategory?: string;
  size: number;
  x: number;
  y: number;
}

interface OntLink extends SimulationLinkDatum<OntNode> {
  source: OntNode;
  target: OntNode;
  weight: number;
  type: 'cascade' | 'membership' | 'axis';
}

// ── Colors ───────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<OntologyCategory, string> = {
  pressure: '#ef4444',    // red
  institution: '#3b82f6', // blue
  issue: '#f59e0b',       // amber
  facet: '#8b5cf6',       // purple
  ideology: '#ec4899',    // pink
  action: '#10b981',      // emerald
  goal: '#06b6d4',        // cyan
  policy: '#f97316',      // orange
  worldview: '#a855f7',   // violet
  country: '#6ee7b7',     // mint
};

const CATEGORY_LABELS: Record<OntologyCategory, string> = {
  pressure: 'Pressures',
  institution: 'Institutions',
  issue: 'Issues',
  facet: 'Personality Facets',
  ideology: 'Ideology Axes',
  action: 'Agent Actions',
  goal: 'Agent Goals',
  policy: 'Policy Types',
  worldview: 'Worldview Axes',
  country: 'Countries',
};

// Radial layout angles per category (avoids overlap)
const CATEGORY_ANGLES: Record<OntologyCategory, number> = {
  pressure: 0,
  institution: Math.PI * 0.25,
  issue: Math.PI * 0.5,
  facet: Math.PI * 0.75,
  ideology: Math.PI,
  action: Math.PI * 1.15,
  goal: Math.PI * 1.3,
  policy: Math.PI * 1.5,
  worldview: Math.PI * 1.7,
  country: Math.PI * 1.85,
};

// ── Build graph from schema ──────────────────────────────────────────

function buildGraph(schema: OntologySchema): { nodes: OntNode[]; links: OntLink[] } {
  const nodes: OntNode[] = [];
  const nodeMap = new Map<string, OntNode>();

  function addNode(id: string, label: string, category: OntologyCategory, size: number, sub?: string) {
    const node: OntNode = { id, label, category, subcategory: sub, size, x: 0, y: 0 };
    nodes.push(node);
    nodeMap.set(id, node);
    return node;
  }

  // Pressures (large, central)
  for (const p of schema.pressure_types) {
    addNode(`p:${p}`, formatLabel(p), 'pressure', 14);
  }

  // Institutions
  for (const i of schema.institution_types) {
    addNode(`i:${i}`, formatLabel(i), 'institution', 12);
  }

  // Issues
  for (const t of schema.issue_types) {
    addNode(`t:${t}`, formatLabel(t), 'issue', 8);
  }

  // Personality facets
  for (const f of schema.personality_facets) {
    addNode(`f:${f.name}`, formatLabel(f.name), 'facet', 6, f.category);
  }

  // Ideology axes
  for (const a of schema.ideology_axes) {
    addNode(`id:${a.name}`, `${a.low_label} ↔ ${a.high_label}`, 'ideology', 10);
  }

  // Agent actions
  for (const a of schema.agent_actions) {
    addNode(`a:${a}`, formatLabel(a), 'action', 7);
  }

  // Agent goals
  for (const g of schema.agent_goals) {
    addNode(`g:${g}`, formatLabel(g), 'goal', 7);
  }

  // Policy types (sample — too many for legibility, take first 10 + count)
  const policySubset = schema.policy_types.slice(0, 12);
  for (const p of policySubset) {
    addNode(`pol:${p}`, formatLabel(p), 'policy', 6);
  }
  if (schema.policy_types.length > 12) {
    addNode('pol:more', `+${schema.policy_types.length - 12} more`, 'policy', 5);
  }

  // Worldview axes
  for (const w of schema.worldview_axes) {
    addNode(`w:${w.name}`, `${w.low_label} ↔ ${w.high_label}`, 'worldview', 10);
  }

  // Countries
  for (const c of schema.countries) {
    addNode(`c:${c.iso_code}`, `${c.shadow_name} (${c.iso_code})`, 'country', 9);
  }

  // Links: cascade edges
  const links: OntLink[] = [];
  for (const e of schema.cascade_edges) {
    const src = nodeMap.get(`p:${e.source}`);
    const tgt = nodeMap.get(`p:${e.target}`);
    if (src && tgt) {
      links.push({ source: src, target: tgt, weight: e.weight, type: 'cascade' });
    }
  }

  return { nodes, links };
}

function formatLabel(snake: string): string {
  return snake
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Simulation ───────────────────────────────────────────────────────

let simulation: Simulation<OntNode, OntLink> | null = null;
let ontNodes: OntNode[] = [];
let ontLinks: OntLink[] = [];
let hoveredNode: OntNode | null = null;
let transform = { x: 0, y: 0, k: 1 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };

export async function initOntologyView(canvas: HTMLCanvasElement, legendEl: HTMLElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Load ontology data
  const resp = await fetch('/ontology.json');
  const schema: OntologySchema = await resp.json();

  const { nodes, links } = buildGraph(schema);
  ontNodes = nodes;
  ontLinks = links;

  // Resize canvas
  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;

  // Initial positions by category (radial layout)
  const radius = Math.min(w, h) * 0.3;
  for (const node of nodes) {
    const angle = CATEGORY_ANGLES[node.category];
    const spread = 60;
    node.x = w / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * spread;
    node.y = h / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * spread;
  }

  // D3 force simulation
  simulation = forceSimulation<OntNode, OntLink>(nodes)
    .force('link', forceLink<OntNode, OntLink>(links)
      .id((d: OntNode) => d.id)
      .distance(80)
      .strength((d: OntLink) => d.weight * 2)
    )
    .force('charge', forceManyBody<OntNode>().strength((d: OntNode) => d.category === 'pressure' ? -400 : -150))
    .force('center', forceCenter(w / 2, h / 2).strength(0.05))
    .force('collide', forceCollide<OntNode>((d: OntNode) => d.size + 3))
    // Cluster by category
    .force('x', forceX<OntNode>((d: OntNode) => {
      const angle = CATEGORY_ANGLES[d.category];
      return w / 2 + Math.cos(angle) * radius * 0.6;
    }).strength(0.08))
    .force('y', forceY<OntNode>((d: OntNode) => {
      const angle = CATEGORY_ANGLES[d.category];
      return h / 2 + Math.sin(angle) * radius * 0.6;
    }).strength(0.08))
    .alphaDecay(0.015)
    .on('tick', () => render(ctx!, w, h));

  // Interactions
  setupInteractions(canvas, w, h, ctx!);

  // Legend
  renderLegend(legendEl, schema);
}

// ── Render ────────────────────────────────────────────────────────────

function render(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  // Apply transform
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.k, transform.k);

  // Draw links
  ctx.globalAlpha = 0.3;
  for (const link of ontLinks) {
    const src = link.source;
    const tgt = link.target;
    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.strokeStyle = CATEGORY_COLORS[src.category];
    ctx.lineWidth = 1;
    ctx.stroke();

    // Arrow head for cascade edges
    if (link.type === 'cascade') {
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const nx = dx / len;
        const ny = dy / len;
        const ax = tgt.x - nx * (tgt.size + 4);
        const ay = tgt.y - ny * (tgt.size + 4);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - nx * 6 + ny * 3, ay - ny * 6 - nx * 3);
        ctx.lineTo(ax - nx * 6 - ny * 3, ay - ny * 6 + nx * 3);
        ctx.closePath();
        ctx.fillStyle = CATEGORY_COLORS[src.category];
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;

  // Draw nodes
  for (const node of ontNodes) {
    const isHovered = hoveredNode === node;

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
    ctx.fillStyle = isHovered
      ? '#ffffff'
      : CATEGORY_COLORS[node.category];
    ctx.fill();

    if (isHovered) {
      ctx.strokeStyle = CATEGORY_COLORS[node.category];
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Draw labels (only for larger nodes or hovered)
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const node of ontNodes) {
    if (node.size >= 8 || hoveredNode === node) {
      ctx.fillStyle = hoveredNode === node ? '#ffffff' : 'rgba(226, 232, 240, 0.8)';
      ctx.fillText(node.label, node.x, node.y + node.size + 3, 120);
    }
  }

  // Hovered node tooltip
  if (hoveredNode) {
    const x = hoveredNode.x;
    const y = hoveredNode.y - hoveredNode.size - 20;
    const text = `${hoveredNode.label} (${CATEGORY_LABELS[hoveredNode.category]})`;
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    const metrics = ctx.measureText(text);
    const pad = 6;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(x - metrics.width / 2 - pad, y - pad, metrics.width + pad * 2, 20 + pad);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 4);
  }

  ctx.restore();
}

// ── Interactions ──────────────────────────────────────────────────────

function setupInteractions(canvas: HTMLCanvasElement, w: number, h: number, ctx: CanvasRenderingContext2D) {
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - transform.x) / transform.k;
    const my = (e.clientY - rect.top - transform.y) / transform.k;

    if (isDragging) {
      transform.x += e.clientX - rect.left - dragStart.x;
      transform.y += e.clientY - rect.top - dragStart.y;
      dragStart.x = e.clientX - rect.left;
      dragStart.y = e.clientY - rect.top;
      render(ctx, w, h);
      return;
    }

    let found: OntNode | null = null;
    for (const node of ontNodes) {
      const dx = node.x - mx;
      const dy = node.y - my;
      if (dx * dx + dy * dy < (node.size + 4) ** 2) {
        found = node;
        break;
      }
    }
    if (found !== hoveredNode) {
      hoveredNode = found;
      canvas.style.cursor = found ? 'pointer' : 'grab';
      render(ctx, w, h);
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    isDragging = true;
    dragStart.x = e.clientX - rect.left;
    dragStart.y = e.clientY - rect.top;
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newK = Math.max(0.2, Math.min(5, transform.k * delta));

    transform.x = mx - (mx - transform.x) * (newK / transform.k);
    transform.y = my - (my - transform.y) * (newK / transform.k);
    transform.k = newK;
    render(ctx, w, h);
  }, { passive: false });
}

// ── Legend ────────────────────────────────────────────────────────────

function renderLegend(el: HTMLElement, schema: OntologySchema) {
  const categories: OntologyCategory[] = [
    'pressure', 'institution', 'issue', 'facet', 'ideology',
    'action', 'goal', 'policy', 'worldview', 'country',
  ];

  const counts: Record<OntologyCategory, number> = {
    pressure: schema.pressure_types.length,
    institution: schema.institution_types.length,
    issue: schema.issue_types.length,
    facet: schema.personality_facets.length,
    ideology: schema.ideology_axes.length,
    action: schema.agent_actions.length,
    goal: schema.agent_goals.length,
    policy: schema.policy_types.length,
    worldview: schema.worldview_axes.length,
    country: schema.countries.length,
  };

  el.innerHTML = `
    <div style="
      position: absolute; bottom: 16px; left: 16px;
      background: rgba(15, 23, 42, 0.85); border-radius: 8px;
      padding: 12px 16px; backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.1);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px; color: #e2e8f0;
      max-width: 240px;
    ">
      <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px; color: #fff;">
        Simulation Ontology <span style="opacity: 0.5; font-weight: 400;">${schema.schema_version}</span>
      </div>
      ${categories.map(cat => `
        <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
          <span style="
            width: 10px; height: 10px; border-radius: 50%;
            background: ${CATEGORY_COLORS[cat]}; flex-shrink: 0;
          "></span>
          <span>${CATEGORY_LABELS[cat]}</span>
          <span style="margin-left: auto; opacity: 0.5;">${counts[cat]}</span>
        </div>
      `).join('')}
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); opacity: 0.5;">
        ${schema.cascade_edges.length} cascade edges
      </div>
    </div>
  `;
}

export function destroyOntologyView() {
  if (simulation) {
    simulation.stop();
    simulation = null;
  }
  ontNodes = [];
  ontLinks = [];
  hoveredNode = null;
  transform = { x: 0, y: 0, k: 1 };
}

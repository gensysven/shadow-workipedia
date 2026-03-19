/**
 * Ontology force graph visualization — feature-parity with the issues graph.
 *
 * Features: category filtering, search, node selection + detail panel,
 * node drag, pan/zoom, hover tooltip, connected-node highlighting,
 * directed cascade arrows, fit-to-view, subcategory rings on facets.
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

export type OntologyCategory =
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

const ALL_CATEGORIES: OntologyCategory[] = [
  'pressure',
  'institution',
  'issue',
  'facet',
  'ideology',
  'action',
  'goal',
  'policy',
  'worldview',
  'country',
];

export interface OntNode extends SimulationNodeDatum {
  id: string;
  label: string;
  category: OntologyCategory;
  subcategory?: string;
  detail?: string;
  size: number;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

interface OntLink extends SimulationLinkDatum<OntNode> {
  source: OntNode;
  target: OntNode;
  weight: number;
  type: 'cascade' | 'membership' | 'axis';
}

// ── Colors & Labels ──────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<OntologyCategory, string> = {
  pressure: '#ef4444',
  institution: '#3b82f6',
  issue: '#f59e0b',
  facet: '#8b5cf6',
  ideology: '#ec4899',
  action: '#10b981',
  goal: '#06b6d4',
  policy: '#f97316',
  worldview: '#a855f7',
  country: '#6ee7b7',
};

export const CATEGORY_LABELS: Record<OntologyCategory, string> = {
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

const SUBCATEGORY_COLORS: Record<string, string> = {
  decision_making: '#a78bfa',
  social: '#f472b6',
  stress_resilience: '#fb923c',
  ethical: '#34d399',
  institutional: '#60a5fa',
  cognitive: '#fbbf24',
};

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

// ── State ────────────────────────────────────────────────────────────

let sim: Simulation<OntNode, OntLink> | null = null;
let nodes: OntNode[] = [];
let links: OntLink[] = [];
let schema: OntologySchema | null = null;

let hoveredNode: OntNode | null = null;
let selectedNode: OntNode | null = null;
let connectedToSelected = new Set<string>();
let activeCategories = new Set<OntologyCategory>(ALL_CATEGORIES);
let searchTerm = '';
let searchResults = new Set<string>();
let isDraggingNode = false;
let draggedNode: OntNode | null = null;

let tx = 0,
  ty = 0,
  tk = 1; // transform
let isPanning = false;
let panStart = { x: 0, y: 0 };

let canvasW = 0,
  canvasH = 0;
let ctx: CanvasRenderingContext2D | null = null;
let canvasEl: HTMLCanvasElement | null = null;
let tooltipEl: HTMLElement | null = null;
let detailEl: HTMLElement | null = null;
let legendEl: HTMLElement | null = null;

// ── Build graph ──────────────────────────────────────────────────────

function fmt(snake: string): string {
  return snake
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildGraph(s: OntologySchema): { nodes: OntNode[]; links: OntLink[] } {
  const n: OntNode[] = [];
  const m = new Map<string, OntNode>();
  const add = (
    id: string,
    label: string,
    cat: OntologyCategory,
    sz: number,
    sub?: string,
    det?: string,
  ) => {
    const node: OntNode = {
      id,
      label,
      category: cat,
      subcategory: sub,
      detail: det,
      size: sz,
      x: 0,
      y: 0,
    };
    n.push(node);
    m.set(id, node);
    return node;
  };

  for (const p of s.pressure_types) {
    const dr = s.pressure_decay_rates.find(d => d.pressure_type === p);
    add(`p:${p}`, fmt(p), 'pressure', 16, undefined, dr ? `Decay: ${dr.decay_rate}/mo` : undefined);
  }
  for (const i of s.institution_types) add(`i:${i}`, fmt(i), 'institution', 13);
  for (const t of s.issue_types) add(`t:${t}`, fmt(t), 'issue', 9);
  for (const f of s.personality_facets) add(`f:${f.name}`, fmt(f.name), 'facet', 6, f.category);
  for (const a of s.ideology_axes)
    add(
      `id:${a.name}`,
      `${fmt(a.low_label)} ↔ ${fmt(a.high_label)}`,
      'ideology',
      11,
      undefined,
      `${a.name} axis`,
    );
  for (const a of s.agent_actions) add(`a:${a}`, fmt(a), 'action', 8);
  for (const g of s.agent_goals) add(`g:${g}`, fmt(g), 'goal', 8);
  for (const p of s.policy_types) add(`pol:${p}`, fmt(p), 'policy', 6);
  for (const w of s.worldview_axes)
    add(`w:${w.name}`, `${fmt(w.low_label)} ↔ ${fmt(w.high_label)}`, 'worldview', 11);
  for (const c of s.countries)
    add(`c:${c.iso_code}`, `${fmt(c.shadow_name)} (${c.iso_code})`, 'country', 10);

  const l: OntLink[] = [];
  for (const e of s.cascade_edges) {
    const src = m.get(`p:${e.source}`),
      tgt = m.get(`p:${e.target}`);
    if (src && tgt) l.push({ source: src, target: tgt, weight: e.weight, type: 'cascade' });
  }
  return { nodes: n, links: l };
}

// ── Visibility ───────────────────────────────────────────────────────

function isVisible(n: OntNode): boolean {
  return activeCategories.has(n.category);
}

function getVisibleNodes(): OntNode[] {
  return nodes.filter(isVisible);
}

function updateSearch() {
  searchResults.clear();
  if (!searchTerm) return;
  const q = searchTerm.toLowerCase();
  for (const n of nodes) {
    if (n.label.toLowerCase().includes(q) || n.subcategory?.toLowerCase().includes(q)) {
      searchResults.add(n.id);
    }
  }
}

function updateConnected() {
  connectedToSelected.clear();
  if (!selectedNode) return;
  connectedToSelected.add(selectedNode.id);
  for (const l of links) {
    if (l.source.id === selectedNode.id) connectedToSelected.add(l.target.id);
    if (l.target.id === selectedNode.id) connectedToSelected.add(l.source.id);
  }
}

// ── Hit testing ──────────────────────────────────────────────────────

function hitTest(mx: number, my: number): OntNode | null {
  const r = 20 / tk;
  let best: OntNode | null = null;
  let bestDist = r * r;
  for (const n of getVisibleNodes()) {
    const dx = n.x - mx,
      dy = n.y - my;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist) {
      best = n;
      bestDist = d2;
    }
  }
  return best;
}

function screenToGraph(sx: number, sy: number): [number, number] {
  return [(sx - tx) / tk, (sy - ty) / tk];
}

// ── Render ───────────────────────────────────────────────────────────

function render() {
  if (!ctx) return;
  const c = ctx;
  c.save();
  c.clearRect(0, 0, canvasW, canvasH);
  c.fillStyle = '#0f172a';
  c.fillRect(0, 0, canvasW, canvasH);
  c.translate(tx, ty);
  c.scale(tk, tk);

  const invK = 1 / tk;
  const hasSelection = selectedNode !== null;

  // Edges
  for (const l of links) {
    if (!isVisible(l.source) || !isVisible(l.target)) continue;
    const connected =
      hasSelection && connectedToSelected.has(l.source.id) && connectedToSelected.has(l.target.id);
    c.globalAlpha = hasSelection ? (connected ? 0.7 : 0.05) : 0.25;
    c.beginPath();
    c.moveTo(l.source.x, l.source.y);
    c.lineTo(l.target.x, l.target.y);
    c.strokeStyle = connected ? CATEGORY_COLORS[l.source.category] : 'rgba(148, 163, 184, 0.4)';
    c.lineWidth = (connected ? 2 : 1) * invK;
    c.stroke();

    // Arrow heads for cascade edges
    if (l.type === 'cascade') {
      const dx = l.target.x - l.source.x,
        dy = l.target.y - l.source.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const nx = dx / len,
          ny = dy / len;
        const arrowSize = Math.max(6, 10 * invK);
        const ax = l.target.x - nx * (l.target.size + 4 * invK);
        const ay = l.target.y - ny * (l.target.size + 4 * invK);
        c.beginPath();
        c.moveTo(ax, ay);
        c.lineTo(
          ax - nx * arrowSize + ny * arrowSize * 0.4,
          ay - ny * arrowSize - nx * arrowSize * 0.4,
        );
        c.lineTo(
          ax - nx * arrowSize - ny * arrowSize * 0.4,
          ay - ny * arrowSize + nx * arrowSize * 0.4,
        );
        c.closePath();
        c.fillStyle = c.strokeStyle;
        c.fill();
      }
    }
  }
  c.globalAlpha = 1;

  // Nodes
  for (const n of nodes) {
    if (!isVisible(n)) continue;
    const isHovered = hoveredNode === n;
    const isSelected = selectedNode === n;
    const isConnected = hasSelection ? connectedToSelected.has(n.id) : true;
    const inSearch = searchTerm && searchResults.has(n.id);

    c.globalAlpha = hasSelection
      ? isConnected
        ? 0.95
        : 0.1
      : inSearch
        ? 1
        : searchTerm
          ? 0.15
          : 0.9;
    const scale = isHovered || isSelected ? 1.2 : 1;
    const r = n.size * scale;

    // Selection/hover glow
    if (isSelected) {
      c.beginPath();
      c.arc(n.x, n.y, r + 4 * invK, 0, Math.PI * 2);
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2 * invK;
      c.stroke();
    }

    // Subcategory ring (facets only)
    if (n.subcategory && SUBCATEGORY_COLORS[n.subcategory]) {
      c.beginPath();
      c.arc(n.x, n.y, r + 2 * invK, 0, Math.PI * 2);
      c.strokeStyle = SUBCATEGORY_COLORS[n.subcategory];
      c.lineWidth = 2 * invK;
      c.stroke();
    }

    // Search highlight ring
    if (inSearch && !isSelected) {
      c.beginPath();
      c.arc(n.x, n.y, r + 3 * invK, 0, Math.PI * 2);
      c.strokeStyle = '#3b82f6';
      c.lineWidth = 2 * invK;
      c.stroke();
    }

    // Node body
    c.beginPath();
    c.arc(n.x, n.y, r, 0, Math.PI * 2);
    c.fillStyle = isHovered || isSelected ? '#ffffff' : CATEGORY_COLORS[n.category];
    c.fill();

    if (isHovered && !isSelected) {
      c.strokeStyle = CATEGORY_COLORS[n.category];
      c.lineWidth = 2 * invK;
      c.stroke();
    }
  }
  c.globalAlpha = 1;

  // Labels (visible when zoomed in enough or for large/selected/hovered nodes)
  const labelThreshold = tk > 0.6 ? 6 : 9;
  c.font = `${Math.max(9, 11 * invK)}px system-ui, -apple-system, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'top';
  for (const n of nodes) {
    if (!isVisible(n)) continue;
    const show = n.size >= labelThreshold || hoveredNode === n || selectedNode === n;
    if (!show) continue;
    const isConnected = hasSelection ? connectedToSelected.has(n.id) : true;
    c.globalAlpha = isConnected ? 0.85 : 0.08;
    c.fillStyle = hoveredNode === n || selectedNode === n ? '#ffffff' : '#e2e8f0';
    c.fillText(
      n.label,
      n.x,
      n.y + n.size * (hoveredNode === n || selectedNode === n ? 1.2 : 1) + 3 * invK,
      130,
    );
  }
  c.globalAlpha = 1;

  c.restore();
}

// ── Detail Panel ─────────────────────────────────────────────────────

function renderDetailPanel(n: OntNode) {
  if (!detailEl) return;
  const connections = links
    .filter(l => l.source.id === n.id || l.target.id === n.id)
    .map(l => (l.source.id === n.id ? l.target : l.source));

  detailEl.innerHTML = `
    <div class="ont-detail">
      <button class="ont-detail-close" id="ont-close-panel">&times;</button>
      <h2 style="margin: 0 0 8px; font-size: 1.3rem; color: #fff;">${n.label}</h2>
      <span class="ont-badge" style="background: ${CATEGORY_COLORS[n.category]}20; color: ${CATEGORY_COLORS[n.category]}; border: 1px solid ${CATEGORY_COLORS[n.category]}40;">
        ${CATEGORY_LABELS[n.category]}
      </span>
      ${n.subcategory ? `<span class="ont-badge" style="background: ${SUBCATEGORY_COLORS[n.subcategory] || '#888'}20; color: ${SUBCATEGORY_COLORS[n.subcategory] || '#888'}; border: 1px solid ${SUBCATEGORY_COLORS[n.subcategory] || '#888'}40; margin-left: 4px;">${fmt(n.subcategory)}</span>` : ''}
      ${n.detail ? `<p style="color: #94a3b8; margin: 12px 0 0; font-size: 0.85rem;">${n.detail}</p>` : ''}
      ${
        connections.length > 0
          ? `
        <div style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
          <h3 style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px;">Connections (${connections.length})</h3>
          <div style="display: flex; flex-direction: column; gap: 4px; max-height: 300px; overflow-y: auto;">
            ${connections
              .map(
                c => `
              <div class="ont-connection" data-node-id="${c.id}" style="
                padding: 6px 10px; border-radius: 6px; cursor: pointer;
                background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
                display: flex; align-items: center; gap: 8px; font-size: 0.8rem;
              ">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${CATEGORY_COLORS[c.category]}; flex-shrink: 0;"></span>
                <span style="color: #e2e8f0;">${c.label}</span>
                <span style="margin-left: auto; color: #64748b; font-size: 0.7rem;">${CATEGORY_LABELS[c.category]}</span>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;
  detailEl.classList.remove('hidden');

  // Close button
  document.getElementById('ont-close-panel')?.addEventListener('click', () => {
    selectedNode = null;
    connectedToSelected.clear();
    detailEl!.classList.add('hidden');
    render();
  });

  // Connection click → select that node
  detailEl.querySelectorAll('.ont-connection').forEach(el => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).dataset.nodeId;
      const target = nodes.find(n => n.id === id);
      if (target) selectNode(target);
    });
  });
}

function selectNode(n: OntNode) {
  selectedNode = n;
  updateConnected();
  renderDetailPanel(n);
  render();
}

// ── Tooltip ──────────────────────────────────────────────────────────

function showTooltip(n: OntNode, cx: number, cy: number) {
  if (!tooltipEl) return;
  tooltipEl.innerHTML = `
    <div style="font-weight: 600; color: #fff;">${n.label}</div>
    <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">
      ${CATEGORY_LABELS[n.category]}${n.subcategory ? ` · ${fmt(n.subcategory)}` : ''}
    </div>
    ${n.detail ? `<div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">${n.detail}</div>` : ''}
  `;
  tooltipEl.style.left = `${cx + 16}px`;
  tooltipEl.style.top = `${cy + 16}px`;
  tooltipEl.classList.remove('hidden');
}

function hideTooltip() {
  tooltipEl?.classList.add('hidden');
}

// ── Interactions ─────────────────────────────────────────────────────

function setupInteractions(canvas: HTMLCanvasElement) {
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left,
      sy = e.clientY - rect.top;

    if (isDraggingNode && draggedNode) {
      const [gx, gy] = screenToGraph(sx, sy);
      draggedNode.fx = gx;
      draggedNode.fy = gy;
      sim?.alpha(0.3).restart();
      return;
    }

    if (isPanning) {
      tx += sx - panStart.x;
      ty += sy - panStart.y;
      panStart.x = sx;
      panStart.y = sy;
      render();
      return;
    }

    const [gx, gy] = screenToGraph(sx, sy);
    const found = hitTest(gx, gy);
    if (found !== hoveredNode) {
      hoveredNode = found;
      canvas.style.cursor = found ? 'pointer' : 'grab';
      if (found) showTooltip(found, e.clientX - rect.left, e.clientY - rect.top);
      else hideTooltip();
      render();
    } else if (found) {
      showTooltip(found, e.clientX - rect.left, e.clientY - rect.top);
    }
  });

  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left,
      sy = e.clientY - rect.top;
    const [gx, gy] = screenToGraph(sx, sy);
    const hit = hitTest(gx, gy);

    if (hit) {
      isDraggingNode = true;
      draggedNode = hit;
      hit.fx = gx;
      hit.fy = gy;
      canvas.style.cursor = 'grabbing';
      sim?.alpha(0.3).restart();
    } else {
      isPanning = true;
      panStart = { x: sx, y: sy };
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (isDraggingNode && draggedNode) {
      // If barely moved, treat as click → select
      draggedNode.fx = null;
      draggedNode.fy = null;
      isDraggingNode = false;
      draggedNode = null;
    }
    if (isPanning) isPanning = false;
    canvasEl!.style.cursor = hoveredNode ? 'pointer' : 'grab';
  });

  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const [gx, gy] = screenToGraph(e.clientX - rect.left, e.clientY - rect.top);
    const hit = hitTest(gx, gy);
    if (hit) {
      selectNode(hit);
      hideTooltip();
    } else {
      selectedNode = null;
      connectedToSelected.clear();
      detailEl?.classList.add('hidden');
      render();
    }
  });

  canvas.addEventListener(
    'wheel',
    e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left,
        my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newK = Math.max(0.15, Math.min(6, tk * delta));
      tx = mx - (mx - tx) * (newK / tk);
      ty = my - (my - ty) * (newK / tk);
      tk = newK;
      render();
    },
    { passive: false },
  );
}

// ── Fit to view ──────────────────────────────────────────────────────

function fitToView() {
  const visible = getVisibleNodes();
  if (visible.length === 0) return;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const n of visible) {
    minX = Math.min(minX, n.x - n.size);
    maxX = Math.max(maxX, n.x + n.size);
    minY = Math.min(minY, n.y - n.size);
    maxY = Math.max(maxY, n.y + n.size);
  }
  const bw = maxX - minX,
    bh = maxY - minY;
  const pad = 0.1;
  const scale = Math.min(1.2, (canvasW * (1 - 2 * pad)) / bw, (canvasH * (1 - 2 * pad)) / bh);
  tk = scale;
  tx = canvasW / 2 - (minX + bw / 2) * scale;
  ty = canvasH / 2 - (minY + bh / 2) * scale;
  render();
}

// ── Filter bar + Legend (injected into #ontology-legend) ─────────────

function renderControls() {
  if (!legendEl || !schema) return;
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

  legendEl.innerHTML = `
    <div class="ont-controls">
      <div class="ont-filter-bar">
        ${ALL_CATEGORIES.map(
          cat => `
          <button class="ont-cat-btn ${activeCategories.has(cat) ? 'active' : ''}" data-cat="${cat}"
            style="--cat-color: ${CATEGORY_COLORS[cat]};">
            <span class="ont-cat-dot" style="background: ${CATEGORY_COLORS[cat]};"></span>
            ${CATEGORY_LABELS[cat]} <span class="ont-cat-count">${counts[cat]}</span>
          </button>
        `,
        ).join('')}
      </div>
      <div class="ont-search-row">
        <input type="search" id="ont-search" class="ont-search" placeholder="Search ontology..." value="${searchTerm}" />
        <button id="ont-reset" class="ont-reset-btn">Reset</button>
        <button id="ont-fit" class="ont-fit-btn">Fit</button>
      </div>
    </div>
    <div class="ont-legend">
      <div class="ont-legend-title">
        Simulation Ontology <span class="ont-legend-version">${schema.schema_version}</span>
      </div>
      <div class="ont-legend-stat">${nodes.length} entities · ${links.length} cascade edges</div>
    </div>
  `;

  // Category filter handlers
  legendEl.querySelectorAll('.ont-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = (btn as HTMLElement).dataset.cat as OntologyCategory;
      if (activeCategories.has(cat)) activeCategories.delete(cat);
      else activeCategories.add(cat);
      btn.classList.toggle('active');
      render();
    });
  });

  // Search
  const searchInput = document.getElementById('ont-search') as HTMLInputElement;
  searchInput?.addEventListener('input', () => {
    searchTerm = searchInput.value;
    updateSearch();
    render();
  });

  // Reset
  document.getElementById('ont-reset')?.addEventListener('click', () => {
    searchTerm = '';
    searchResults.clear();
    activeCategories = new Set(ALL_CATEGORIES);
    selectedNode = null;
    connectedToSelected.clear();
    detailEl?.classList.add('hidden');
    renderControls();
    fitToView();
  });

  // Fit
  document.getElementById('ont-fit')?.addEventListener('click', fitToView);
}

// ── Init ─────────────────────────────────────────────────────────────

export async function initOntologyView(canvas: HTMLCanvasElement, legend: HTMLElement) {
  canvasEl = canvas;
  legendEl = legend;
  ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Grab shared tooltip + detail panel from main DOM
  tooltipEl = document.getElementById('tooltip');
  detailEl = document.getElementById('ont-detail-panel');
  if (!detailEl) {
    detailEl = document.createElement('aside');
    detailEl.id = 'ont-detail-panel';
    detailEl.className = 'ont-detail-panel hidden';
    document.getElementById('ontology-view')?.appendChild(detailEl);
  }

  const resp = await fetch('/ontology.json');
  schema = await resp.json();

  const graph = buildGraph(schema!);
  nodes = graph.nodes;
  links = graph.links;

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    canvasW = rect.width;
    canvasH = rect.height;
  }
  resize();
  window.addEventListener('resize', resize);

  const radius = Math.min(canvasW, canvasH) * 0.3;
  for (const n of nodes) {
    const angle = CATEGORY_ANGLES[n.category];
    n.x = canvasW / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 80;
    n.y = canvasH / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 80;
  }

  sim = forceSimulation<OntNode, OntLink>(nodes)
    .force(
      'link',
      forceLink<OntNode, OntLink>(links)
        .id((d: OntNode) => d.id)
        .distance(90)
        .strength((d: OntLink) => d.weight * 1.5),
    )
    .force(
      'charge',
      forceManyBody<OntNode>().strength((d: OntNode) => (d.category === 'pressure' ? -500 : -120)),
    )
    .force('center', forceCenter(canvasW / 2, canvasH / 2).strength(0.03))
    .force(
      'collide',
      forceCollide<OntNode>((d: OntNode) => d.size + 4),
    )
    .force(
      'x',
      forceX<OntNode>(
        (d: OntNode) => canvasW / 2 + Math.cos(CATEGORY_ANGLES[d.category]) * radius * 0.5,
      ).strength(0.06),
    )
    .force(
      'y',
      forceY<OntNode>(
        (d: OntNode) => canvasH / 2 + Math.sin(CATEGORY_ANGLES[d.category]) * radius * 0.5,
      ).strength(0.06),
    )
    .alphaDecay(0.012)
    .on('tick', render);

  setupInteractions(canvas);
  renderControls();
  setTimeout(fitToView, 800);
}

export function destroyOntologyView() {
  sim?.stop();
  sim = null;
  nodes = [];
  links = [];
  schema = null;
  hoveredNode = null;
  selectedNode = null;
  tx = 0;
  ty = 0;
  tk = 1;
}

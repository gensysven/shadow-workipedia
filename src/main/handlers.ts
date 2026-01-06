import type { GraphSimulation, SimNode } from '../graph';
import type { ViewType } from '../article';
import type { GraphData, IssueCategory, PrimitiveName } from '../types';

type HandlerAccessors = {
  getCurrentView: () => ViewType;
  getShowIssues: () => boolean;
  setShowIssues: (value: boolean) => void;
  getShowSystems: () => boolean;
  setShowSystems: (value: boolean) => void;
  getShowPrinciples: () => boolean;
  setShowPrinciples: (value: boolean) => void;
  getShowPrimitives: () => boolean;
  setShowPrimitives: (value: boolean) => void;
  getShowDataFlows: () => boolean;
  setShowDataFlows: (value: boolean) => void;
  getSelectedPrimitive: () => PrimitiveName | null;
  setSelectedPrimitive: (value: PrimitiveName | null) => void;
  setShowClusters: (value: boolean) => void;
  setSearchTerm: (value: string) => void;
  activeCategories: Set<string>;
  searchResults: Set<string>;
};

type HandlerDeps = HandlerAccessors & {
  graph: GraphSimulation;
  data: GraphData;
  render: () => void;
  renderTable: () => void;
  detailPanel: HTMLDivElement;
  closeBtn: HTMLButtonElement;
  setSelectedNode: (node: SimNode | null) => void;
  getPrimitiveColor: (primitive: PrimitiveName) => string;
  getPrimitiveLabel: (primitive: PrimitiveName) => string;
};

export function attachMainHandlers({
  graph,
  data,
  render,
  renderTable,
  detailPanel,
  closeBtn,
  setSelectedNode,
  getCurrentView,
  getShowIssues,
  setShowIssues,
  getShowSystems,
  setShowSystems,
  getShowPrinciples,
  setShowPrinciples,
  getShowPrimitives,
  setShowPrimitives,
  getShowDataFlows,
  setShowDataFlows,
  getSelectedPrimitive,
  setSelectedPrimitive,
  setShowClusters,
  setSearchTerm,
  activeCategories,
  searchResults,
  getPrimitiveColor,
  getPrimitiveLabel,
}: HandlerDeps) {
  function renderTableIfVisible() {
    if (getCurrentView() === 'table') {
      renderTable();
    }
  }

  function updateSearchPlaceholder() {
    const searchInput = document.getElementById('search') as HTMLInputElement;
    if (!searchInput) return;

    const types: string[] = [];
    if (getShowIssues()) types.push('issues');
    if (getShowSystems()) types.push('systems');
    if (getShowPrinciples()) types.push('principles');

    if (types.length === 0) {
      searchInput.placeholder = 'Search...';
    } else if (types.length === 1) {
      searchInput.placeholder = `Search ${types[0]}...`;
    } else {
      searchInput.placeholder = `Search ${types.join(' & ')}...`;
    }
  }

  function updatePrimitiveLegend() {
    let legend = document.getElementById('primitive-legend');
    const showPrimitives = getShowPrimitives();
    const selectedPrimitive = getSelectedPrimitive();

    if (!showPrimitives) {
      if (legend) legend.remove();
      setSelectedPrimitive(null);
      return;
    }

    if (!legend) {
      legend = document.createElement('div');
      legend.id = 'primitive-legend';
      legend.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 12px;
        z-index: 100;
        max-height: 60vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(legend);
    }

    const primitiveCounts = new Map<PrimitiveName, number>();
    for (const node of data.nodes) {
      if (node.primitives) {
        for (const p of node.primitives) {
          primitiveCounts.set(p, (primitiveCounts.get(p) || 0) + 1);
        }
      }
    }

    const sortedPrimitives = Array.from(primitiveCounts.entries()).sort((a, b) => b[1] - a[1]);

    legend.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px; color: #e2e8f0; font-size: 13px;">
        Simulation Primitives
      </div>
      <div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">
        Click to highlight issues
      </div>
      ${sortedPrimitives
        .map(
          ([primitive, count]) => `
        <div class="primitive-item" data-primitive="${primitive}" style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          margin: 2px 0;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.15s;
          ${selectedPrimitive === primitive ? 'background: rgba(255, 255, 255, 0.15);' : ''}
        ">
          <div style="
            width: 12px;
            height: 12px;
            border-radius: 3px;
            background: ${getPrimitiveColor(primitive)};
            flex-shrink: 0;
          "></div>
          <span style="color: #e2e8f0; font-size: 12px; flex: 1;">${getPrimitiveLabel(primitive)}</span>
          <span style="color: #64748b; font-size: 11px;">${count}</span>
        </div>
      `
        )
        .join('')}
      ${selectedPrimitive
        ? `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
          <button id="clear-primitive-selection" style="
            width: 100%;
            padding: 6px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 4px;
            color: #94a3b8;
            font-size: 11px;
            cursor: pointer;
          ">Clear selection</button>
        </div>
      `
        : ''}
    `;

    legend.querySelectorAll('.primitive-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        (item as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
      });
      item.addEventListener('mouseleave', () => {
        const p = item.getAttribute('data-primitive') as PrimitiveName | null;
        (item as HTMLElement).style.background =
          getSelectedPrimitive() === p ? 'rgba(255, 255, 255, 0.15)' : '';
      });
      item.addEventListener('click', () => {
        const p = item.getAttribute('data-primitive') as PrimitiveName | null;
        setSelectedPrimitive(getSelectedPrimitive() === p ? null : p);
        updatePrimitiveLegend();
        render();
        renderTableIfVisible();
      });
    });

    const clearBtn = document.getElementById('clear-primitive-selection');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        setSelectedPrimitive(null);
        updatePrimitiveLegend();
        render();
        renderTableIfVisible();
      });
    }
  }

  closeBtn.addEventListener('click', () => {
    setSelectedNode(null);
    detailPanel.classList.add('hidden');
    render();
  });

  const showIssuesBtn = document.getElementById('show-issues-btn') as HTMLButtonElement;
  const showSystemsBtn = document.getElementById('show-systems-btn') as HTMLButtonElement;

  if (showIssuesBtn) {
    showIssuesBtn.addEventListener('click', () => {
      setShowIssues(!getShowIssues());
      showIssuesBtn.classList.toggle('active', getShowIssues());
      updateSearchPlaceholder();
      render();
      renderTableIfVisible();
    });
  }

  if (showSystemsBtn) {
    showSystemsBtn.addEventListener('click', () => {
      setShowSystems(!getShowSystems());
      showSystemsBtn.classList.toggle('active', getShowSystems());
      updateSearchPlaceholder();
      graph.restart();
      render();
      renderTableIfVisible();
    });
  }

  const showPrinciplesBtn = document.getElementById('show-principles-btn') as HTMLButtonElement;
  if (showPrinciplesBtn) {
    showPrinciplesBtn.addEventListener('click', () => {
      setShowPrinciples(!getShowPrinciples());
      showPrinciplesBtn.classList.toggle('active', getShowPrinciples());
      updateSearchPlaceholder();
      graph.restart();
      render();
      renderTableIfVisible();
    });
  }

  const showPrimitivesBtn = document.getElementById('show-primitives-btn') as HTMLButtonElement;
  if (showPrimitivesBtn) {
    showPrimitivesBtn.addEventListener('click', () => {
      setShowPrimitives(!getShowPrimitives());
      showPrimitivesBtn.classList.toggle('active', getShowPrimitives());
      updateSearchPlaceholder();
      updatePrimitiveLegend();
      render();
      renderTableIfVisible();
    });
  }

  const showDataFlowsBtn = document.getElementById('show-dataflows-btn') as HTMLButtonElement;
  if (showDataFlowsBtn) {
    showDataFlowsBtn.addEventListener('click', () => {
      setShowDataFlows(!getShowDataFlows());
      showDataFlowsBtn.classList.toggle('active', getShowDataFlows());
      render();
    });
  }

  const showClustersToggle = document.getElementById('show-clusters') as HTMLInputElement;
  if (showClustersToggle) {
    showClustersToggle.addEventListener('change', (e) => {
      const nextValue = (e.target as HTMLInputElement).checked;
      setShowClusters(nextValue);
      graph.enableClustering(nextValue, 0.08);
      render();
    });
  }

  const categoryFilters = document.getElementById('category-filters') as HTMLDivElement;
  const categories = [
    { name: 'Existential', color: '#dc2626' },
    { name: 'Economic', color: '#3b82f6' },
    { name: 'Social', color: '#8b5cf6' },
    { name: 'Political', color: '#ef4444' },
    { name: 'Environmental', color: '#10b981' },
    { name: 'Security', color: '#f59e0b' },
    { name: 'Technological', color: '#06b6d4' },
    { name: 'Cultural', color: '#ec4899' },
    { name: 'Infrastructure', color: '#6366f1' },
  ];

  for (const cat of categories) {
    const count = graph
      .getNodes()
      .filter((node) => node.type === 'issue' && node.categories?.includes(cat.name as IssueCategory))
      .length;

    const btn = document.createElement('button');
    btn.className = 'category-filter-btn active';
    btn.textContent = `${cat.name} (${count})`;
    btn.style.setProperty('--category-color', cat.color);
    btn.style.borderColor = cat.color;

    btn.addEventListener('click', () => {
      if (activeCategories.has(cat.name)) {
        activeCategories.delete(cat.name);
        btn.classList.remove('active');
      } else {
        activeCategories.add(cat.name);
        btn.classList.add('active');
      }
      render();
      renderTableIfVisible();
    });

    categoryFilters.appendChild(btn);
  }

  const searchInput = document.getElementById('search') as HTMLInputElement;

  function performSearch(term: string) {
    setSearchTerm(term.toLowerCase().trim());
    searchResults.clear();

    const normalizedTerm = term.toLowerCase().trim();
    if (!normalizedTerm) {
      render();
      renderTableIfVisible();
      return;
    }

    for (const node of graph.getNodes()) {
      const matchesName = node.label.toLowerCase().includes(normalizedTerm);
      const matchesDesc = node.description?.toLowerCase().includes(normalizedTerm);
      const matchesCat = node.categories?.some((cat) => cat.toLowerCase().includes(normalizedTerm));

      if (matchesName || matchesDesc || matchesCat) {
        searchResults.add(node.id);
      }
    }

    console.log(`Found ${searchResults.size} matches for "${term}"`);
    render();
    renderTableIfVisible();
  }

  searchInput.addEventListener('input', (e) => {
    performSearch((e.target as HTMLInputElement).value);
  });
}

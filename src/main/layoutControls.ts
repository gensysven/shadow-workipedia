import type { ArticleRouter } from '../article';
import type { GraphSimulation, SimNode } from '../graph';

type ResizeDeps = {
  canvas: HTMLCanvasElement;
  graph: GraphSimulation;
  render: () => void;
  getViewportSize: () => { width: number; height: number };
  header?: HTMLElement | null;
  filterBar?: HTMLElement | null;
};

type ResetDeps = {
  resetBtn: HTMLButtonElement | null;
  graph: GraphSimulation;
  fitToView: () => void;
  activeCategories: Set<string>;
  getCategoryKeys: () => string[];
  getCategoryButtons: () => Iterable<HTMLElement>;
  getSearchInput: () => HTMLInputElement | null;
  searchResults: Set<string>;
  setSearchTerm: (value: string) => void;
  setSelectedNode: (node: SimNode | null) => void;
  detailPanel: HTMLElement;
  render: () => void;
};

type TabDeps = {
  tabGraph: HTMLButtonElement | null;
  tabTable: HTMLButtonElement | null;
  tabWiki: HTMLButtonElement | null;
  tabAgents: HTMLButtonElement | null;
  router: ArticleRouter;
  getSelectedNode: () => SimNode | null;
  setSelectedNode: (node: SimNode | null) => void;
  detailPanel: HTMLElement;
};

export function createResizeCanvas({
  canvas,
  graph,
  render,
  getViewportSize,
  header,
  filterBar,
}: ResizeDeps) {
  return () => {
    const { width, height } = getViewportSize();
    canvas.width = width;
    const headerHeight = header?.offsetHeight || 0;
    const filterHeight = filterBar?.offsetHeight || 0;
    canvas.height = height - headerHeight - filterHeight;
    graph.restart();
    render();
  };
}

export function attachResetHandler({
  resetBtn,
  graph,
  fitToView,
  activeCategories,
  getCategoryKeys,
  getCategoryButtons,
  getSearchInput,
  searchResults,
  setSearchTerm,
  setSelectedNode,
  detailPanel,
  render,
}: ResetDeps) {
  if (!resetBtn) return;

  resetBtn.addEventListener('click', () => {
    graph.restart();
    setTimeout(fitToView, 300);

    activeCategories.clear();
    getCategoryKeys().forEach((category) => {
      activeCategories.add(category);
    });

    for (const btn of getCategoryButtons()) {
      btn.classList.add('active');
    }

    const searchInput = getSearchInput();
    if (searchInput) {
      searchInput.value = '';
    }
    setSearchTerm('');
    searchResults.clear();

    setSelectedNode(null);
    detailPanel.classList.add('hidden');

    render();
  });
}

export function attachTabNavigation({
  tabGraph,
  tabTable,
  tabWiki,
  tabAgents,
  router,
  getSelectedNode,
  setSelectedNode,
  detailPanel,
}: TabDeps) {
  if (tabGraph) {
    tabGraph.addEventListener('click', () => router.navigateToView('graph'));
  }
  if (tabTable) {
    tabTable.addEventListener('click', () => router.navigateToView('table'));
  }
  if (tabAgents) {
    tabAgents.addEventListener('click', () => router.navigateToView('agents'));
  }
  if (tabWiki) {
    tabWiki.addEventListener('click', () => {
      const selectedNode = getSelectedNode();
      if (selectedNode) {
        const nodeId = selectedNode.id;
        const nodeType = selectedNode.type;
        setSelectedNode(null);
        detailPanel.classList.add('hidden');
        router.navigateToArticle(nodeType, nodeId);
      } else {
        router.navigateToView('wiki');
      }
    });
  }
}

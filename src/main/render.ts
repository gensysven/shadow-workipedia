import type { GraphSimulation, SimNode } from '../graph';
import type { ClickHandler, DragHandler, HoverHandler } from '../interactions';
import type { CommunityInfo, GraphData, IssueCategory, PrimitiveName } from '../types';

type RenderDeps = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  graph: GraphSimulation;
  data: GraphData;
  hoverHandler: HoverHandler;
  clickHandler: ClickHandler;
  dragHandler: DragHandler;
  getVisibleNodes: () => SimNode[];
  getCurrentTransform: () => { x: number; y: number; k: number };
  getShowClusters: () => boolean;
  getShowDataFlows: () => boolean;
  getSelectedNode: () => SimNode | null;
  getHoveredNode: () => SimNode | null;
  getSearchTerm: () => string;
  searchResults: Set<string>;
  getConnectedToSelected: () => Set<string>;
  getSelectedPrimitive: () => PrimitiveName | null;
  getPrimitiveColor: (primitive: PrimitiveName) => string;
  getCategoryColor: (category: IssueCategory) => string;
  renderCommunityHulls: (
    ctx: CanvasRenderingContext2D,
    nodes: SimNode[],
    communities: Record<number, CommunityInfo> | undefined,
    transform: { x: number; y: number; k: number }
  ) => void;
  renderCommunityLabels: (
    ctx: CanvasRenderingContext2D,
    nodes: SimNode[],
    communities: Record<number, CommunityInfo> | undefined,
    transform: { x: number; y: number; k: number }
  ) => void;
  drawArrow: (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    targetRadius: number,
    arrowSize: number
  ) => void;
  drawDiamond: (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ) => void;
  fitToView: () => void;
};

export function createRenderLoop({
  canvas,
  ctx,
  graph,
  data,
  hoverHandler,
  clickHandler,
  dragHandler,
  getVisibleNodes,
  getCurrentTransform,
  getShowClusters,
  getShowDataFlows,
  getSelectedNode,
  getHoveredNode,
  getSearchTerm,
  searchResults,
  getConnectedToSelected,
  getSelectedPrimitive,
  getPrimitiveColor,
  getCategoryColor,
  renderCommunityHulls,
  renderCommunityLabels,
  drawArrow,
  drawDiamond,
  fitToView,
}: RenderDeps) {
  function render() {
    if (!ctx) return;

    const currentTransform = getCurrentTransform();
    const selectedNode = getSelectedNode();
    const hoveredNode = getHoveredNode();
    const searchTerm = getSearchTerm();
    const selectedPrimitive = getSelectedPrimitive();
    const connectedToSelected = getConnectedToSelected();
    const showClusters = getShowClusters();
    const showDataFlows = getShowDataFlows();

    const visibleNodes = getVisibleNodes();
    const visibleNodeIds = new Set<string>(visibleNodes.map((n) => n.id));
    hoverHandler.setVisibleNodes(visibleNodes);
    clickHandler.setVisibleNodes(visibleNodes);
    dragHandler.setVisibleNodes(visibleNodes);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(currentTransform.x, currentTransform.y);
    ctx.scale(currentTransform.k, currentTransform.k);

    if (showClusters) {
      ctx.restore();
      renderCommunityHulls(ctx, visibleNodes, data.communities, currentTransform);
      renderCommunityLabels(ctx, visibleNodes, data.communities, currentTransform);
      ctx.save();
      ctx.translate(currentTransform.x, currentTransform.y);
      ctx.scale(currentTransform.k, currentTransform.k);
    }

    const links = graph.getLinks();
    const k = currentTransform.k;

    {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1 / k;
      ctx.beginPath();
      let drewAny = false;
      for (const link of links) {
        if (link.type === 'data-flow') continue;
        if (!visibleNodeIds.has(link.source.id) || !visibleNodeIds.has(link.target.id)) continue;

        const isConnected =
          selectedNode &&
          (link.source.id === selectedNode.id || link.target.id === selectedNode.id);
        if (isConnected) continue;

        ctx.moveTo(link.source.x!, link.source.y!);
        ctx.lineTo(link.target.x!, link.target.y!);
        drewAny = true;
      }
      if (drewAny) ctx.stroke();
    }

    if (selectedNode) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.lineWidth = 2 / k;
      ctx.beginPath();
      let drewAny = false;
      for (const link of links) {
        if (link.type === 'data-flow') continue;
        if (!visibleNodeIds.has(link.source.id) || !visibleNodeIds.has(link.target.id)) continue;

        const isConnected =
          link.source.id === selectedNode.id || link.target.id === selectedNode.id;
        if (!isConnected) continue;

        ctx.moveTo(link.source.x!, link.source.y!);
        ctx.lineTo(link.target.x!, link.target.y!);
        drewAny = true;
      }
      if (drewAny) ctx.stroke();
    }

    if (showDataFlows) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.lineWidth = 1.5 / k;
      ctx.beginPath();
      let drewAny = false;
      for (const link of links) {
        if (link.type !== 'data-flow') continue;
        if (!visibleNodeIds.has(link.source.id) || !visibleNodeIds.has(link.target.id)) continue;

        const isConnected =
          selectedNode &&
          (link.source.id === selectedNode.id || link.target.id === selectedNode.id);
        if (isConnected) continue;

        ctx.moveTo(link.source.x!, link.source.y!);
        ctx.lineTo(link.target.x!, link.target.y!);
        drewAny = true;
      }
      if (drewAny) ctx.stroke();

      if (selectedNode) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.lineWidth = 2.5 / k;
        ctx.beginPath();
        drewAny = false;
        for (const link of links) {
          if (link.type !== 'data-flow') continue;
          if (!visibleNodeIds.has(link.source.id) || !visibleNodeIds.has(link.target.id)) continue;

          const isConnected =
            link.source.id === selectedNode.id || link.target.id === selectedNode.id;
          if (!isConnected) continue;

          ctx.moveTo(link.source.x!, link.source.y!);
          ctx.lineTo(link.target.x!, link.target.y!);
          drewAny = true;
        }
        if (drewAny) ctx.stroke();
      }

      for (const link of links) {
        if (link.type !== 'data-flow' || !link.directed) continue;
        if (!visibleNodeIds.has(link.source.id) || !visibleNodeIds.has(link.target.id)) continue;

        const isConnected =
          selectedNode &&
          (link.source.id === selectedNode.id || link.target.id === selectedNode.id);
        ctx.fillStyle = isConnected ? 'rgba(245, 158, 11, 0.9)' : 'rgba(245, 158, 11, 0.25)';

        const targetSize = link.target.size || 8;
        const arrowSize = Math.max(6, 10 / k);
        drawArrow(
          ctx,
          link.source.x!,
          link.source.y!,
          link.target.x!,
          link.target.y!,
          targetSize + 2,
          arrowSize
        );
      }
    }

    for (const node of visibleNodes) {
      const isHovered = hoveredNode && node.id === hoveredNode.id;
      const isSelected = selectedNode && node.id === selectedNode.id;
      const isSearchMatch = searchTerm !== '' && searchResults.has(node.id);
      const isConnected = selectedNode ? connectedToSelected.has(node.id) : false;

      let isRelevant = true;
      if (searchTerm !== '') {
        isRelevant = isSearchMatch;
      } else if (selectedNode) {
        isRelevant = isSelected || isConnected;
      } else if (selectedPrimitive) {
        isRelevant = node.primitives?.includes(selectedPrimitive) ?? false;
      }

      const useColor =
        selectedPrimitive && node.primitives?.includes(selectedPrimitive)
          ? getPrimitiveColor(selectedPrimitive)
          : node.color;
      ctx.fillStyle = useColor;
      ctx.globalAlpha = isRelevant ? (isHovered ? 1.0 : 0.9) : 0.1;

      const size = isHovered || isSelected ? node.size * 1.2 : node.size;

      if (node.type === 'principle') {
        drawDiamond(ctx, node.x!, node.y!, size);
        ctx.fill();

        ctx.globalAlpha = isRelevant ? 0.3 : 0.05;
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2 / currentTransform.k;
        drawDiamond(ctx, node.x!, node.y!, size + 3 / currentTransform.k);
        ctx.stroke();

        ctx.globalAlpha = isRelevant ? (isHovered ? 1.0 : 0.9) : 0.1;
      } else {
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
        ctx.fill();
      }

      if (node.type === 'system') {
        ctx.globalAlpha = isRelevant ? 1.0 : 0.15;

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.5 / currentTransform.k;
        ctx.setLineDash([4 / currentTransform.k, 3 / currentTransform.k]);
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, size + (2 / currentTransform.k), 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
        ctx.lineWidth = 1.5 / currentTransform.k;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, size - (2 / currentTransform.k), 0, 2 * Math.PI);
        ctx.stroke();

        ctx.globalAlpha = isRelevant ? (isHovered ? 1.0 : 0.9) : 0.1;
      }

      if (node.categories && node.categories.length > 1) {
        const ringWidth = 2 / currentTransform.k;
        let currentRadius = size;

        for (let i = 1; i < node.categories.length; i++) {
          const cat = node.categories[i];
          ctx.strokeStyle = getCategoryColor(cat);
          ctx.lineWidth = ringWidth;

          currentRadius += ringWidth;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, currentRadius, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }

      if (isSearchMatch && !isSelected) {
        const searchRingRadius =
          size +
          (node.categories ? (node.categories.length - 1) * (2 / currentTransform.k) : 0) +
          (3 / currentTransform.k);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / currentTransform.k;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, searchRingRadius, 0, 2 * Math.PI);
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }

  let initialFitDone = false;
  let renderScheduled = false;
  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      render();
    });
  }

  graph.onTick(() => {
    if (!initialFitDone) {
      initialFitDone = true;
      fitToView();
      return;
    }
    scheduleRender();
  });

  return { render };
}

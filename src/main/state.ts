import type { SimNode } from '../graph';
import type { PrimitiveName } from '../types';

export type MainState = {
  currentTransform: { x: number; y: number; k: number };
  hoveredNode: SimNode | null;
  selectedNode: SimNode | null;
  connectedToSelected: Set<string>;
  activeCategories: Set<string>;
  showIssues: boolean;
  showSystems: boolean;
  showPrinciples: boolean;
  showPrimitives: boolean;
  showDataFlows: boolean;
  selectedPrimitive: PrimitiveName | null;
  showClusters: boolean;
  searchTerm: string;
  searchResults: Set<string>;
  tableSortColumn: string | null;
  tableSortDirection: 'asc' | 'desc';
};

export function initializeMainState(): MainState {
  let currentTransform = { x: 0, y: 0, k: 1 };
  let hoveredNode: SimNode | null = null;
  let selectedNode: SimNode | null = null;
  let connectedToSelected = new Set<string>();

  const activeCategories = new Set<string>([
    'Existential',
    'Economic',
    'Social',
    'Political',
    'Environmental',
    'Security',
    'Technological',
    'Cultural',
    'Infrastructure',
  ]);

  let showIssues = true;
  let showSystems = false;
  let showPrinciples = false;
  let showPrimitives = false;
  let showDataFlows = false;

  let selectedPrimitive: PrimitiveName | null = null;
  let showClusters = false;

  let searchTerm = '';
  let searchResults = new Set<string>();

  let tableSortColumn: string | null = null;
  let tableSortDirection: 'asc' | 'desc' = 'asc';

  return {
    currentTransform,
    hoveredNode,
    selectedNode,
    connectedToSelected,
    activeCategories,
    showIssues,
    showSystems,
    showPrinciples,
    showPrimitives,
    showDataFlows,
    selectedPrimitive,
    showClusters,
    searchTerm,
    searchResults,
    tableSortColumn,
    tableSortDirection,
  };
}

#!/usr/bin/env node
import { attachResetHandler, attachTabNavigation, createResizeCanvas } from '../src/main/layoutControls';

class FakeClassList {
  private classes = new Set<string>();

  add(value: string) {
    this.classes.add(value);
  }

  remove(value: string) {
    this.classes.delete(value);
  }

  contains(value: string) {
    return this.classes.has(value);
  }
}

class FakeButton {
  classList = new FakeClassList();
  private handler: (() => void) | null = null;

  addEventListener(event: string, cb: () => void) {
    if (event === 'click') this.handler = cb;
  }

  click() {
    this.handler?.();
  }
}

const canvas = { width: 0, height: 0 } as HTMLCanvasElement;
let restartCalled = 0;
let renderCalled = 0;

const resizeCanvas = createResizeCanvas({
  canvas,
  graph: { restart: () => restartCalled++ } as unknown as { restart: () => void },
  render: () => renderCalled++,
  getViewportSize: () => ({ width: 120, height: 80 }),
  header: { offsetHeight: 10 } as HTMLElement,
  filterBar: { offsetHeight: 5 } as HTMLElement,
});

resizeCanvas();

if (canvas.width !== 120 || canvas.height !== 65) {
  throw new Error('createResizeCanvas did not size canvas correctly.');
}
if (restartCalled !== 1 || renderCalled !== 1) {
  throw new Error('createResizeCanvas did not call restart/render.');
}

const resetBtn = new FakeButton();
const detailPanel = { classList: new FakeClassList() } as unknown as HTMLElement;
const categoryButton = new FakeButton();
const categoryButtonTwo = new FakeButton();
const searchInput = { value: 'test' } as HTMLInputElement;
const searchResults = new Set(['a', 'b']);
const activeCategories = new Set(['old']);

let searchTerm = 'old';
let selectedNode: { id: string; type: string } | null = { id: 'x', type: 'issue' };
let fitToViewCalled = 0;

const originalSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = ((fn: () => void) => {
  fn();
  return 0 as unknown as NodeJS.Timeout;
}) as typeof setTimeout;

attachResetHandler({
  resetBtn: resetBtn as unknown as HTMLButtonElement,
  graph: { restart: () => restartCalled++ } as unknown as { restart: () => void },
  fitToView: () => fitToViewCalled++,
  activeCategories,
  getCategoryKeys: () => ['a', 'b'],
  getCategoryButtons: () => [categoryButton as unknown as HTMLElement, categoryButtonTwo as unknown as HTMLElement],
  getSearchInput: () => searchInput,
  searchResults,
  setSearchTerm: (value) => {
    searchTerm = value;
  },
  setSelectedNode: (value) => {
    selectedNode = value as typeof selectedNode;
  },
  detailPanel,
  render: () => renderCalled++,
});

resetBtn.click();

globalThis.setTimeout = originalSetTimeout;

if (fitToViewCalled !== 1) {
  throw new Error('attachResetHandler did not call fitToView.');
}
if (searchTerm !== '' || searchInput.value !== '') {
  throw new Error('attachResetHandler did not clear search.');
}
if (searchResults.size !== 0) {
  throw new Error('attachResetHandler did not clear search results.');
}
if (!activeCategories.has('a') || !activeCategories.has('b') || activeCategories.size !== 2) {
  throw new Error('attachResetHandler did not reset categories.');
}
if (!detailPanel.classList.contains('hidden')) {
  throw new Error('attachResetHandler did not hide detail panel.');
}
if (selectedNode !== null) {
  throw new Error('attachResetHandler did not clear selection.');
}

const routerCalls: Array<{ type: string; args: string[] }> = [];
const router = {
  navigateToView: (view: string) => routerCalls.push({ type: 'view', args: [view] }),
  navigateToArticle: (kind: string, id: string) => routerCalls.push({ type: 'article', args: [kind, id] }),
} as unknown as { navigateToView: (view: string) => void; navigateToArticle: (kind: string, id: string) => void };

const tabGraph = new FakeButton();
const tabTable = new FakeButton();
const tabWiki = new FakeButton();
const tabAgents = new FakeButton();
detailPanel.classList.remove('hidden');
selectedNode = { id: 'issue-1', type: 'issue' };

attachTabNavigation({
  tabGraph: tabGraph as unknown as HTMLButtonElement,
  tabTable: tabTable as unknown as HTMLButtonElement,
  tabWiki: tabWiki as unknown as HTMLButtonElement,
  tabAgents: tabAgents as unknown as HTMLButtonElement,
  router: router as unknown as { navigateToView: (view: string) => void; navigateToArticle: (kind: string, id: string) => void },
  getSelectedNode: () => selectedNode as unknown as { id: string; type: string } | null,
  setSelectedNode: (value) => {
    selectedNode = value as typeof selectedNode;
  },
  detailPanel,
});

tabGraph.click();
tabTable.click();
tabAgents.click();
tabWiki.click();

if (!detailPanel.classList.contains('hidden')) {
  throw new Error('attachTabNavigation did not hide detail panel.');
}
if (selectedNode !== null) {
  throw new Error('attachTabNavigation did not clear selection for wiki.');
}

tabWiki.click();

const calls = routerCalls.map((entry) => entry.type + ':' + entry.args.join(','));
const expected = [
  'view:graph',
  'view:table',
  'view:agents',
  'article:issue,issue-1',
  'view:wiki',
];

for (let i = 0; i < expected.length; i++) {
  if (calls[i] !== expected[i]) {
    throw new Error(`attachTabNavigation call mismatch at ${i}: ${calls[i]} vs ${expected[i]}`);
  }
}

console.log('main layout controls test passed.');

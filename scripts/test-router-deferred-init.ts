#!/usr/bin/env node
/**
 * Regression test for the S1 crash: non-root routes aborted the whole app.
 *
 * main.ts declares `let renderWikiList` / `let renderTable` uninitialized and
 * only assigns them a few hundred lines after it constructs the router.
 * ArticleRouter used to fire the initial route from its constructor, so a first
 * load of #/wiki, #/wiki/<slug>, #/table or #/communities reached a renderer
 * that did not exist yet. The TypeError escaped main(), so everything after the
 * router call was skipped and those views stayed dead for the whole session.
 *
 * The stubs below mirror main.ts's real wiring, including the fact that view
 * routes render *through* showView (viewController) rather than through the
 * router's own renderWikiList call.
 */
import assert from 'node:assert';
import { createRouter } from '../src/main/router';
import type { ViewType } from '../src/article';
import type { GraphData } from '../src/types';

function installGlobals(hash: string) {
  (globalThis as { window?: unknown }).window = {
    location: { hash },
    addEventListener: () => {},
  };
  // The route callback hides the tooltip before dispatching.
  (globalThis as { document?: unknown }).document = {
    getElementById: () => null,
  };
}

const data = {
  nodes: [],
  edges: [],
  metadata: { generatedAt: '', issueCount: 0, systemCount: 0, edgeCount: 0 },
} as unknown as GraphData;

const ROUTES = ['#/wiki', '#/wiki/some-issue', '#/communities', '#/table'];

for (const hash of ROUTES) {
  installGlobals(hash);

  // Undefined until the renderers are wired, exactly as in main().
  let wikiRenderer: (() => void) | undefined;
  let tableRenderer: (() => void) | undefined;
  let renders = 0;

  const router = createRouter({
    data,
    resolveIssueId: (id: string) => id,
    // Mirrors viewController: showView drives the per-view renderer.
    showView: (view: ViewType) => {
      if (view === 'wiki' || view === 'communities') (wikiRenderer as () => void)();
      if (view === 'table') (tableRenderer as () => void)();
    },
    // main.ts passes this same arrow wrapper, which is why a truthiness guard
    // inside the router could never detect the uninitialized binding.
    renderWikiList: () => {
      (wikiRenderer as () => void)();
    },
    setSelectedWikiArticle: () => {},
    setSelectedCommunity: () => {},
    setWikiSection: () => {},
  });

  assert.equal(renders, 0, `${hash}: initial route must not fire before start()`);

  // The renderers come online, as they do at the end of main().
  wikiRenderer = () => {
    renders++;
  };
  tableRenderer = () => {
    renders++;
  };

  router.start();
  assert.ok(renders > 0, `${hash}: start() must fire the deferred initial route`);

  const afterFirst = renders;
  router.start();
  assert.equal(renders, afterFirst, `${hash}: start() must be idempotent`);
}

console.log(`test-router-deferred-init: ok (${ROUTES.length} routes)`);

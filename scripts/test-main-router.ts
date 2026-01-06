#!/usr/bin/env node
import { createRouter } from '../src/main/router';

const router = createRouter({
  data: {
    nodes: [],
    edges: [],
    metadata: { generatedAt: '', issueCount: 0, systemCount: 0, edgeCount: 0 },
  },
  resolveIssueId: (id: string) => id,
  showView() {},
  renderWikiList() {},
  setSelectedWikiArticle() {},
  setSelectedCommunity() {},
  setWikiSection() {},
  routerFactory: () => ({
    navigateToView() {},
    getCurrentRoute() {
      return null;
    },
  }),
});

if (!router || typeof router.getCurrentRoute !== 'function') {
  throw new Error('Expected createRouter to return a router instance.');
}

console.log('main router test passed.');

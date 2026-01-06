import { ArticleRouter, type RouteType, type ViewType } from '../article';
import type { GraphData } from '../types';

type RouterDeps = {
  data: GraphData;
  resolveIssueId: (id: string) => string;
  showView: (view: ViewType) => void;
  renderWikiList: () => void;
  setSelectedWikiArticle: (value: string | null) => void;
  setSelectedCommunity: (value: string | null) => void;
  setWikiSection: (value: 'articles' | 'communities') => void;
  routerFactory?: (onRouteChange: (route: RouteType) => void) => ArticleRouter;
};

export function createRouter({
  data,
  resolveIssueId,
  showView,
  renderWikiList,
  setSelectedWikiArticle,
  setSelectedCommunity,
  setWikiSection,
  routerFactory,
}: RouterDeps) {
  const factory = routerFactory ?? ((onRouteChange: (route: RouteType) => void) => new ArticleRouter(onRouteChange));

  const router = factory((route: RouteType) => {
    const tooltipEl = document.getElementById('tooltip');
    if (tooltipEl) tooltipEl.classList.add('hidden');

    if (!route) {
      showView('graph');
      return;
    }

    if (route.kind === 'view') {
      if (route.view === 'wiki') {
        setSelectedWikiArticle(null);
        setSelectedCommunity(null);
        setWikiSection('articles');
      }
      if (route.view === 'communities') {
        setSelectedCommunity(null);
        setSelectedWikiArticle(null);
        setWikiSection('communities');
      }
      showView(route.view);
      return;
    }

    if (route.kind === 'article') {
      const current = data.articles?.[route.slug];
      const mergedInto =
        typeof current?.frontmatter?.mergedInto === 'string' ? current.frontmatter.mergedInto.trim() : '';
      if (mergedInto && data.articles?.[mergedInto]) {
        window.location.hash = '#/wiki/' + mergedInto;
        return;
      }

      if (route.type === 'issue') {
        const resolved = resolveIssueId(route.slug);
        if ((!data.articles || !data.articles[route.slug]) && resolved !== route.slug && data.articles?.[resolved]) {
          window.location.hash = '#/wiki/' + resolved;
          return;
        }
      }

      setSelectedWikiArticle(route.slug);
      setSelectedCommunity(null);
      setWikiSection('articles');
      showView('wiki');
      if (renderWikiList) renderWikiList();
      return;
    }

    if (route.kind === 'community') {
      setSelectedCommunity(route.slug);
      setSelectedWikiArticle(null);
      setWikiSection('communities');
      showView('communities');
      if (renderWikiList) renderWikiList();
    }
  });

  return router;
}

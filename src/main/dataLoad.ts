import type { GraphData } from '../types';

type DataLoadResult = {
  data: GraphData;
  dataLoadError: string | null;
  /**
   * Resolves once `data.articles` has been populated. The graph renders without
   * it; anything that reads article prose should wait on this first.
   */
  articlesReady: Promise<void>;
};

type WarningOptions = {
  warningBanner: HTMLElement | null;
  dataLoadError: string | null;
  data: GraphData;
  protocol?: string;
};

/**
 * Load the graph first, then the articles.
 *
 * These used to be one 18 MB `data.json`, of which `articles` was ~84%. The
 * graph is the landing view and does not draw a single character of that
 * prose, so it blocked the first paint for nothing. `graph.json` is ~143 KB
 * over the wire; `articles.json` follows without blocking.
 */
export async function loadGraphData(fetcher: typeof fetch = fetch): Promise<DataLoadResult> {
  let data: GraphData;
  let dataLoadError: string | null = null;

  try {
    const response = await fetcher('/graph.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    }
    data = (await response.json()) as GraphData;
  } catch (err) {
    dataLoadError = (err instanceof Error ? err.message : String(err)) || 'Unknown error';
    console.warn(`[Shadow Workipedia] Failed to load /graph.json: ${dataLoadError}`);
    const now = new Date().toISOString();
    data = {
      nodes: [],
      edges: [],
      metadata: {
        generatedAt: now,
        issueCount: 0,
        systemCount: 0,
        edgeCount: 0,
      },
    };
    // No graph means no article view worth waiting for.
    return { data, dataLoadError, articlesReady: Promise.resolve() };
  }

  // Deliberately not awaited: every article consumer already guards on
  // `data.articles` being absent, so the app stays correct while this is in
  // flight and simply gains content when it lands.
  const articlesReady = (async () => {
    try {
      const response = await fetcher('/articles.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
      }
      data.articles = (await response.json()) as GraphData['articles'];
    } catch (err) {
      const message = (err instanceof Error ? err.message : String(err)) || 'Unknown error';
      console.warn(`[Shadow Workipedia] Failed to load /articles.json: ${message}`);
    }
  })();

  return { data, dataLoadError, articlesReady };
}

export function createIssueIdResolver(data: GraphData) {
  return (id: string) => {
    const redirects = data.issueIdRedirects;
    if (!redirects) return id;

    let current = id;
    const visited = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const next = redirects[current];
      if (!next || next === current) return current;
      if (visited.has(current)) return current;
      visited.add(current);
      current = next;
    }
    return current;
  };
}

export function applyDataLoadWarning({
  warningBanner,
  dataLoadError,
  data,
  protocol,
}: WarningOptions) {
  if (!warningBanner) return;

  if (dataLoadError) {
    warningBanner.classList.remove('hidden');
    const resolvedProtocol =
      protocol ?? (typeof window !== 'undefined' ? window.location.protocol : 'http:');
    const extra =
      resolvedProtocol === 'file:'
        ? ' You appear to be opening the site via <code>file://</code>; use <code>pnpm dev</code> or <code>pnpm preview</code> instead.'
        : '';
    warningBanner.innerHTML = `No <code>/data.json</code> found. Run <code>pnpm -C shadow-workipedia extract-data</code> (or <code>pnpm -C shadow-workipedia build:full</code>) then reload.${extra}`;
  } else if (data.nodes.length === 0) {
    warningBanner.classList.remove('hidden');
    warningBanner.innerHTML = 'Loaded <code>/data.json</code> but it contains 0 nodes. Re-run <code>pnpm -C shadow-workipedia extract-data</code> and reload.';
  } else {
    warningBanner.classList.add('hidden');
    warningBanner.textContent = '';
  }
}

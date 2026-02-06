import assert from 'node:assert/strict';
import { ArticleRouter } from '../src/article';

type Route = ReturnType<ArticleRouter['getCurrentRoute']>;

function runRoute(hash: string): Route {
  const listeners = new Map<string, () => void>();
  const locationState = {
    _hash: hash,
    pathname: '/',
    search: '',
  } as {
    _hash: string;
    pathname: string;
    search: string;
    hash: string;
  };

  Object.defineProperty(locationState, 'hash', {
    get() {
      return locationState._hash;
    },
    set(value: string) {
      locationState._hash = value;
      const handler = listeners.get('hashchange');
      if (handler) handler();
    },
    configurable: true,
  });

  const win = {
    location: locationState,
    addEventListener: (event: string, cb: () => void) => {
      listeners.set(event, cb);
    },
  };

  (globalThis as { window: unknown }).window = win as unknown;

  let captured: Route = null;
  const router = new ArticleRouter((route) => {
    captured = route;
  });

  assert.ok(router);
  return captured;
}

const cases: Array<{ hash: string; expectedView: 'agents' }> = [
  { hash: '#/wasm', expectedView: 'agents' },
  { hash: '#/wasm/abc123', expectedView: 'agents' },
  { hash: '#/wasm?seed=abc123', expectedView: 'agents' },
];

for (const c of cases) {
  const route = runRoute(c.hash);
  assert.deepEqual(route, { kind: 'view', view: c.expectedView }, `Expected ${c.hash} -> ${c.expectedView}`);
}

console.log('test-router-wasm: ok');

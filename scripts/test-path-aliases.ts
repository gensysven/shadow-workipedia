import assert from 'node:assert/strict';
import { getAgentsHashFromPath } from '../src/main/pathAliases';

const cases = [
  { pathname: '/agents', hash: '', expected: '#/agents' },
  { pathname: '/agents/seed123', hash: '', expected: '#/agents/seed123' },
  { pathname: '/wasm', hash: '', expected: '#/agents' },
  { pathname: '/wasm/seed123', hash: '', expected: '#/agents/seed123' },
  { pathname: '/agents', hash: '#/wiki', expected: null },
  { pathname: '/wiki', hash: '', expected: null },
];

for (const c of cases) {
  const actual = getAgentsHashFromPath(c.pathname, c.hash);
  assert.equal(actual, c.expected, `Expected ${c.pathname} (${c.hash}) -> ${String(c.expected)}, got ${String(actual)}`);
}

console.log('test-path-aliases: ok');

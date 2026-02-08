import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/agentsView/renderAgent.ts', import.meta.url), 'utf8');

assert.match(
  src,
  /data-agent-trace-copy/,
  'Generation trace UI must expose a copy control marker (data-agent-trace-copy).',
);

assert.match(
  src,
  /<button[^>]*(data-agent-trace-copy[^>]*class="[^"]*agents-btn|class="[^"]*agents-btn[^"]*"[^>]*data-agent-trace-copy)/,
  'Generation trace copy control must use Agents button styling (agents-btn).',
);

console.log('test-generation-trace-copy: ok');

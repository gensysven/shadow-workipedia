import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderSrc = readFileSync(new URL('../src/agentsView/renderAgent.ts', import.meta.url), 'utf8');
const styleSrc = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

assert.match(
  renderSrc,
  /<details[^>]*(data-agents-details="profile:data:deepSim"[^>]*agent-card-span12|agent-card-span12[^>]*data-agents-details="profile:data:deepSim")/,
  'Data tab deep sim preview should span full width (agent-card-span12).',
);

assert.match(
  renderSrc,
  /class="agent-trace[^\"]*agent-card-span12/,
  'Generation trace should span full width in data tab (agent-card-span12).',
);

assert.match(
  styleSrc,
  /\.agents-main\s*\{[\s\S]*scrollbar-gutter:\s*stable/,
  'Agents main pane should reserve scrollbar gutter to prevent horizontal layout shifts.',
);

console.log('test-agent-data-layout: ok');

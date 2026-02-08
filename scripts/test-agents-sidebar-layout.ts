import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

function cssBlock(selector: string): string {
  const pattern = new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = css.match(pattern);
  assert.ok(match?.[1], `Missing CSS block for ${selector}`);
  return match[1];
}

const agentsBody = cssBlock('.agents-body');
assert.match(agentsBody, /flex-direction:\s*row\s*;/, 'Desktop .agents-body must be row (sidebar + main)');

const agentsSidebar = cssBlock('.agents-sidebar');
assert.match(agentsSidebar, /width:\s*3[0-9]{2}px\s*;/, 'Desktop .agents-sidebar should have fixed pixel width');

console.log('test-agents-sidebar-layout: ok');

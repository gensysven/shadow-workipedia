#!/usr/bin/env node
/**
 * Generate a deterministic batch of agents and print as JSON.
 *
 * Example:
 *   npx tsx scripts/generate-agents-json.ts --count 100 --asOfYear 2025 --seedPrefix review > /tmp/agents.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateAgent, type AgentVocabV1, type AgentPriorsV1, type ShadowCountryMapEntry } from '../src/agent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadJsonFile<T>(relativePath: string): T {
  const fullPath = resolve(__dirname, '..', relativePath);
  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as T;
}

function getArgValue(args: string[], name: string): string | null {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const v = args[idx + 1];
  if (!v || v.startsWith('--')) return null;
  return v;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function parseIntArg(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function printUsageAndExit(): never {
  // stdout only for JSON; usage goes to stderr.
  console.error(
    [
      'Usage: npx tsx scripts/generate-agents-json.ts [options]',
      '',
      'Options:',
      '  --count <n>         Number of agents (default 100)',
      '  --asOfYear <year>   Year for age calculations (default 2025)',
      '  --seedPrefix <str>  Seed prefix (default "review")',
      '  --startIndex <n>    Starting index (default 0)',
      '  --out <path>        Write JSON to file instead of stdout',
      '  --includeTrace      Include agent trace data (default false)',
      '  --help              Show this help',
    ].join('\n')
  );
  process.exit(2);
}

const args = process.argv.slice(2);
if (hasFlag(args, '--help')) printUsageAndExit();

const count = Math.max(1, Math.min(10_000, parseIntArg(getArgValue(args, '--count'), 100)));
const asOfYear = Math.max(1900, Math.min(2100, parseIntArg(getArgValue(args, '--asOfYear'), 2025)));
const seedPrefix = getArgValue(args, '--seedPrefix') ?? 'review';
const startIndex = Math.max(0, parseIntArg(getArgValue(args, '--startIndex'), 0));
const outPath = getArgValue(args, '--out');
const includeTrace = hasFlag(args, '--includeTrace');

const vocab = loadJsonFile<AgentVocabV1>('public/agent-vocab.v1.json');
const priors = loadJsonFile<AgentPriorsV1>('public/agent-priors.v1.json');
const shadowMap = loadJsonFile<ShadowCountryMapEntry[]>('public/shadow-country-map.json');
const countries = shadowMap.filter(c => c.iso3 && c.iso3.length === 3);

const agents = [];
for (let i = 0; i < count; i++) {
  const n = startIndex + i;
  const seed = `${seedPrefix}-${String(n).padStart(3, '0')}`;
  const agent = generateAgent({
    seed,
    vocab,
    priors,
    countries,
    asOfYear,
    includeTrace,
  });
  agents.push(agent);
}

const json = JSON.stringify(agents, null, 2);
if (outPath) {
  writeFileSync(resolve(process.cwd(), outPath), json + '\n', 'utf-8');
} else {
  process.stdout.write(json + '\n');
}

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  generateAgent,
  type AgentVocabV1,
  type AgentPriorsV1,
  type ShadowCountryMapEntry,
} from '../src/agent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const vocabPath = resolve(__dirname, '..', 'public', 'agent-vocab.v1.json');
const priorsPath = resolve(__dirname, '..', 'public', 'agent-priors.v1.json');
const countryMapPath = resolve(__dirname, '..', 'public', 'shadow-country-map.json');

const vocab = JSON.parse(readFileSync(vocabPath, 'utf-8')) as AgentVocabV1;
const priors = JSON.parse(readFileSync(priorsPath, 'utf-8')) as AgentPriorsV1;
const shadowMap = JSON.parse(readFileSync(countryMapPath, 'utf-8')) as ShadowCountryMapEntry[];
const countries = shadowMap.filter(c => c.iso3 && c.iso3.length === 3);

// Focus on agents with owned or stable-rental housing
const stableAgents: { cosmo: number; frug: number; isOwned: number }[] = [];

for (let i = 0; i < 1000; i++) {
  const agent = generateAgent({ seed: 'stable-' + i, vocab, priors, countries, includeTrace: true });
  const housing = agent.home?.housingStability;
  if (housing !== 'owned' && housing !== 'stable-rental') continue;

  const latents = (agent as any).generationTrace?.latents?.values;
  const cosmo = latents?.cosmopolitanism ?? 500;
  const frug = latents?.frugality ?? 500;
  const isOwned = housing === 'owned' ? 1 : 0;

  stableAgents.push({ cosmo, frug, isOwned });
}

console.log(`Agents with stable housing: ${stableAgents.length}`);

function corr(a: number[], b: number[]): number {
  const n = a.length;
  const meanA = a.reduce((s, x) => s + x, 0) / n;
  const meanB = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const dA = a[i] - meanA;
    const dB = b[i] - meanB;
    num += dA * dB;
    denA += dA * dA;
    denB += dB * dB;
  }
  return num / Math.sqrt(denA * denB);
}

// Correlations among stable housing only (owned vs rental)
console.log('\n=== Among STABLE housing only ===');
console.log('Cosmo ↔ Owned (expect negative - cosmopolitan prefer rental flexibility):',
  corr(stableAgents.map(s => s.cosmo), stableAgents.map(s => s.isOwned)).toFixed(3));
console.log('Frug ↔ Owned (expect positive - frugal save for down payment):',
  corr(stableAgents.map(s => s.frug), stableAgents.map(s => s.isOwned)).toFixed(3));

// Check ownership rates by quartile
const sortedByCosmo = [...stableAgents].sort((a, b) => a.cosmo - b.cosmo);
const sortedByFrug = [...stableAgents].sort((a, b) => a.frug - b.frug);

const n = stableAgents.length;
const q = Math.floor(n / 4);

console.log('\n=== Ownership rate by cosmo quartile ===');
console.log('Q1 (low):', (sortedByCosmo.slice(0, q).reduce((s, x) => s + x.isOwned, 0) / q * 100).toFixed(1) + '%');
console.log('Q4 (high):', (sortedByCosmo.slice(n - q).reduce((s, x) => s + x.isOwned, 0) / q * 100).toFixed(1) + '%');

console.log('\n=== Ownership rate by frugality quartile ===');
console.log('Q1 (low):', (sortedByFrug.slice(0, q).reduce((s, x) => s + x.isOwned, 0) / q * 100).toFixed(1) + '%');
console.log('Q4 (high):', (sortedByFrug.slice(n - q).reduce((s, x) => s + x.isOwned, 0) / q * 100).toFixed(1) + '%');

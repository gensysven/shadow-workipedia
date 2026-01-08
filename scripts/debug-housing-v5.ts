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

// Map housing stability to numeric
const housingMap: Record<string, number> = {
  owned: 4,
  'stable-rental': 3,
  tenuous: 2,
  transient: 1,
  'couch-surfing': 0,
  institutional: 2,
};

// Map household composition to size
function computeHouseholdSize(composition: string): number {
  const sizeMap: Record<string, number> = {
    alone: 1,
    partner: 2,
    roommates: 3,
    'partner-and-kids': 4,
    'extended-family': 6,
    multigenerational: 7,
  };
  return sizeMap[composition] ?? 2;
}

// Sample agents
const samples: {
  housingStabilityNumeric: number;
  frugality: number;
  cosmo: number;
  householdSize: number;
}[] = [];

for (let i = 0; i < 1000; i++) {
  const agent = generateAgent({ seed: 'hv5-' + i, vocab, priors, countries, includeTrace: true });
  const housing = agent.home?.housingStability ?? 'tenuous';
  const housingStabilityNumeric = housingMap[housing] ?? 2;
  const latents = (agent as any).generationTrace?.latents?.values;
  const frugality = latents?.frugality ?? 500;
  const cosmo = latents?.cosmopolitanism ?? 500;
  const householdComposition = agent.home?.householdComposition ?? 'alone';
  const householdSize = computeHouseholdSize(householdComposition);

  samples.push({
    housingStabilityNumeric,
    frugality,
    cosmo,
    householdSize,
  });
}

// Compute Pearson correlations
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

console.log('=== FULL SAMPLE (n=1000) ===');
console.log('#H1 Household Size ↔ Housing Stability:', corr(
  samples.map(s => s.householdSize),
  samples.map(s => s.housingStabilityNumeric)
).toFixed(3));

console.log('#H3 Cosmopolitanism ↔ Housing Stability:', corr(
  samples.map(s => s.cosmo),
  samples.map(s => s.housingStabilityNumeric)
).toFixed(3));

console.log('#H4 Frugality ↔ Housing Stability:', corr(
  samples.map(s => s.frugality),
  samples.map(s => s.housingStabilityNumeric)
).toFixed(3));

// Household size by housing
console.log('\n=== Housing by household size ===');
const sizeGroups: Record<number, { sum: number; count: number }> = {};
for (const s of samples) {
  if (!sizeGroups[s.householdSize]) sizeGroups[s.householdSize] = { sum: 0, count: 0 };
  sizeGroups[s.householdSize].sum += s.housingStabilityNumeric;
  sizeGroups[s.householdSize].count += 1;
}
for (const size of Object.keys(sizeGroups).map(Number).sort((a, b) => a - b)) {
  const group = sizeGroups[size];
  console.log(`Size ${size}: mean housing = ${(group.sum / group.count).toFixed(2)} (n=${group.count})`);
}

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

const housingMap: Record<string, number> = {
  owned: 4,
  'stable-rental': 3,
  tenuous: 2,
  transient: 1,
  'couch-surfing': 0,
  institutional: 2,
};

function computeHouseholdSize(composition: string): number {
  const sizeMap: Record<string, number> = {
    alone: 1, partner: 2, roommates: 3,
    'partner-and-kids': 4, 'extended-family': 6, multigenerational: 7,
  };
  return sizeMap[composition] ?? 2;
}

const samples: {
  estimatedSize: number;
  actualSize: number;
  housingNumeric: number;
  marital: string;
  dependents: number;
  composition: string;
}[] = [];

for (let i = 0; i < 500; i++) {
  const agent = generateAgent({ seed: 'h1-' + i, vocab, priors, countries });
  const isMarried = agent.family?.maritalStatus === 'married' || agent.family?.maritalStatus === 'partnered';
  const dependents = agent.family?.dependentCount ?? 0;
  const estimatedSize = 1 + (isMarried ? 1 : 0) + dependents;
  const composition = agent.home?.householdComposition ?? 'alone';
  const actualSize = computeHouseholdSize(composition);
  const housingNumeric = housingMap[agent.home?.housingStability ?? 'tenuous'] ?? 2;

  samples.push({
    estimatedSize,
    actualSize,
    housingNumeric,
    marital: agent.family?.maritalStatus ?? 'single',
    dependents,
    composition,
  });
}

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

console.log('Estimated Size ↔ Actual Size:', corr(
  samples.map(s => s.estimatedSize),
  samples.map(s => s.actualSize)
).toFixed(3));

console.log('\n#H1 (using estimatedSize) ↔ Housing:', corr(
  samples.map(s => s.estimatedSize),
  samples.map(s => s.housingNumeric)
).toFixed(3));

console.log('#H1 (using actualSize) ↔ Housing:', corr(
  samples.map(s => s.actualSize),
  samples.map(s => s.housingNumeric)
).toFixed(3));

// Show distribution of compositions for singles vs married with kids
console.log('\n=== Composition by family status ===');
const singlesNoKids = samples.filter(s => s.marital === 'single' && s.dependents === 0);
const marriedWithKids = samples.filter(s => (s.marital === 'married' || s.marital === 'partnered') && s.dependents > 0);

console.log(`Singles no kids (n=${singlesNoKids.length}):`);
const singleDist: Record<string, number> = {};
for (const s of singlesNoKids) singleDist[s.composition] = (singleDist[s.composition] ?? 0) + 1;
console.log(singleDist);

console.log(`Married with kids (n=${marriedWithKids.length}):`);
const marriedDist: Record<string, number> = {};
for (const s of marriedWithKids) marriedDist[s.composition] = (marriedDist[s.composition] ?? 0) + 1;
console.log(marriedDist);

// Show housing by estimated size
console.log('\n=== Housing by estimated size ===');
const estGroups: Record<number, { sum: number; count: number }> = {};
for (const s of samples) {
  if (!estGroups[s.estimatedSize]) estGroups[s.estimatedSize] = { sum: 0, count: 0 };
  estGroups[s.estimatedSize].sum += s.housingNumeric;
  estGroups[s.estimatedSize].count += 1;
}
for (const size of Object.keys(estGroups).map(Number).sort((a, b) => a - b)) {
  const group = estGroups[size];
  console.log(`EstSize ${size}: mean housing = ${(group.sum / group.count).toFixed(2)} (n=${group.count})`);
}

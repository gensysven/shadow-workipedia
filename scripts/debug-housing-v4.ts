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

// Sample agents and check correlations
const samples: {
  housingStabilityNumeric: number;
  frugality: number;
  cosmo: number;
  tier: string;
  age: number;
  hasFamily: boolean;
  riskAppetite: number;
  housing: string;
}[] = [];

for (let i = 0; i < 500; i++) {
  const agent = generateAgent({ seed: 'hv4-' + i, vocab, priors, countries, includeTrace: true });
  const housing = agent.home?.housingStability ?? 'tenuous';
  const housingStabilityNumeric = housingMap[housing] ?? 2;
  const latents = (agent as any).generationTrace?.latents?.values;
  const frugality = latents?.frugality ?? 500;
  const cosmo = latents?.cosmopolitanism ?? 500;
  const riskAppetite = latents?.riskAppetite ?? 500;
  const tier = agent.identity?.tierBand ?? 'middle';
  const birthYear = agent.identity?.birthYear ?? 1990;
  const age = 2025 - birthYear;
  const isMarried = agent.family?.maritalStatus === 'married' || agent.family?.maritalStatus === 'partnered';
  const dependents = agent.family?.dependentCount ?? 0;
  const hasFamily = isMarried && dependents > 0;

  samples.push({
    housingStabilityNumeric,
    frugality,
    cosmo,
    tier,
    age,
    hasFamily,
    riskAppetite,
    housing,
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

console.log('=== FULL SAMPLE (n=500) ===');
console.log('#H3 Cosmopolitanism ↔ Housing Stability:', corr(
  samples.map(s => s.cosmo),
  samples.map(s => s.housingStabilityNumeric)
).toFixed(3));

console.log('#H4 Frugality ↔ Housing Stability:', corr(
  samples.map(s => s.frugality),
  samples.map(s => s.housingStabilityNumeric)
).toFixed(3));

// Quartile analysis
console.log('\n=== Housing distribution by cosmo quartile ===');
const sortedByCosmo = [...samples].sort((a, b) => a.cosmo - b.cosmo);
const cq1 = sortedByCosmo.slice(0, 125);
const cq4 = sortedByCosmo.slice(375, 500);
console.log(`Q1 (low cosmo) mean housing: ${(cq1.reduce((s, x) => s + x.housingStabilityNumeric, 0) / cq1.length).toFixed(3)}`);
console.log(`Q4 (high cosmo) mean housing: ${(cq4.reduce((s, x) => s + x.housingStabilityNumeric, 0) / cq4.length).toFixed(3)}`);
console.log(`Expected: Q4 < Q1 (high cosmo → less stable)`);

console.log('\n=== Housing distribution by frugality quartile ===');
const sortedByFrug = [...samples].sort((a, b) => a.frugality - b.frugality);
const fq1 = sortedByFrug.slice(0, 125);
const fq4 = sortedByFrug.slice(375, 500);
console.log(`Q1 (low frugality) mean housing: ${(fq1.reduce((s, x) => s + x.housingStabilityNumeric, 0) / fq1.length).toFixed(3)}`);
console.log(`Q4 (high frugality) mean housing: ${(fq4.reduce((s, x) => s + x.housingStabilityNumeric, 0) / fq4.length).toFixed(3)}`);
console.log(`Expected: Q4 > Q1 (high frugality → more stable)`);

// Constraint analysis
console.log('\n=== Constraint breakdown ===');
const elite = samples.filter(s => s.tier === 'elite').length;
const family = samples.filter(s => s.hasFamily).length;
const lowRisk = samples.filter(s => s.riskAppetite <= 200).length;
console.log(`Elite tier: ${elite} (${(elite/500*100).toFixed(1)}%)`);
console.log(`Has family: ${family} (${(family/500*100).toFixed(1)}%)`);
console.log(`Low risk appetite ≤200: ${lowRisk} (${(lowRisk/500*100).toFixed(1)}%)`);

// Housing distribution
console.log('\n=== Housing stability distribution ===');
const housingDist: Record<string, number> = {};
for (const s of samples) {
  housingDist[s.housing] = (housingDist[s.housing] ?? 0) + 1;
}
console.log(housingDist);

// Cross-tab: High cosmo with each housing type
console.log('\n=== Housing by cosmo extreme groups ===');
const lowCosmo = samples.filter(s => s.cosmo < 250);
const highCosmo = samples.filter(s => s.cosmo > 750);
console.log(`Low cosmo (<250, n=${lowCosmo.length}) housing distribution:`);
const lowCosmoHousing: Record<string, number> = {};
for (const s of lowCosmo) lowCosmoHousing[s.housing] = (lowCosmoHousing[s.housing] ?? 0) + 1;
console.log(lowCosmoHousing);
console.log(`High cosmo (>750, n=${highCosmo.length}) housing distribution:`);
const highCosmoHousing: Record<string, number> = {};
for (const s of highCosmo) highCosmoHousing[s.housing] = (highCosmoHousing[s.housing] ?? 0) + 1;
console.log(highCosmoHousing);

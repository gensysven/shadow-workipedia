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
}[] = [];

for (let i = 0; i < 500; i++) {
  const agent = generateAgent({ seed: 'hv2-' + i, vocab, priors, countries, includeTrace: true });
  const housingStabilityNumeric = housingMap[agent.home?.housingStability ?? 'tenuous'] ?? 2;
  const latents = (agent as any).generationTrace?.latents?.values;
  const frugality = latents?.frugality ?? 500;
  const cosmo = latents?.cosmopolitanism ?? 500;
  const riskAppetite = latents?.riskAppetite ?? 500;
  const tier = agent.economicPosition?.tierBand ?? 'middle';
  const age = agent.age ?? 35;
  const hasFamily =
    (agent.social?.maritalStatus === 'married' || agent.social?.maritalStatus === 'partnered') &&
    (agent.social?.dependentCount ?? 0) > 0;

  samples.push({
    housingStabilityNumeric,
    frugality,
    cosmo,
    tier,
    age,
    hasFamily,
    riskAppetite
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

console.log('=== FULL SAMPLE ===');
console.log('#H3 Cosmopolitanism ↔ Housing Stability:', corr(
  samples.map(s => s.cosmo),
  samples.map(s => s.housingStabilityNumeric)
).toFixed(3));

console.log('#H4 Frugality ↔ Housing Stability:', corr(
  samples.map(s => s.frugality),
  samples.map(s => s.housingStabilityNumeric)
).toFixed(3));

// Check correlations in subgroups where constraints don't eliminate variance
console.log('\n=== MIDDLE TIER ONLY (no elite hard constraint) ===');
const middleTier = samples.filter(s => s.tier === 'middle');
console.log(`Sample size: ${middleTier.length}`);
console.log('#H3 Cosmo ↔ Housing:', corr(
  middleTier.map(s => s.cosmo),
  middleTier.map(s => s.housingStabilityNumeric)
).toFixed(3));
console.log('#H4 Frugality ↔ Housing:', corr(
  middleTier.map(s => s.frugality),
  middleTier.map(s => s.housingStabilityNumeric)
).toFixed(3));

console.log('\n=== NO FAMILY (no family hard constraint) ===');
const noFamily = samples.filter(s => !s.hasFamily);
console.log(`Sample size: ${noFamily.length}`);
console.log('#H3 Cosmo ↔ Housing:', corr(
  noFamily.map(s => s.cosmo),
  noFamily.map(s => s.housingStabilityNumeric)
).toFixed(3));
console.log('#H4 Frugality ↔ Housing:', corr(
  noFamily.map(s => s.frugality),
  noFamily.map(s => s.housingStabilityNumeric)
).toFixed(3));

console.log('\n=== YOUNG (age < 35) + NO FAMILY + NOT ELITE ===');
const youngSingle = samples.filter(s => s.age < 35 && !s.hasFamily && s.tier !== 'elite');
console.log(`Sample size: ${youngSingle.length}`);
if (youngSingle.length > 30) {
  console.log('#H3 Cosmo ↔ Housing:', corr(
    youngSingle.map(s => s.cosmo),
    youngSingle.map(s => s.housingStabilityNumeric)
  ).toFixed(3));
  console.log('#H4 Frugality ↔ Housing:', corr(
    youngSingle.map(s => s.frugality),
    youngSingle.map(s => s.housingStabilityNumeric)
  ).toFixed(3));
} else {
  console.log('(sample too small)');
}

console.log('\n=== Housing distribution by cosmo quartile ===');
const sortedByCosmo = [...samples].sort((a, b) => a.cosmo - b.cosmo);
const q1 = sortedByCosmo.slice(0, 125);
const q4 = sortedByCosmo.slice(375, 500);
console.log(`Q1 (low cosmo) mean housing: ${(q1.reduce((s, x) => s + x.housingStabilityNumeric, 0) / q1.length).toFixed(2)}`);
console.log(`Q4 (high cosmo) mean housing: ${(q4.reduce((s, x) => s + x.housingStabilityNumeric, 0) / q4.length).toFixed(2)}`);

console.log('\n=== Housing distribution by frugality quartile ===');
const sortedByFrugality = [...samples].sort((a, b) => a.frugality - b.frugality);
const fq1 = sortedByFrugality.slice(0, 125);
const fq4 = sortedByFrugality.slice(375, 500);
console.log(`Q1 (low frugality) mean housing: ${(fq1.reduce((s, x) => s + x.housingStabilityNumeric, 0) / fq1.length).toFixed(2)}`);
console.log(`Q4 (high frugality) mean housing: ${(fq4.reduce((s, x) => s + x.housingStabilityNumeric, 0) / fq4.length).toFixed(2)}`);

// Check housing distribution
console.log('\n=== Housing stability distribution ===');
const housingDist: Record<number, number> = {};
for (const s of samples) {
  housingDist[s.housingStabilityNumeric] = (housingDist[s.housingStabilityNumeric] ?? 0) + 1;
}
console.log(housingDist);

// Check how many are constrained
console.log('\n=== Constraint breakdown ===');
const elite = samples.filter(s => s.tier === 'elite').length;
const family = samples.filter(s => s.hasFamily).length;
const lowRisk = samples.filter(s => s.riskAppetite <= 200).length;
console.log(`Elite tier (hard constraint): ${elite} (${(elite/500*100).toFixed(1)}%)`);
console.log(`Has family (hard constraint): ${family} (${(family/500*100).toFixed(1)}%)`);
console.log(`Low risk appetite ≤200 (hard constraint): ${lowRisk} (${(lowRisk/500*100).toFixed(1)}%)`);

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
  owned: 4, 'stable-rental': 3, tenuous: 2, transient: 1, 'couch-surfing': 0, institutional: 2,
};
const tierMap: Record<string, number> = { elite: 3, middle: 2, mass: 1 };

const samples: {
  tier: number;
  housing: number;
  cosmo: number;
  frugality: number;
  riskAppetite: number;
  age: number;
}[] = [];

for (let i = 0; i < 500; i++) {
  const agent = generateAgent({ seed: 'partial-' + i, vocab, priors, countries, includeTrace: true });
  const latents = (agent as any).generationTrace?.latents?.values;
  const tier = tierMap[agent.identity?.tierBand ?? 'middle'] ?? 2;
  const housing = housingMap[agent.home?.housingStability ?? 'tenuous'] ?? 2;
  const cosmo = latents?.cosmopolitanism ?? 500;
  const frugality = latents?.frugality ?? 500;
  const riskAppetite = latents?.riskAppetite ?? 500;
  const age = 2025 - (agent.identity?.birthYear ?? 1990);
  samples.push({ tier, housing, cosmo, frugality, riskAppetite, age });
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

// Simple correlations
console.log('=== SIMPLE CORRELATIONS ===');
console.log('Cosmo ↔ Housing:', corr(samples.map(s => s.cosmo), samples.map(s => s.housing)).toFixed(3));
console.log('Frugality ↔ Housing:', corr(samples.map(s => s.frugality), samples.map(s => s.housing)).toFixed(3));
console.log('Tier ↔ Housing:', corr(samples.map(s => s.tier), samples.map(s => s.housing)).toFixed(3));
console.log('Tier ↔ Cosmo:', corr(samples.map(s => s.tier), samples.map(s => s.cosmo)).toFixed(3));
console.log('Risk ↔ Housing:', corr(samples.map(s => s.riskAppetite), samples.map(s => s.housing)).toFixed(3));
console.log('Age ↔ Housing:', corr(samples.map(s => s.age), samples.map(s => s.housing)).toFixed(3));

// Stratify by tier to see within-tier effects
console.log('\n=== WITHIN MIDDLE TIER (n=~333) ===');
const middleTier = samples.filter(s => s.tier === 2);
console.log(`Sample size: ${middleTier.length}`);
if (middleTier.length > 50) {
  console.log('Cosmo ↔ Housing:', corr(middleTier.map(s => s.cosmo), middleTier.map(s => s.housing)).toFixed(3));
  console.log('Frugality ↔ Housing:', corr(middleTier.map(s => s.frugality), middleTier.map(s => s.housing)).toFixed(3));
}

console.log('\n=== WITHIN MASS TIER ===');
const massTier = samples.filter(s => s.tier === 1);
console.log(`Sample size: ${massTier.length}`);
if (massTier.length > 50) {
  console.log('Cosmo ↔ Housing:', corr(massTier.map(s => s.cosmo), massTier.map(s => s.housing)).toFixed(3));
  console.log('Frugality ↔ Housing:', corr(massTier.map(s => s.frugality), massTier.map(s => s.housing)).toFixed(3));
}

// Control for tier+age via regression residuals
console.log('\n=== PARTIAL CORRELATIONS (controlling for tier, age, risk) ===');
function residuals(y: number[], predictors: number[][]): number[] {
  // Simple multiple regression residuals
  const n = y.length;
  const k = predictors.length;

  // Calculate means
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  const means = predictors.map(p => p.reduce((a, b) => a + b, 0) / n);

  // Center data
  const yCentered = y.map(v => v - meanY);
  const xCentered = predictors.map((p, j) => p.map(v => v - means[j]));

  // Simple additive model: residual = y - sum(beta_j * x_j)
  // Estimate betas via correlation * (sd_y / sd_x)
  const sdY = Math.sqrt(yCentered.reduce((a, v) => a + v*v, 0) / n);
  const sds = xCentered.map(x => Math.sqrt(x.reduce((a, v) => a + v*v, 0) / n));

  const betas = xCentered.map((x, j) => {
    const cov = x.reduce((a, v, i) => a + v * yCentered[i], 0) / n;
    const r = cov / (sdY * sds[j]);
    return r * (sdY / sds[j]);
  });

  // Compute residuals
  const resids: number[] = [];
  for (let i = 0; i < n; i++) {
    let predicted = 0;
    for (let j = 0; j < k; j++) {
      predicted += betas[j] * xCentered[j][i];
    }
    resids.push(yCentered[i] - predicted);
  }
  return resids;
}

const housingResid = residuals(
  samples.map(s => s.housing),
  [samples.map(s => s.tier), samples.map(s => s.age), samples.map(s => s.riskAppetite)]
);
const cosmoResid = residuals(
  samples.map(s => s.cosmo),
  [samples.map(s => s.tier), samples.map(s => s.age), samples.map(s => s.riskAppetite)]
);
const frugalityResid = residuals(
  samples.map(s => s.frugality),
  [samples.map(s => s.tier), samples.map(s => s.age), samples.map(s => s.riskAppetite)]
);

console.log('Partial Cosmo ↔ Housing:', corr(cosmoResid, housingResid).toFixed(3));
console.log('Partial Frugality ↔ Housing:', corr(frugalityResid, housingResid).toFixed(3));

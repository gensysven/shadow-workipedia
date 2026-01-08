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

const samples: { cosmo: number; frug: number; housing: number }[] = [];

for (let i = 0; i < 300; i++) {
  const agent = generateAgent({ seed: 'trace-' + i, vocab, priors, countries, includeTrace: true });
  const latents = (agent as any).generationTrace?.latents?.values;
  const cosmo = latents?.cosmopolitanism ?? 500;
  const frug = latents?.frugality ?? 500;
  const housing = housingMap[agent.home?.housingStability ?? 'tenuous'] ?? 2;
  samples.push({ cosmo, frug, housing });
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

console.log('Cosmo ↔ Housing:', corr(samples.map(s => s.cosmo), samples.map(s => s.housing)).toFixed(3));
console.log('Frug ↔ Housing:', corr(samples.map(s => s.frug), samples.map(s => s.housing)).toFixed(3));

// Quartile analysis
const sortedByCosmo = [...samples].sort((a, b) => a.cosmo - b.cosmo);
const sortedByFrug = [...samples].sort((a, b) => a.frug - b.frug);

const cq1 = sortedByCosmo.slice(0, 75);
const cq4 = sortedByCosmo.slice(225, 300);
const fq1 = sortedByFrug.slice(0, 75);
const fq4 = sortedByFrug.slice(225, 300);

console.log('\nCosmo quartiles:');
console.log('  Q1 (low) mean housing:', (cq1.reduce((s, x) => s + x.housing, 0) / cq1.length).toFixed(2));
console.log('  Q4 (high) mean housing:', (cq4.reduce((s, x) => s + x.housing, 0) / cq4.length).toFixed(2));

console.log('\nFrug quartiles:');
console.log('  Q1 (low) mean housing:', (fq1.reduce((s, x) => s + x.housing, 0) / fq1.length).toFixed(2));
console.log('  Q4 (high) mean housing:', (fq4.reduce((s, x) => s + x.housing, 0) / fq4.length).toFixed(2));

// Look at extreme cases
console.log('\n5 samples with lowest frugality:');
for (const s of sortedByFrug.slice(0, 5)) {
  console.log(`  frug=${s.frug}, housing=${s.housing}, cosmo=${s.cosmo}`);
}
console.log('\n5 samples with highest frugality:');
for (const s of sortedByFrug.slice(-5)) {
  console.log(`  frug=${s.frug}, housing=${s.housing}, cosmo=${s.cosmo}`);
}

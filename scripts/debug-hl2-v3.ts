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

const samples: {
  viceTendency: number;
  chronicCount: number;
  age: number;
  stress01: number;
}[] = [];

for (let i = 0; i < 500; i++) {
  const agent = generateAgent({ seed: 'hl2v3-' + i, vocab, priors, countries, includeTrace: true });
  const derived = (agent as any).generationTrace?.derived;
  const latents = (agent as any).generationTrace?.latents?.values;

  const viceTendency = derived?.viceTendency ?? 0.5;
  const chronicCount = agent.health?.chronicConditionTags?.length ?? 0;
  const age = 2025 - (agent.identity?.birthYear ?? 1990);
  const stress01 = (latents?.stressReactivity ?? 500) / 1000;

  samples.push({ viceTendency, chronicCount, age, stress01 });
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

console.log('=== Correlations with new 0.35 coefficient ===');
console.log('viceTendency ↔ chronicCount:', corr(
  samples.map(s => s.viceTendency),
  samples.map(s => s.chronicCount)
).toFixed(3));

console.log('stress01 ↔ chronicCount:', corr(
  samples.map(s => s.stress01),
  samples.map(s => s.chronicCount)
).toFixed(3));

console.log('age ↔ chronicCount:', corr(
  samples.map(s => s.age),
  samples.map(s => s.chronicCount)
).toFixed(3));

console.log('\n=== Distributions ===');
console.log('Chronic count distribution:');
const chronicDist: Record<number, number> = {};
for (const s of samples) {
  chronicDist[s.chronicCount] = (chronicDist[s.chronicCount] ?? 0) + 1;
}
console.log(chronicDist);

console.log('\nviceTendency quintiles:');
const sorted = [...samples].sort((a, b) => a.viceTendency - b.viceTendency);
const n = samples.length;
const q = Math.floor(n / 5);
for (let i = 0; i < 5; i++) {
  const subset = sorted.slice(i * q, (i + 1) * q);
  const avgChronic = subset.reduce((s, x) => s + x.chronicCount, 0) / subset.length;
  const vtRange = `${subset[0].viceTendency.toFixed(2)}-${subset[subset.length - 1].viceTendency.toFixed(2)}`;
  console.log(`Q${i + 1} (VT ${vtRange}): avg chronic=${avgChronic.toFixed(2)}`);
}

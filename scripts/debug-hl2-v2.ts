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
  chronicChance: number;
  age: number;
  stress01: number;
  endurance01: number;
}[] = [];

for (let i = 0; i < 500; i++) {
  const agent = generateAgent({ seed: 'hl2v2-' + i, vocab, priors, countries, includeTrace: true });
  const derived = (agent as any).generationTrace?.derived;
  const latents = (agent as any).generationTrace?.latents?.values;
  const aptitudes = agent.capabilities?.aptitudes;

  const viceTendency = derived?.viceTendency ?? 0.5;
  const chronicCount = agent.health?.chronicConditionTags?.length ?? 0;
  const age = 2025 - (agent.identity?.birthYear ?? 1990);
  const stress01 = (latents?.stressReactivity ?? 500) / 1000;
  const endurance01 = (aptitudes?.endurance ?? 500) / 1000;

  // Approximate chronicChance computation
  const tierHealthModifier = agent.identity?.tierBand === 'elite' ? -0.15 : agent.identity?.tierBand === 'mass' ? 0.12 : 0;
  const chronicChance = Math.min(0.65, Math.max(0.04,
    age / 210 +
    0.08 * (1 - endurance01) +
    0.18 * viceTendency +
    0.22 * stress01 +
    tierHealthModifier
  ));

  samples.push({ viceTendency, chronicCount, chronicChance, age, stress01, endurance01 });
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

console.log('=== Raw Correlations ===');
console.log('viceTendency ↔ chronicCount:', corr(
  samples.map(s => s.viceTendency),
  samples.map(s => s.chronicCount)
).toFixed(3));

console.log('chronicChance ↔ chronicCount:', corr(
  samples.map(s => s.chronicChance),
  samples.map(s => s.chronicCount)
).toFixed(3));

console.log('\n=== Distributions ===');
console.log('Chronic count distribution:');
const chronicDist: Record<number, number> = {};
for (const s of samples) {
  chronicDist[s.chronicCount] = (chronicDist[s.chronicCount] ?? 0) + 1;
}
console.log(chronicDist);

console.log('\nviceTendency distribution:');
const vtLow = samples.filter(s => s.viceTendency < 0.33).length;
const vtMed = samples.filter(s => s.viceTendency >= 0.33 && s.viceTendency < 0.66).length;
const vtHigh = samples.filter(s => s.viceTendency >= 0.66).length;
console.log(`Low (<0.33): ${vtLow}, Med (0.33-0.66): ${vtMed}, High (>=0.66): ${vtHigh}`);

console.log('\n=== Cross-tabs: chronicCount by viceTendency tertile ===');
const tertiles = [
  { name: 'Low VT', filter: (s: typeof samples[0]) => s.viceTendency < 0.33 },
  { name: 'Med VT', filter: (s: typeof samples[0]) => s.viceTendency >= 0.33 && s.viceTendency < 0.66 },
  { name: 'High VT', filter: (s: typeof samples[0]) => s.viceTendency >= 0.66 },
];

for (const t of tertiles) {
  const subset = samples.filter(t.filter);
  const avgChronic = subset.reduce((s, x) => s + x.chronicCount, 0) / subset.length;
  const avgChronicChance = subset.reduce((s, x) => s + x.chronicChance, 0) / subset.length;
  console.log(`${t.name} (n=${subset.length}): avg chronic=${avgChronic.toFixed(2)}, avg chance=${(avgChronicChance*100).toFixed(1)}%`);
}

console.log('\n=== By Chronic Status ===');
const hasChronic = samples.filter(s => s.chronicCount > 0);
const noChronic = samples.filter(s => s.chronicCount === 0);
console.log(`Has chronic (n=${hasChronic.length}): avg VT=${(hasChronic.reduce((s, x) => s + x.viceTendency, 0) / hasChronic.length).toFixed(3)}`);
console.log(`No chronic (n=${noChronic.length}): avg VT=${(noChronic.reduce((s, x) => s + x.viceTendency, 0) / noChronic.length).toFixed(3)}`);

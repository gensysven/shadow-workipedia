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

const observanceMap: Record<string, number> = {
  none: 0,
  cultural: 1,
  moderate: 2,
  observant: 3,
  strict: 4,
  'ultra-orthodox': 5,
};

const samples: {
  actualReligiosity: number;
  restrictionCount: number;
  observanceLevel: string;
  affiliationTag: string;
  restrictions: string[];
}[] = [];

for (let i = 0; i < 300; i++) {
  const agent = generateAgent({ seed: 'hl4v2-' + i, vocab, priors, countries, includeTrace: true });

  const actualReligiosity = observanceMap[agent.spirituality?.observanceLevel ?? 'none'] ?? 0;
  const restrictionCount = agent.preferences?.food?.restrictions?.length ?? 0;
  const observanceLevel = agent.spirituality?.observanceLevel ?? 'none';
  const affiliationTag = agent.spirituality?.affiliationTag ?? '';
  const restrictions = agent.preferences?.food?.restrictions ?? [];

  samples.push({ actualReligiosity, restrictionCount, observanceLevel, affiliationTag, restrictions });
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

console.log('=== #HL4 Post-Fix Investigation ===');
console.log('actualReligiosity ↔ restrictionCount:', corr(
  samples.map(s => s.actualReligiosity),
  samples.map(s => s.restrictionCount)
).toFixed(3));

console.log('\n=== Distributions ===');
console.log('Restriction count distribution:');
const restrictDist: Record<number, number> = {};
for (const s of samples) {
  restrictDist[s.restrictionCount] = (restrictDist[s.restrictionCount] ?? 0) + 1;
}
console.log(restrictDist);

console.log('\nObservance level distribution:');
const obsDist: Record<string, number> = {};
for (const s of samples) {
  obsDist[s.observanceLevel] = (obsDist[s.observanceLevel] ?? 0) + 1;
}
console.log(obsDist);

console.log('\n=== Cross-tabs: restriction count by observance level ===');
const levels = ['none', 'cultural', 'moderate', 'observant', 'strict', 'ultra-orthodox'];
for (const level of levels) {
  const subset = samples.filter(s => s.observanceLevel === level);
  if (subset.length === 0) continue;
  const avgRestrict = subset.reduce((s, x) => s + x.restrictionCount, 0) / subset.length;
  console.log(`${level} (n=${subset.length}): avg restrictions=${avgRestrict.toFixed(2)}`);
}

console.log('\n=== Religious observers with their restrictions ===');
const religious = samples.filter(s => ['strict', 'ultra-orthodox', 'observant'].includes(s.observanceLevel));
console.log(`Religious agents (strict/ultra-orthodox/observant): ${religious.length}`);
for (const s of religious.slice(0, 10)) {
  console.log(`  ${s.observanceLevel} ${s.affiliationTag}: restrictions=[${s.restrictions.join(', ')}]`);
}

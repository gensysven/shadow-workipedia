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

function computeViceSeverity(vices: Array<{ severity?: string }>): number {
  if (vices.length === 0) return 0;
  const severityMap: Record<string, number> = {
    mild: 1, moderate: 2, severe: 3, crippling: 4,
  };
  return vices.reduce((s, v) => s + (severityMap[v.severity ?? 'mild'] ?? 1), 0) / vices.length;
}

const samples: {
  viceTendency: number;
  viceSeverityAvg: number;
  chronicCount: number;
}[] = [];

for (let i = 0; i < 500; i++) {
  const agent = generateAgent({ seed: 'hl2-' + i, vocab, priors, countries, includeTrace: true });
  const latents = (agent as any).generationTrace?.latents?.values;
  const viceTendency = latents?.viceTendency ?? 500;
  const viceSeverityAvg = computeViceSeverity(agent.vices ?? []);
  const chronicCount = agent.health?.chronicConditionTags?.length ?? 0;

  samples.push({ viceTendency, viceSeverityAvg, chronicCount });
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

console.log('viceTendency ↔ chronicCount:', corr(
  samples.map(s => s.viceTendency),
  samples.map(s => s.chronicCount)
).toFixed(3));

console.log('viceSeverityAvg ↔ chronicCount:', corr(
  samples.map(s => s.viceSeverityAvg),
  samples.map(s => s.chronicCount)
).toFixed(3));

console.log('viceTendency ↔ viceSeverityAvg:', corr(
  samples.map(s => s.viceTendency),
  samples.map(s => s.viceSeverityAvg)
).toFixed(3));

// Distribution
console.log('\n=== Distributions ===');
console.log('Chronic count distribution:');
const chronicDist: Record<number, number> = {};
for (const s of samples) {
  chronicDist[s.chronicCount] = (chronicDist[s.chronicCount] ?? 0) + 1;
}
console.log(chronicDist);

console.log('\nVice severity avg distribution:');
const viceZero = samples.filter(s => s.viceSeverityAvg === 0).length;
const viceLow = samples.filter(s => s.viceSeverityAvg > 0 && s.viceSeverityAvg <= 1).length;
const viceMed = samples.filter(s => s.viceSeverityAvg > 1 && s.viceSeverityAvg <= 2).length;
const viceHigh = samples.filter(s => s.viceSeverityAvg > 2).length;
console.log(`Zero: ${viceZero}, Low (0-1]: ${viceLow}, Med (1-2]: ${viceMed}, High (>2): ${viceHigh}`);

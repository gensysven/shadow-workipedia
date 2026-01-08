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

// Generate one agent and inspect its structure
const agent = generateAgent({ seed: 'inspect-1', vocab, priors, countries, includeTrace: true });

console.log('=== Agent Spirituality ===');
console.log('agent.spirituality:', JSON.stringify(agent.spirituality, null, 2));

console.log('\n=== Trace Structure ===');
const trace = (agent as any).generationTrace;
console.log('trace keys:', Object.keys(trace));

if (trace.lifestyle) {
  console.log('\ntrace.lifestyle keys:', Object.keys(trace.lifestyle));
  console.log('trace.lifestyle.value:', trace.lifestyle.value);
}

// Check the spirituality in the trace
for (const key of Object.keys(trace)) {
  if (key.toLowerCase().includes('spirit')) {
    console.log(`\nFound spirituality key: ${key}`);
    console.log(JSON.stringify(trace[key], null, 2));
  }
}

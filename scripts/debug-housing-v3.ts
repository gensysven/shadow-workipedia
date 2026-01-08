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

// Show sample agents to verify structure
for (let i = 0; i < 5; i++) {
  const agent = generateAgent({ seed: 'hv3-' + i, vocab, priors, countries, includeTrace: true });
  const latents = (agent as any).generationTrace?.latents?.values;
  console.log(`\n=== Agent ${i} ===`);
  console.log('tier:', agent.economicPosition?.tierBand);
  console.log('age:', agent.age);
  console.log('maritalStatus:', agent.social?.maritalStatus);
  console.log('dependentCount:', agent.social?.dependentCount);
  console.log('housingStability:', agent.home?.housingStability);
  console.log('frugality:', latents?.frugality);
  console.log('cosmopolitanism:', latents?.cosmopolitanism);
  console.log('riskAppetite:', latents?.riskAppetite);
}

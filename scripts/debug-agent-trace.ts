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

// Generate a few agents and check their values
for (let i = 0; i < 20; i++) {
  const agent = generateAgent({ seed: 'trace-' + i, vocab, priors, countries, includeTrace: true });
  const latents = (agent as any).generationTrace?.latents?.values;
  const cosmo = latents?.cosmopolitanism ?? 500;
  const frug = latents?.frugality ?? 500;
  const risk = latents?.riskAppetite ?? 500;
  const tier = agent.identity?.tierBand;
  const age = 2025 - (agent.identity?.birthYear ?? 1990);
  const housing = agent.home?.housingStability;
  const married = agent.family?.maritalStatus;
  const deps = agent.family?.dependentCount ?? 0;

  console.log(`#${i}: tier=${tier}, age=${age}, housing=${housing}`);
  console.log(`      cosmo=${cosmo}, frug=${frug}, risk=${risk}`);
  console.log(`      married=${married}, deps=${deps}`);
  console.log('');
}

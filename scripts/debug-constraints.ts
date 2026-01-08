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

let totalAgents = 0;
let elite = 0;
let lowRisk = 0; // risk <= 200
let hasFamily = 0;

for (let i = 0; i < 500; i++) {
  const agent = generateAgent({ seed: 'constraint-' + i, vocab, priors, countries, includeTrace: true });
  const latents = (agent as any).generationTrace?.latents?.values;
  const risk = latents?.riskAppetite ?? 500;
  const tier = agent.identity?.tierBand;
  const married = agent.family?.maritalStatus === 'married' || agent.family?.maritalStatus === 'partnered';
  const deps = agent.family?.dependentCount ?? 0;

  totalAgents++;
  if (tier === 'elite') elite++;
  if (risk <= 200) lowRisk++;
  if (married && deps > 0) hasFamily++;
}

console.log(`Total agents: ${totalAgents}`);
console.log(`Elite tier (unstable blocked): ${elite} (${(elite / totalAgents * 100).toFixed(1)}%)`);
console.log(`Low risk ≤200 (unstable blocked): ${lowRisk} (${(lowRisk / totalAgents * 100).toFixed(1)}%)`);
console.log(`Has family (couch-surfing/transient blocked): ${hasFamily} (${(hasFamily / totalAgents * 100).toFixed(1)}%)`);

// Overlaps
let constrained = 0;
for (let i = 0; i < 500; i++) {
  const agent = generateAgent({ seed: 'constraint-' + i, vocab, priors, countries, includeTrace: true });
  const latents = (agent as any).generationTrace?.latents?.values;
  const risk = latents?.riskAppetite ?? 500;
  const tier = agent.identity?.tierBand;
  const married = agent.family?.maritalStatus === 'married' || agent.family?.maritalStatus === 'partnered';
  const deps = agent.family?.dependentCount ?? 0;

  // Any constraint blocking unstable options?
  if (tier === 'elite' || risk <= 200 || (married && deps > 0)) {
    constrained++;
  }
}
console.log(`\nTotal constrained (any unstable blocked): ${constrained} (${(constrained / totalAgents * 100).toFixed(1)}%)`);

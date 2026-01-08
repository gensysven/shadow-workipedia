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

async function test() {
  const vocabPath = resolve(__dirname, '..', 'public', 'agent-vocab.v1.json');
  const priorsPath = resolve(__dirname, '..', 'public', 'agent-priors.v1.json');
  const countryMapPath = resolve(__dirname, '..', 'public', 'shadow-country-map.json');

  const vocab = JSON.parse(readFileSync(vocabPath, 'utf-8')) as AgentVocabV1;
  const priors = JSON.parse(readFileSync(priorsPath, 'utf-8')) as AgentPriorsV1;
  const shadowMap = JSON.parse(readFileSync(countryMapPath, 'utf-8')) as ShadowCountryMapEntry[];
  const countries = shadowMap.filter(c => c.iso3 && c.iso3.length === 3);

  // Conflict style numeric mapping (from audit)
  const conflictStyleMap: Record<string, number> = {
    avoidant: 0,
    accommodating: 1,
    yielding: 1,
    compromising: 2,
    collaborative: 3,
    assertive: 4,
    competing: 5,
  };

  // Generate agents and track conflict styles by agreeableness quartile
  const lowAgree: { style: string; numeric: number; agree: number }[] = [];
  const highAgree: { style: string; numeric: number; agree: number }[] = [];

  for (let i = 0; i < 200; i++) {
    const agent = generateAgent({ seed: 'conflict-' + i, vocab, priors, countries });
    const agreeableness = agent.capabilities?.traits?.agreeableness ?? 500;
    const conflictStyle = agent.personality?.conflictStyle ?? 'compromising';
    const numeric = conflictStyleMap[conflictStyle] ?? 2;

    if (agreeableness < 400) lowAgree.push({ style: conflictStyle, numeric, agree: agreeableness });
    if (agreeableness > 600) highAgree.push({ style: conflictStyle, numeric, agree: agreeableness });
  }

  const countStyles = (arr: { style: string; numeric: number; agree: number }[]) => {
    const counts: Record<string, number> = {};
    for (const s of arr) counts[s.style] = (counts[s.style] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const avgNumeric = (arr: { style: string; numeric: number; agree: number }[]) => {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, x) => sum + x.numeric, 0) / arr.length;
  };

  console.log('Low Agreeableness (<400): n=' + lowAgree.length);
  console.log(countStyles(lowAgree));
  console.log('Avg numeric:', avgNumeric(lowAgree).toFixed(2));

  console.log('\nHigh Agreeableness (>600): n=' + highAgree.length);
  console.log(countStyles(highAgree));
  console.log('Avg numeric:', avgNumeric(highAgree).toFixed(2));

  console.log('\nExpected: Low agree should have HIGHER avg numeric (more competing=5)');
  console.log('Expected: High agree should have LOWER avg numeric (more accommodating=1, collaborative=3)');

  // Check if authoritarianism confounds
  const lowAgreeWithAuth: { agree: number; auth: number; style: string }[] = [];
  const highAgreeWithAuth: { agree: number; auth: number; style: string }[] = [];
  for (let i = 0; i < 200; i++) {
    const agent = generateAgent({ seed: 'conflict-' + i, vocab, priors, countries });
    const agreeableness = agent.capabilities?.traits?.agreeableness ?? 500;
    const authoritarianism = agent.capabilities?.traits?.authoritarianism ?? 500;
    const conflictStyle = agent.personality?.conflictStyle ?? 'compromising';

    if (agreeableness < 400) lowAgreeWithAuth.push({ agree: agreeableness, auth: authoritarianism, style: conflictStyle });
    if (agreeableness > 600) highAgreeWithAuth.push({ agree: agreeableness, auth: authoritarianism, style: conflictStyle });
  }

  const avgAuth = (arr: { auth: number }[]) => arr.reduce((s, x) => s + x.auth, 0) / arr.length;
  console.log('\n--- Checking for authoritarianism confound ---');
  console.log('Low agreeableness avg authoritarianism:', avgAuth(lowAgreeWithAuth).toFixed(0));
  console.log('High agreeableness avg authoritarianism:', avgAuth(highAgreeWithAuth).toFixed(0));
}

test();

// Additional debug: check aptitude correlations
async function debugAptitudes() {
  const vocabPath = resolve(__dirname, '..', 'public', 'agent-vocab.v1.json');
  const priorsPath = resolve(__dirname, '..', 'public', 'agent-priors.v1.json');
  const countryMapPath = resolve(__dirname, '..', 'public', 'shadow-country-map.json');

  const vocab = JSON.parse(readFileSync(vocabPath, 'utf-8')) as AgentVocabV1;
  const priors = JSON.parse(readFileSync(priorsPath, 'utf-8')) as AgentPriorsV1;
  const shadowMap = JSON.parse(readFileSync(countryMapPath, 'utf-8')) as ShadowCountryMapEntry[];
  const countries = shadowMap.filter((c: any) => c.iso3 && c.iso3.length === 3);

  const empathies: number[] = [];
  const assertivenesses: number[] = [];
  const instEmbeddings: number[] = [];

  for (let i = 0; i < 200; i++) {
    const agent = generateAgent({ seed: 'apt-' + i, vocab, priors, countries });
    empathies.push(agent.capabilities?.aptitudes?.empathy ?? 500);
    assertivenesses.push(agent.capabilities?.aptitudes?.assertiveness ?? 500);
    instEmbeddings.push(agent.latents?.institutionalEmbeddedness ?? 500);
  }

  const corr = (a: number[], b: number[]) => {
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
  };

  console.log('\n--- Aptitude correlations ---');
  console.log('Empathy ↔ Assertiveness:', corr(empathies, assertivenesses).toFixed(3));
  console.log('Empathy ↔ Inst.Embeddedness:', corr(empathies, instEmbeddings).toFixed(3));
}

debugAptitudes();

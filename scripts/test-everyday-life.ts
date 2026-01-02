#!/usr/bin/env node
/**
 * Everyday Life Vocab Test Harness
 *
 * Verifies daily-life vocab expansions and urbanicity influence on third places.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { computeDomestic } from '../src/agent/facets/domestic';
import type { AgentVocabV1 } from '../src/agent/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadJsonFile<T>(relativePath: string): T {
  const fullPath = resolve(__dirname, '..', relativePath);
  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as T;
}

function assertIncludes(pool: string[] | undefined, value: string, label: string): void {
  if (!pool || !pool.includes(value)) {
    throw new Error(`Expected ${label} to include "${value}".`);
  }
}

function assertAtLeast(value: number, min: number, label: string): void {
  if (value < min) {
    throw new Error(`Expected ${label} to be >= ${min}, got ${value}.`);
  }
}

function run(): void {
  console.log('Loading vocab...');
  const vocab = loadJsonFile<AgentVocabV1>('public/agent-vocab.v1.json');

  console.log('Checking vocab expansions...');
  assertIncludes(vocab.everydayLife?.thirdPlaces, 'coworking-space', 'everydayLife.thirdPlaces');
  assertIncludes(vocab.everydayLife?.commuteModes, 'remote', 'everydayLife.commuteModes');
  assertIncludes(vocab.everydayLife?.weeklyAnchors, 'meal-prep', 'everydayLife.weeklyAnchors');
  assertIncludes(vocab.everydayLife?.pettyHabits, 'multiple-alarms', 'everydayLife.pettyHabits');
  assertIncludes(vocab.everydayLife?.caregivingObligations, 'pet-care', 'everydayLife.caregivingObligations');

  console.log('Checking urbanicity effect on third places...');
  const baseCtx = {
    seed: 'daily-life-001',
    vocab,
    latents: {
      cosmopolitanism: 500,
      publicness: 500,
      opsecDiscipline: 500,
      institutionalEmbeddedness: 500,
      riskAppetite: 500,
      stressReactivity: 500,
      impulseControl: 500,
      techFluency: 500,
      socialBattery: 800,
      aestheticExpressiveness: 500,
      frugality: 500,
      curiosityBandwidth: 500,
      adaptability: 500,
      planningHorizon: 500,
      principledness: 500,
      physicalConditioning: 500,
    },
    tierBand: 'middle' as const,
    age: 35,
    roleSeedTags: ['analyst'],
    careerTrackTag: 'civil-service',
    homeCountryIso3: 'USA',
    currentCountryIso3: 'USA',
    citizenshipCountryIso3: 'USA',
    gdpPerCap01: 0.7,
    traits: { conscientiousness: 600 },
    maritalStatus: 'married',
    dependentCount: 1,
  };

  const mega = computeDomestic({ ...baseCtx, urbanicity: 'megacity' });
  const rural = computeDomestic({ ...baseCtx, urbanicity: 'rural-remote' });
  const diff = mega.everydayLife.thirdPlaces.length - rural.everydayLife.thirdPlaces.length;
  assertAtLeast(diff, 2, 'thirdPlaces count difference (megacity - rural)');

  console.log('Everyday life test passed.');
}

run();

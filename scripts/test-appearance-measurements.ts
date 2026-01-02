#!/usr/bin/env node
/**
 * Appearance Measurements Test Harness
 *
 * Verifies numeric height/weight generation and unit conversions.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { computeAppearance } from '../src/agent/facets/appearance';
import type { AgentVocabV1, HeightBand } from '../src/agent/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadJsonFile<T>(relativePath: string): T {
  const fullPath = resolve(__dirname, '..', relativePath);
  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as T;
}

function assertInRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`Expected ${label} to be a finite number, got ${value}.`);
  }
  if (value < min || value > max) {
    throw new Error(`Expected ${label} to be in [${min}, ${max}], got ${value}.`);
  }
}

function assertApprox(value: number, expected: number, tolerance: number, label: string): void {
  if (Math.abs(value - expected) > tolerance) {
    throw new Error(`Expected ${label} ≈ ${expected} (±${tolerance}), got ${value}.`);
  }
}

const HEIGHT_RANGES_CM: Record<HeightBand, [number, number]> = {
  very_short: [145, 159],
  short: [160, 169],
  average: [170, 179],
  tall: [180, 189],
  very_tall: [190, 205],
};

function run(): void {
  const vocab = loadJsonFile<AgentVocabV1>('public/agent-vocab.v1.json');

  const baseCtx = {
    seed: 'appearance-001',
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
      socialBattery: 500,
      aestheticExpressiveness: 500,
      frugality: 500,
      curiosityBandwidth: 500,
      adaptability: 500,
      planningHorizon: 500,
      principledness: 500,
      physicalConditioning: 600,
    },
    countryPriors: null,
    age: 34,
    careerTrackTag: 'civil-service',
    roleSeedTags: ['analyst'],
    public01: 0.4,
    opsec01: 0.6,
    homeCulture: 'western',
  };

  (Object.keys(HEIGHT_RANGES_CM) as HeightBand[]).forEach((band) => {
    const bandVocab: AgentVocabV1 = {
      ...vocab,
      appearance: { ...vocab.appearance, heightBands: [band] },
    };
    const appearance = computeAppearance({ ...baseCtx, seed: `appearance-${band}`, vocab: bandVocab });
    const [minCm, maxCm] = HEIGHT_RANGES_CM[band];

    assertInRange(appearance.heightCm, minCm, maxCm, `${band} heightCm`);
    assertApprox(appearance.heightIn, Math.round(appearance.heightCm / 2.54), 1, `${band} heightIn`);
    assertInRange(appearance.weightKg, 40, 160, `${band} weightKg`);
    assertApprox(appearance.weightLb, Math.round(appearance.weightKg * 2.20462), 2, `${band} weightLb`);

    const heightM = appearance.heightCm / 100;
    const bmi = appearance.weightKg / (heightM * heightM);
    assertInRange(bmi, 17, 35, `${band} bmi`);
  });

  console.log('Appearance measurement test passed.');
}

run();

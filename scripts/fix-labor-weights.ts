/**
 * Fix organized-labor career track weights in agent-priors.v1.json
 *
 * The original weights don't reflect actual union density differences between countries.
 * Countries with historically strong labor movements (Nordic, Germany, France) should have
 * higher weights than countries with weak labor traditions (USA, Gulf States).
 *
 * Data sources:
 * - OECD Trade Union Density data
 * - ILO union membership statistics
 * - Historical labor movement research
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Bucket {
  year: number;
  careerTrackWeights: Record<string, number>;
  [key: string]: unknown;
}

interface Country {
  iso3: string;
  buckets: Record<string, Bucket>;
}

interface Priors {
  version: number;
  generatedAtIso: string;
  sources: unknown[];
  buckets: unknown;
  countries: Record<string, Country>;
}

// Target organized-labor weights by country and era
// Based on OECD/ILO union density data, scaled to fit career track weight range (0.2-0.7)
// Higher = more agents will have organized-labor career track
const laborCorrections: Record<string, Record<string, number>> = {
  // Nordic countries - historically 60-90% union density
  SWE: { '1960': 0.65, '1970': 0.70, '1980': 0.75, '1990': 0.75, '2000': 0.70, '2010': 0.65, '2020': 0.60 },
  NOR: { '1960': 0.60, '1970': 0.65, '1980': 0.68, '1990': 0.65, '2000': 0.60, '2010': 0.55, '2020': 0.52 },
  DNK: { '1960': 0.58, '1970': 0.65, '1980': 0.72, '1990': 0.70, '2000': 0.68, '2010': 0.65, '2020': 0.62 },
  FIN: { '1960': 0.55, '1970': 0.60, '1980': 0.70, '1990': 0.72, '2000': 0.70, '2010': 0.65, '2020': 0.58 },
  ISL: { '1960': 0.55, '1970': 0.70, '1980': 0.80, '1990': 0.85, '2000': 0.85, '2010': 0.80, '2020': 0.78 },

  // Western Europe - moderate-high union density (30-50%)
  DEU: { '1960': 0.50, '1970': 0.52, '1980': 0.52, '1990': 0.50, '2000': 0.42, '2010': 0.35, '2020': 0.30 },
  FRA: { '1960': 0.45, '1970': 0.40, '1980': 0.32, '1990': 0.25, '2000': 0.22, '2010': 0.20, '2020': 0.20 }, // France has LOW density but HIGH strike activity
  BEL: { '1960': 0.55, '1970': 0.58, '1980': 0.60, '1990': 0.58, '2000': 0.55, '2010': 0.52, '2020': 0.50 },
  AUT: { '1960': 0.60, '1970': 0.58, '1980': 0.55, '1990': 0.50, '2000': 0.45, '2010': 0.38, '2020': 0.35 },
  NLD: { '1960': 0.50, '1970': 0.48, '1980': 0.45, '1990': 0.35, '2000': 0.32, '2010': 0.28, '2020': 0.25 },
  ITA: { '1960': 0.48, '1970': 0.50, '1980': 0.55, '1990': 0.50, '2000': 0.45, '2010': 0.42, '2020': 0.40 },
  GBR: { '1960': 0.52, '1970': 0.55, '1980': 0.58, '1990': 0.45, '2000': 0.35, '2010': 0.32, '2020': 0.28 },
  IRL: { '1960': 0.52, '1970': 0.55, '1980': 0.58, '1990': 0.52, '2000': 0.45, '2010': 0.38, '2020': 0.32 },

  // Southern/Eastern Europe - varied
  ESP: { '1960': 0.25, '1970': 0.25, '1980': 0.30, '1990': 0.28, '2000': 0.25, '2010': 0.22, '2020': 0.20 },
  PRT: { '1960': 0.25, '1970': 0.25, '1980': 0.55, '1990': 0.40, '2000': 0.32, '2010': 0.25, '2020': 0.22 },
  GRC: { '1960': 0.35, '1970': 0.38, '1980': 0.42, '1990': 0.38, '2000': 0.35, '2010': 0.32, '2020': 0.28 },
  POL: { '1960': 0.55, '1970': 0.60, '1980': 0.65, '1990': 0.35, '2000': 0.25, '2010': 0.20, '2020': 0.18 }, // Solidarity peak in 1980s

  // Americas
  USA: { '1960': 0.40, '1970': 0.35, '1980': 0.28, '1990': 0.22, '2000': 0.18, '2010': 0.15, '2020': 0.12 },
  CAN: { '1960': 0.42, '1970': 0.42, '1980': 0.45, '1990': 0.42, '2000': 0.40, '2010': 0.38, '2020': 0.35 },
  ARG: { '1960': 0.65, '1970': 0.62, '1980': 0.55, '1990': 0.45, '2000': 0.40, '2010': 0.42, '2020': 0.42 }, // Peronist labor tradition
  BRA: { '1960': 0.30, '1970': 0.28, '1980': 0.35, '1990': 0.32, '2000': 0.30, '2010': 0.28, '2020': 0.22 },
  MEX: { '1960': 0.38, '1970': 0.35, '1980': 0.32, '1990': 0.28, '2000': 0.22, '2010': 0.18, '2020': 0.15 },

  // East Asia - state-controlled or weak unions
  CHN: { '1960': 0.40, '1970': 0.42, '1980': 0.40, '1990': 0.38, '2000': 0.35, '2010': 0.30, '2020': 0.28 }, // State-controlled, not independent
  JPN: { '1960': 0.50, '1970': 0.45, '1980': 0.38, '1990': 0.32, '2000': 0.28, '2010': 0.22, '2020': 0.20 },
  KOR: { '1960': 0.20, '1970': 0.22, '1980': 0.25, '1990': 0.30, '2000': 0.25, '2010': 0.15, '2020': 0.15 },
  TWN: { '1960': 0.25, '1970': 0.25, '1980': 0.28, '1990': 0.30, '2000': 0.25, '2010': 0.20, '2020': 0.18 },

  // Gulf States - minimal independent labor (migrant worker issues)
  SAU: { '1960': 0.10, '1970': 0.10, '1980': 0.08, '1990': 0.08, '2000': 0.08, '2010': 0.08, '2020': 0.08 },
  ARE: { '1960': 0.10, '1970': 0.10, '1980': 0.08, '1990': 0.08, '2000': 0.08, '2010': 0.08, '2020': 0.08 },
  QAT: { '1960': 0.10, '1970': 0.10, '1980': 0.08, '1990': 0.08, '2000': 0.08, '2010': 0.08, '2020': 0.08 },
  KWT: { '1960': 0.12, '1970': 0.12, '1980': 0.10, '1990': 0.10, '2000': 0.10, '2010': 0.10, '2020': 0.10 },
  BHR: { '1960': 0.12, '1970': 0.12, '1980': 0.10, '1990': 0.10, '2000': 0.10, '2010': 0.10, '2020': 0.10 },
  OMN: { '1960': 0.10, '1970': 0.10, '1980': 0.08, '1990': 0.08, '2000': 0.08, '2010': 0.08, '2020': 0.08 },

  // City states and special cases
  SGP: { '1960': 0.25, '1970': 0.28, '1980': 0.30, '1990': 0.28, '2000': 0.25, '2010': 0.22, '2020': 0.20 },
  HKG: { '1960': 0.30, '1970': 0.32, '1980': 0.35, '1990': 0.32, '2000': 0.28, '2010': 0.25, '2020': 0.22 },

  // Other notable countries
  AUS: { '1960': 0.55, '1970': 0.55, '1980': 0.52, '1990': 0.45, '2000': 0.35, '2010': 0.25, '2020': 0.20 },
  NZL: { '1960': 0.55, '1970': 0.52, '1980': 0.50, '1990': 0.38, '2000': 0.28, '2010': 0.22, '2020': 0.20 },
  ZAF: { '1960': 0.20, '1970': 0.25, '1980': 0.30, '1990': 0.42, '2000': 0.45, '2010': 0.40, '2020': 0.35 }, // Rise with anti-apartheid
  ISR: { '1960': 0.75, '1970': 0.70, '1980': 0.60, '1990': 0.50, '2000': 0.40, '2010': 0.32, '2020': 0.28 }, // Histadrut decline
  RUS: { '1960': 0.60, '1970': 0.60, '1980': 0.60, '1990': 0.45, '2000': 0.35, '2010': 0.30, '2020': 0.25 }, // Soviet era high, post-Soviet decline
  IND: { '1960': 0.30, '1970': 0.32, '1980': 0.35, '1990': 0.30, '2000': 0.25, '2010': 0.20, '2020': 0.18 },
};

const priorsPath = resolve(__dirname, '../public/agent-priors.v1.json');
const priors: Priors = JSON.parse(readFileSync(priorsPath, 'utf-8'));

console.log('Fixing organized-labor weights...\n');

let countriesFixed = 0;
let bucketsFixed = 0;

for (const [iso3, yearWeights] of Object.entries(laborCorrections)) {
  const country = priors.countries[iso3];
  if (!country) {
    console.log(`Warning: Country ${iso3} not found in priors`);
    continue;
  }

  let countryBucketsFixed = 0;
  for (const [year, newWeight] of Object.entries(yearWeights)) {
    const bucket = country.buckets[year];
    if (bucket && bucket.careerTrackWeights) {
      const oldWeight = bucket.careerTrackWeights['organized-labor'];
      if (oldWeight !== undefined) {
        bucket.careerTrackWeights['organized-labor'] = newWeight;
        countryBucketsFixed++;
      }
    }
  }

  if (countryBucketsFixed > 0) {
    countriesFixed++;
    bucketsFixed += countryBucketsFixed;
  }
}

console.log(`Fixed ${bucketsFixed} buckets across ${countriesFixed} countries\n`);

// Verify some key corrections
console.log('Verification (2020 values):');
const verifyCountries = ['SWE', 'DEU', 'USA', 'CHN', 'SAU', 'ARG'];
for (const iso3 of verifyCountries) {
  const country = priors.countries[iso3];
  if (country) {
    const bucket2020 = country.buckets['2020'];
    if (bucket2020) {
      const labor = bucket2020.careerTrackWeights['organized-labor'];
      console.log(`  ${iso3}: ${labor?.toFixed(3)}`);
    }
  }
}

writeFileSync(priorsPath, JSON.stringify(priors, null, 2));
console.log('\nSaved updated priors to', priorsPath);

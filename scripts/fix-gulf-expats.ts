/**
 * Fix Gulf States expatriate population weights in agent-priors.v1.json
 *
 * Gulf Cooperation Council (GCC) countries have extremely high expatriate populations,
 * dominated by South Asian workers. Current priors vastly undercount these demographics.
 *
 * Real demographic data (2020s):
 * - UAE: ~88% expats (Indians 27%, Pakistanis 12%, Bangladeshis 7%, Filipinos 5%, others)
 * - Qatar: ~88% expats (Indians 25%, Nepalis 16%, Bangladeshis 13%, Filipinos 10%)
 * - Kuwait: ~70% expats (Indians 21%, Egyptians 15%, Bangladeshis 10%, Filipinos 8%)
 * - Bahrain: ~55% expats (Indians 25%, Bangladeshis 10%, Pakistanis 5%)
 * - Oman: ~46% expats (Indians 22%, Bangladeshis 16%, Pakistanis 9%)
 * - Saudi Arabia: ~38% expats (Indians 13%, Bangladeshis 7%, Pakistanis 6%, Egyptians 5%)
 *
 * Sources:
 * - UN Department of Economic and Social Affairs migration data
 * - Gulf Labour Markets and Migration (GLMM) programme
 * - World Bank migration statistics
 * - National statistics bureaus
 *
 * Culture profile mappings:
 * - aramaic: Arab (native Gulf populations)
 * - bharatic: North Indian (Hindi belt)
 * - dravidic: South Indian (Tamil, Malayalam, etc.)
 * - sindhukan: Pakistani
 * - gangetic: Bangladeshi (Bengal region)
 * - gorkhalic: Nepali
 * - maharlikan: Filipino
 * - deshretine: Egyptian
 * - sawahili: East African
 * - nusantaran: Indonesian
 * - parsic: Iranian
 * - alvionic: Western expats (UK, US, etc.)
 * - cosmopolitan: Mixed/global
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Bucket {
  cohortBucketStartYear: number;
  cultureProfileWeights01k?: Record<string, number>;
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

// Gulf states culture weights by decade
// Values are per-1000 (01k), must sum to ~1000
// Historical progression: expat populations grew significantly from 1970s oil boom onward

const gulfCorrections: Record<string, Record<string, Record<string, number>>> = {
  // UAE - highest expat ratio (~88% in 2020)
  // Pre-oil: small Bedouin/fishing communities, some Iranian traders
  // Post-1971: rapid development attracted massive labor migration
  ARE: {
    '1960': {
      'profile:aramaic': 850,      // Native Emiratis dominant pre-oil
      'profile:parsic': 100,       // Iranian traders (historical)
      'profile:bharatic': 30,      // Small Indian trader community
      'profile:dravidic': 20,
    },
    '1970': {
      'profile:aramaic': 650,      // Oil boom beginning
      'profile:parsic': 80,
      'profile:bharatic': 100,
      'profile:dravidic': 70,
      'profile:sindhukan': 50,
      'profile:alvionic': 50,      // Western oil workers
    },
    '1980': {
      'profile:aramaic': 350,      // Massive construction boom
      'profile:bharatic': 200,
      'profile:dravidic': 150,
      'profile:sindhukan': 100,
      'profile:gangetic': 50,
      'profile:maharlikan': 50,
      'profile:parsic': 40,
      'profile:alvionic': 40,
      'profile:deshretine': 20,
    },
    '1990': {
      'profile:aramaic': 250,
      'profile:bharatic': 220,
      'profile:dravidic': 170,
      'profile:sindhukan': 120,
      'profile:gangetic': 70,
      'profile:maharlikan': 60,
      'profile:parsic': 35,
      'profile:alvionic': 35,
      'profile:deshretine': 25,
      'profile:sawahili': 15,
    },
    '2000': {
      'profile:aramaic': 180,
      'profile:bharatic': 230,
      'profile:dravidic': 180,
      'profile:sindhukan': 130,
      'profile:gangetic': 80,
      'profile:maharlikan': 60,
      'profile:parsic': 35,
      'profile:alvionic': 45,
      'profile:deshretine': 30,
      'profile:sawahili': 15,
      'profile:cosmopolitan': 15,
    },
    '2010': {
      'profile:aramaic': 130,      // ~13% Emirati
      'profile:bharatic': 250,     // ~25% Indian (North)
      'profile:dravidic': 150,     // ~15% Indian (South - Kerala, Tamil Nadu)
      'profile:sindhukan': 120,    // ~12% Pakistani
      'profile:gangetic': 80,      // ~8% Bangladeshi
      'profile:maharlikan': 60,    // ~6% Filipino
      'profile:gorkhalic': 30,     // ~3% Nepali
      'profile:parsic': 30,        // ~3% Iranian
      'profile:alvionic': 60,      // ~6% Western
      'profile:deshretine': 40,    // ~4% Egyptian/Arab expat
      'profile:sawahili': 20,      // ~2% African
      'profile:nusantaran': 15,    // Indonesian
      'profile:cosmopolitan': 15,
    },
    '2020': {
      'profile:aramaic': 120,      // ~12% Emirati (shrinking share)
      'profile:bharatic': 270,     // ~27% Indian (largest group)
      'profile:dravidic': 140,     // Kerala/Tamil workers
      'profile:sindhukan': 120,    // ~12% Pakistani
      'profile:gangetic': 70,      // ~7% Bangladeshi
      'profile:maharlikan': 55,    // ~5.5% Filipino
      'profile:gorkhalic': 35,     // Nepali (growing)
      'profile:parsic': 25,        // Iranian
      'profile:alvionic': 70,      // Western expats (Dubai growth)
      'profile:deshretine': 40,    // Egyptian
      'profile:sawahili': 20,
      'profile:nusantaran': 15,
      'profile:cosmopolitan': 20,
    },
  },

  // Qatar - also ~88% expat, but different mix (more Nepali)
  QAT: {
    '1960': {
      'profile:aramaic': 900,
      'profile:parsic': 70,
      'profile:bharatic': 30,
    },
    '1970': {
      'profile:aramaic': 700,
      'profile:bharatic': 100,
      'profile:parsic': 60,
      'profile:dravidic': 60,
      'profile:alvionic': 50,
      'profile:sindhukan': 30,
    },
    '1980': {
      'profile:aramaic': 400,
      'profile:bharatic': 180,
      'profile:dravidic': 120,
      'profile:sindhukan': 80,
      'profile:parsic': 50,
      'profile:alvionic': 70,
      'profile:gangetic': 50,
      'profile:maharlikan': 30,
      'profile:deshretine': 20,
    },
    '1990': {
      'profile:aramaic': 300,
      'profile:bharatic': 200,
      'profile:dravidic': 130,
      'profile:sindhukan': 90,
      'profile:gangetic': 70,
      'profile:maharlikan': 50,
      'profile:gorkhalic': 40,
      'profile:alvionic': 50,
      'profile:parsic': 35,
      'profile:deshretine': 25,
      'profile:sawahili': 10,
    },
    '2000': {
      'profile:aramaic': 200,
      'profile:bharatic': 210,
      'profile:dravidic': 130,
      'profile:gangetic': 100,
      'profile:sindhukan': 80,
      'profile:gorkhalic': 80,
      'profile:maharlikan': 70,
      'profile:alvionic': 50,
      'profile:parsic': 30,
      'profile:deshretine': 30,
      'profile:sawahili': 10,
      'profile:cosmopolitan': 10,
    },
    '2010': {
      'profile:aramaic': 140,      // ~14% Qatari
      'profile:bharatic': 200,     // ~20% Indian
      'profile:gorkhalic': 150,    // ~15% Nepali (WC construction)
      'profile:gangetic': 130,     // ~13% Bangladeshi
      'profile:maharlikan': 100,   // ~10% Filipino
      'profile:dravidic': 80,
      'profile:sindhukan': 70,
      'profile:alvionic': 50,
      'profile:deshretine': 40,
      'profile:parsic': 20,
      'profile:sawahili': 10,
      'profile:cosmopolitan': 10,
    },
    '2020': {
      'profile:aramaic': 120,      // ~12% Qatari
      'profile:bharatic': 220,     // ~22% Indian
      'profile:gorkhalic': 160,    // ~16% Nepali
      'profile:gangetic': 130,     // ~13% Bangladeshi
      'profile:maharlikan': 100,   // ~10% Filipino
      'profile:dravidic': 70,
      'profile:sindhukan': 60,
      'profile:alvionic': 60,      // Western professionals
      'profile:deshretine': 40,
      'profile:parsic': 20,
      'profile:sawahili': 10,
      'profile:cosmopolitan': 10,
    },
  },

  // Kuwait - ~70% expat (large Egyptian/Arab expat community)
  KWT: {
    '1960': {
      'profile:aramaic': 700,
      'profile:parsic': 150,       // Iranian traders
      'profile:bharatic': 100,
      'profile:dravidic': 50,
    },
    '1970': {
      'profile:aramaic': 500,
      'profile:deshretine': 150,   // Egyptian teachers/professionals
      'profile:bharatic': 120,
      'profile:dravidic': 80,
      'profile:parsic': 70,
      'profile:sindhukan': 50,
      'profile:alvionic': 30,
    },
    '1980': {
      'profile:aramaic': 400,
      'profile:deshretine': 180,
      'profile:bharatic': 140,
      'profile:dravidic': 80,
      'profile:sindhukan': 60,
      'profile:parsic': 50,
      'profile:maharlikan': 40,
      'profile:alvionic': 30,
      'profile:gangetic': 20,
    },
    '1990': {
      'profile:aramaic': 450,      // Post-Gulf War, many expats left
      'profile:deshretine': 150,
      'profile:bharatic': 130,
      'profile:dravidic': 70,
      'profile:sindhukan': 60,
      'profile:maharlikan': 50,
      'profile:parsic': 40,
      'profile:alvionic': 30,
      'profile:gangetic': 20,
    },
    '2000': {
      'profile:aramaic': 350,
      'profile:bharatic': 180,
      'profile:deshretine': 130,
      'profile:dravidic': 80,
      'profile:gangetic': 80,
      'profile:sindhukan': 60,
      'profile:maharlikan': 60,
      'profile:parsic': 25,
      'profile:alvionic': 25,
      'profile:sawahili': 10,
    },
    '2010': {
      'profile:aramaic': 320,      // ~32% Kuwaiti
      'profile:bharatic': 180,     // ~18% Indian
      'profile:deshretine': 120,   // ~12% Egyptian
      'profile:gangetic': 100,     // ~10% Bangladeshi
      'profile:maharlikan': 80,    // ~8% Filipino
      'profile:dravidic': 60,
      'profile:sindhukan': 50,
      'profile:parsic': 30,
      'profile:alvionic': 30,
      'profile:sawahili': 15,
      'profile:cosmopolitan': 15,
    },
    '2020': {
      'profile:aramaic': 300,      // ~30% Kuwaiti
      'profile:bharatic': 210,     // ~21% Indian
      'profile:deshretine': 150,   // ~15% Egyptian
      'profile:gangetic': 100,     // ~10% Bangladeshi
      'profile:maharlikan': 80,    // ~8% Filipino
      'profile:dravidic': 50,
      'profile:sindhukan': 40,
      'profile:parsic': 20,
      'profile:alvionic': 25,
      'profile:sawahili': 10,
      'profile:cosmopolitan': 15,
    },
  },

  // Bahrain - ~55% expat (more integrated, older trade history)
  BHR: {
    '1960': {
      'profile:aramaic': 750,
      'profile:parsic': 150,       // Long Iranian presence
      'profile:bharatic': 70,
      'profile:dravidic': 30,
    },
    '1970': {
      'profile:aramaic': 650,
      'profile:parsic': 120,
      'profile:bharatic': 100,
      'profile:dravidic': 60,
      'profile:alvionic': 40,
      'profile:sindhukan': 30,
    },
    '1980': {
      'profile:aramaic': 550,
      'profile:bharatic': 140,
      'profile:dravidic': 80,
      'profile:parsic': 80,
      'profile:sindhukan': 50,
      'profile:alvionic': 40,
      'profile:maharlikan': 30,
      'profile:gangetic': 30,
    },
    '1990': {
      'profile:aramaic': 500,
      'profile:bharatic': 160,
      'profile:dravidic': 90,
      'profile:parsic': 70,
      'profile:sindhukan': 50,
      'profile:gangetic': 50,
      'profile:maharlikan': 40,
      'profile:alvionic': 30,
      'profile:deshretine': 10,
    },
    '2000': {
      'profile:aramaic': 480,
      'profile:bharatic': 170,
      'profile:dravidic': 90,
      'profile:gangetic': 70,
      'profile:sindhukan': 50,
      'profile:maharlikan': 50,
      'profile:parsic': 40,
      'profile:alvionic': 30,
      'profile:deshretine': 15,
      'profile:cosmopolitan': 5,
    },
    '2010': {
      'profile:aramaic': 460,      // ~46% Bahraini
      'profile:bharatic': 180,     // ~18% Indian
      'profile:dravidic': 90,
      'profile:gangetic': 80,      // ~8% Bangladeshi
      'profile:sindhukan': 50,     // ~5% Pakistani
      'profile:maharlikan': 50,
      'profile:parsic': 35,
      'profile:alvionic': 30,
      'profile:deshretine': 15,
      'profile:cosmopolitan': 10,
    },
    '2020': {
      'profile:aramaic': 450,      // ~45% Bahraini
      'profile:bharatic': 200,     // ~20% Indian
      'profile:dravidic': 80,
      'profile:gangetic': 100,     // ~10% Bangladeshi
      'profile:sindhukan': 50,
      'profile:maharlikan': 45,
      'profile:parsic': 30,
      'profile:alvionic': 25,
      'profile:deshretine': 10,
      'profile:cosmopolitan': 10,
    },
  },

  // Oman - ~46% expat (more balanced, slower development)
  OMN: {
    '1960': {
      'profile:aramaic': 900,
      'profile:parsic': 50,
      'profile:bharatic': 30,
      'profile:sawahili': 20,      // Zanzibar connection
    },
    '1970': {
      'profile:aramaic': 800,
      'profile:bharatic': 80,
      'profile:parsic': 40,
      'profile:dravidic': 40,
      'profile:sawahili': 25,
      'profile:alvionic': 15,
    },
    '1980': {
      'profile:aramaic': 650,
      'profile:bharatic': 130,
      'profile:dravidic': 70,
      'profile:gangetic': 50,
      'profile:parsic': 30,
      'profile:sindhukan': 30,
      'profile:sawahili': 20,
      'profile:alvionic': 20,
    },
    '1990': {
      'profile:aramaic': 600,
      'profile:bharatic': 150,
      'profile:dravidic': 80,
      'profile:gangetic': 70,
      'profile:sindhukan': 35,
      'profile:maharlikan': 25,
      'profile:parsic': 20,
      'profile:sawahili': 10,
      'profile:alvionic': 10,
    },
    '2000': {
      'profile:aramaic': 580,
      'profile:bharatic': 160,
      'profile:gangetic': 100,
      'profile:dravidic': 60,
      'profile:sindhukan': 35,
      'profile:maharlikan': 30,
      'profile:parsic': 15,
      'profile:alvionic': 10,
      'profile:sawahili': 5,
      'profile:cosmopolitan': 5,
    },
    '2010': {
      'profile:aramaic': 560,      // ~56% Omani
      'profile:bharatic': 170,     // ~17% Indian
      'profile:gangetic': 120,     // ~12% Bangladeshi
      'profile:dravidic': 50,
      'profile:sindhukan': 40,
      'profile:maharlikan': 30,
      'profile:parsic': 10,
      'profile:alvionic': 10,
      'profile:sawahili': 5,
      'profile:cosmopolitan': 5,
    },
    '2020': {
      'profile:aramaic': 540,      // ~54% Omani
      'profile:bharatic': 180,     // ~18% Indian
      'profile:gangetic': 130,     // ~13% Bangladeshi
      'profile:dravidic': 50,
      'profile:sindhukan': 40,
      'profile:maharlikan': 30,
      'profile:parsic': 10,
      'profile:alvionic': 10,
      'profile:cosmopolitan': 10,
    },
  },

  // Saudi Arabia - ~38% expat (largest absolute numbers due to population)
  SAU: {
    '1960': {
      'profile:aramaic': 950,
      'profile:bharatic': 30,
      'profile:parsic': 20,
    },
    '1970': {
      'profile:aramaic': 850,
      'profile:deshretine': 50,    // Egyptian professionals
      'profile:bharatic': 40,
      'profile:sindhukan': 30,
      'profile:parsic': 20,
      'profile:alvionic': 10,
    },
    '1980': {
      'profile:aramaic': 700,
      'profile:bharatic': 80,
      'profile:deshretine': 70,
      'profile:sindhukan': 50,
      'profile:dravidic': 30,
      'profile:gangetic': 20,
      'profile:maharlikan': 20,
      'profile:parsic': 15,
      'profile:alvionic': 15,
    },
    '1990': {
      'profile:aramaic': 680,
      'profile:bharatic': 90,
      'profile:deshretine': 70,
      'profile:sindhukan': 55,
      'profile:dravidic': 30,
      'profile:gangetic': 25,
      'profile:maharlikan': 25,
      'profile:parsic': 10,
      'profile:alvionic': 15,
    },
    '2000': {
      'profile:aramaic': 660,
      'profile:bharatic': 100,
      'profile:deshretine': 60,
      'profile:sindhukan': 55,
      'profile:gangetic': 40,
      'profile:dravidic': 30,
      'profile:maharlikan': 25,
      'profile:alvionic': 15,
      'profile:parsic': 10,
      'profile:cosmopolitan': 5,
    },
    '2010': {
      'profile:aramaic': 640,      // ~64% Saudi
      'profile:bharatic': 110,     // ~11% Indian
      'profile:gangetic': 60,      // ~6% Bangladeshi
      'profile:sindhukan': 55,     // ~5.5% Pakistani
      'profile:deshretine': 50,    // ~5% Egyptian
      'profile:dravidic': 25,
      'profile:maharlikan': 25,
      'profile:alvionic': 15,
      'profile:parsic': 10,
      'profile:cosmopolitan': 10,
    },
    '2020': {
      'profile:aramaic': 620,      // ~62% Saudi
      'profile:bharatic': 130,     // ~13% Indian
      'profile:gangetic': 70,      // ~7% Bangladeshi
      'profile:sindhukan': 60,     // ~6% Pakistani
      'profile:deshretine': 50,    // ~5% Egyptian
      'profile:dravidic': 20,
      'profile:maharlikan': 20,
      'profile:alvionic': 15,
      'profile:parsic': 5,
      'profile:cosmopolitan': 10,
    },
  },
};

const priorsPath = resolve(__dirname, '../public/agent-priors.v1.json');
const priors: Priors = JSON.parse(readFileSync(priorsPath, 'utf-8'));

console.log('Fixing Gulf States expatriate population weights...\n');

let countriesFixed = 0;
let bucketsFixed = 0;

for (const [iso3, yearWeights] of Object.entries(gulfCorrections)) {
  const country = priors.countries[iso3];
  if (!country) {
    console.log(`Warning: Country ${iso3} not found in priors`);
    continue;
  }

  let countryBucketsFixed = 0;
  for (const [year, newWeights] of Object.entries(yearWeights)) {
    const bucket = country.buckets[year];
    if (bucket) {
      // Verify weights sum to ~1000
      const sum = Object.values(newWeights).reduce((a, b) => a + b, 0);
      if (sum < 990 || sum > 1010) {
        console.log(`Warning: ${iso3} ${year} weights sum to ${sum}, not 1000`);
      }
      bucket.cultureProfileWeights01k = newWeights;
      countryBucketsFixed++;
    }
  }

  if (countryBucketsFixed > 0) {
    countriesFixed++;
    bucketsFixed += countryBucketsFixed;
    console.log(`${iso3}: Fixed ${countryBucketsFixed} buckets`);
  }
}

console.log(`\nFixed ${bucketsFixed} buckets across ${countriesFixed} countries\n`);

// Verify some key corrections
console.log('Verification (2020 values - top 5 cultures):');
const verifyCountries = ['ARE', 'QAT', 'KWT', 'SAU'];
for (const iso3 of verifyCountries) {
  const country = priors.countries[iso3];
  if (country) {
    const bucket2020 = country.buckets['2020'];
    if (bucket2020?.cultureProfileWeights01k) {
      const sorted = Object.entries(bucket2020.cultureProfileWeights01k)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k, v]) => `${k.replace('profile:', '')}:${v}`)
        .join(', ');
      console.log(`  ${iso3}: ${sorted}`);
    }
  }
}

writeFileSync(priorsPath, JSON.stringify(priors, null, 2));
console.log('\nSaved updated priors to', priorsPath);

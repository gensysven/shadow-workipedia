#!/usr/bin/env npx tsx
/**
 * Verify shadow naming v3 fix
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateAgent, type AgentVocabV1, type AgentPriorsV1, type ShadowCountryMapEntry } from '../src/agent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadJsonFile<T>(relativePath: string): T {
  const fullPath = resolve(__dirname, '..', relativePath);
  const content = readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as T;
}

const vocab = loadJsonFile<AgentVocabV1>('public/agent-vocab.v1.json');
const priors = loadJsonFile<AgentPriorsV1>('public/agent-priors.v1.json');
const countries = loadJsonFile<ShadowCountryMapEntry[]>('public/shadow-country-map.json');

console.log('=== Shadow Naming v3 Verification ===\n');

let errors = 0;

// 1. Verify NEW country names (v3)
console.log('1. Checking v3 country renames...');
const v3Countries: Record<string, string> = {
  'CHN': 'Zhonghua',       // was Serindar
  'USA': 'Amaran',         // unchanged
  'RUS': 'Holmgardic',     // was Hyperborine
  'PHL': 'Suvarnadvipa',   // unchanged
  'JPN': 'Yamatune',       // was Cipangar
  'DEU': 'Teutonine',      // was Cheruscia
  'IND': 'Jambudine',      // was Bhumi
  'FRA': 'Gallicor',       // was Lutetiane
  'KOR': 'Gogurine',       // was Samhanic
  'GBR': 'Alvion',         // unchanged
  'AUS': 'Eoranic',        // unchanged
  'ETH': 'Habashune',      // was Aksumite
  'GRC': 'Achaemene',      // was Pelasgia
  'BGR': 'Thrakune',       // was Odrysia
  'HUN': 'Pannoniar',      // was Avarine
  'ROU': 'Wallachune',     // was Geticia
  'MNE': 'Crnojevic',      // was Dioclea
  'ALB': 'Illyrine',       // was Epirote
  'HRV': 'Ragusine',       // was Dalmatine
  'LKA': 'Serendivine',    // was Taprobane
  'JOR': 'Petraene',       // was Nabatara
  'SYR': 'Tadmorine',      // was Palmyrene
  'LBN': 'Gebeline',       // was Tyrine
  'DZA': 'Numidar',        // was Masinissic
  'TUN': 'Maghrabi',       // was Byrsunic
  'KHM': 'Nokorune',       // was Khmerune
  'THA': 'Siamune',        // was Ayutthane
  'VNM': 'Annamune',       // was Champaric
  'BOL': 'Qollaric',       // was Tiahuanacine
  'COL': 'Muyscane',       // was Chibchane
  'PER': 'Tawantine',      // was Warine
  'MEX': 'Aztlanic',       // was Toltecane
  'POL': 'Vistuline',      // was Lechitia
  'ESP': 'Iberune',        // was Tartessic
  'TWN': 'Formosune',      // was Tayovani
};

for (const [iso3, expected] of Object.entries(v3Countries)) {
  const country = countries.find(c => c.iso3 === iso3);
  if (!country) {
    console.log(`  ✗ NOT FOUND: ${iso3}`);
    errors++;
  } else if (country.shadow !== expected) {
    console.log(`  ✗ WRONG: ${iso3} = "${country.shadow}" (expected "${expected}")`);
    errors++;
  } else {
    console.log(`  ✓ ${iso3} = ${country.shadow}`);
  }
}

// 2. Verify continent names (v3)
console.log('\n2. Checking v3 continent names...');
const v3Continents: Record<string, string> = {
  'IND': 'Sindhara',       // Asia
  'CHN': 'Sindhara',       // Asia
  'JPN': 'Sindhara',       // Asia
  'MEX': 'Cibolar',        // N. America
  'USA': 'Cibolar',        // N. America
  'BRA': 'Chimora',        // S. America
  'ARG': 'Chimora',        // S. America
  'SAU': 'Mashriqi',       // Middle East (was Nabatine)
  'IRN': 'Mashriqi',       // Middle East (was Nabatine)
  'JOR': 'Mashriqi',       // Middle East (was Nabatine)
  'DEU': 'Abendar',        // Europe
  'NGA': 'Mero',           // Africa
  'AUS': 'Pelag',          // Oceania
};

for (const [iso3, expected] of Object.entries(v3Continents)) {
  const country = countries.find(c => c.iso3 === iso3);
  if (!country) {
    console.log(`  ✗ NOT FOUND: ${iso3}`);
    errors++;
  } else if (country.continent !== expected) {
    console.log(`  ✗ WRONG: ${iso3} continent = "${country.continent}" (expected "${expected}")`);
    errors++;
  } else {
    console.log(`  ✓ ${iso3} continent = ${country.continent}`);
  }
}

// 3. Verify continent distribution
console.log('\n3. Checking continent counts...');
const continentCounts: Record<string, number> = {};
for (const country of countries) {
  continentCounts[country.continent] = (continentCounts[country.continent] ?? 0) + 1;
}

const expectedContinents = ['Abendar', 'Sindhara', 'Mero', 'Mashriqi', 'Pelag', 'Cibolar', 'Chimora'];
const oldContinents = ['Nabatine', 'Uttara', 'Aram', 'Anahuac', 'Tahuantin'];

for (const expected of expectedContinents) {
  if (continentCounts[expected] && continentCounts[expected] > 0) {
    console.log(`  ✓ ${expected}: ${continentCounts[expected]} countries`);
  } else {
    console.log(`  ✗ MISSING: ${expected}`);
    errors++;
  }
}

for (const old of oldContinents) {
  if (continentCounts[old] && continentCounts[old] > 0) {
    console.log(`  ✗ STILL EXISTS: ${old} (${continentCounts[old]} countries)`);
    errors++;
  }
}

// 4. Verify old problematic names are gone
console.log('\n4. Checking old problematic names removed...');
const oldProblematicNames = [
  'Aksumite', 'Hyperborine', 'Pelasgia', 'Palmyrene', 'Nabatara',
  'Taprobane', 'Bhumi', 'Cipangar', 'Serindar', 'Cheruscia',
  'Lutetiane', 'Samhanic', 'Avarine', 'Geticia', 'Odrysia',
  'Epirote', 'Dalmatine', 'Dioclea', 'Tyrine', 'Masinissic',
  'Byrsunic', 'Khmerune', 'Ayutthane', 'Champaric', 'Tiahuanacine',
  'Chibchane', 'Warine', 'Toltecane', 'Lechitia', 'Tartessic', 'Tayovani'
];

for (const oldName of oldProblematicNames) {
  const found = countries.find(c => c.shadow === oldName);
  if (found) {
    console.log(`  ✗ STILL EXISTS: ${oldName} (${found.iso3})`);
    errors++;
  } else {
    console.log(`  ✓ Removed: ${oldName}`);
  }
}

// 5. Generate test agents
console.log('\n5. Generating test agents...');
const testCountries = ['USA', 'CHN', 'RUS', 'JPN', 'IND', 'DEU', 'BRA', 'MEX', 'ETH', 'GRC', 'JOR', 'LKA'];

for (const iso3 of testCountries) {
  try {
    const agent = generateAgent({
      seed: 'v3-verify-' + iso3,
      vocab,
      priors,
      countries,
      asOfYear: 2024,
      homeCountryIso3: iso3,
      includeTrace: true,
    });

    const countryEntry = countries.find(c => c.iso3 === iso3);
    console.log(`  ✓ ${iso3} (${countryEntry?.shadow}): ${agent.identity.name}`);
  } catch (err) {
    console.log(`  ✗ ${iso3}: ERROR - ${err}`);
    errors++;
  }
}

// Summary
console.log('\n=== Summary ===');
if (errors === 0) {
  console.log('✓ All v3 verifications passed!');
} else {
  console.log(`✗ ${errors} error(s) found`);
  process.exit(1);
}

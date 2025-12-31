#!/usr/bin/env npx tsx
/**
 * Verify comprehensive shadow naming fix
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

console.log('=== Comprehensive Shadow Naming Verification ===\n');

let errors = 0;

// 1. Verify critical country renames
console.log('1. Checking critical country renames...');
const criticalCountries: Record<string, string> = {
  'CHN': 'Yanzhou',
  'USA': 'Turtlemark',
  'RUS': 'Gardarike',
  'PHL': 'Suvarnadvipa',
  'JPN': 'Akitsukuni',
  'DEU': 'Austrasien',
  'IND': 'Jambudvipa',
};

for (const [iso3, expected] of Object.entries(criticalCountries)) {
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

// 2. Verify continent assignments fixed
console.log('\n2. Checking continent assignments...');
const continentChecks: Record<string, string> = {
  'IND': 'Uttara',       // Was incorrectly Athar
  'TZA': 'Mero',         // Was incorrectly Athar
  'AUT': 'Abendar',      // Was incorrectly Athar (now Hesper renamed to Abendar)
  'BEL': 'Abendar',      // Was incorrectly Athar
  'VNM': 'Uttara',       // Was incorrectly Athar
  'TUR': 'Aram',         // Was incorrectly Athar
};

for (const [iso3, expected] of Object.entries(continentChecks)) {
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

// 3. Verify continent names changed
console.log('\n3. Checking continent renames...');
const continentCounts: Record<string, number> = {};
for (const country of countries) {
  continentCounts[country.continent] = (continentCounts[country.continent] ?? 0) + 1;
}

const expectedContinents = ['Abendar', 'Uttara', 'Mero', 'Aram', 'Pelag', 'Anahuac', 'Tahuantin'];
const oldContinents = ['Hesper', 'Solis', 'Athar', 'Verd'];

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

// 4. Verify problematic profiles removed
console.log('\n4. Checking problematic profiles removed...');
const problematicProfiles = [
  'profile:mauryanic',
  'profile:sindhukan',
  'profile:zhonghuaic',
  'profile:antillean',
  'profile:oceanic',
  'profile:chicanic',
  'profile:cosmopolitan',
  'profile:alvionic',
];

const vocabProfiles = Object.keys(vocab.microCultureProfiles ?? {});
for (const profile of problematicProfiles) {
  if (vocabProfiles.includes(profile)) {
    console.log(`  ✗ STILL EXISTS: ${profile}`);
    errors++;
  } else {
    console.log(`  ✓ Removed: ${profile}`);
  }
}

// 5. Verify new profiles exist
console.log('\n5. Checking new profiles exist...');
const newProfiles = [
  'profile:magadhic',
  'profile:harappic',
  'profile:huaxiac',
  'profile:lucayan',
  'profile:wayfindric',
  'profile:aztlanic',
  'profile:meridian',
  'profile:tyndallic',
];

for (const profile of newProfiles) {
  if (!vocabProfiles.includes(profile)) {
    console.log(`  ✗ MISSING: ${profile}`);
    errors++;
  } else {
    console.log(`  ✓ ${profile}`);
  }
}

// 6. Generate test agents
console.log('\n6. Generating test agents...');
const testCountries = ['USA', 'CHN', 'RUS', 'JPN', 'IND', 'DEU', 'ARE'];

for (const iso3 of testCountries) {
  try {
    const agent = generateAgent({
      seed: 'verify-' + iso3,
      vocab,
      priors,
      countries,
      asOfYear: 2024,
      homeCountryIso3: iso3,
      includeTrace: true,
    });

    const trace = agent.generationTrace;
    const microTop = (trace?.derived?.microCultureProfilesTop as Array<{profileId: string}> | undefined);
    const topProfile = microTop?.[0]?.profileId ?? 'none';
    const countryEntry = countries.find(c => c.iso3 === iso3);

    console.log(`  ✓ ${iso3} (${countryEntry?.shadow}): ${agent.identity.name} - ${topProfile}`);
  } catch (err) {
    console.log(`  ✗ ${iso3}: ERROR - ${err}`);
    errors++;
  }
}

// 7. Check homeCultures updated
console.log('\n7. Checking homeCultures in vocab...');
const homeCultures = vocab.identity?.homeCultures ?? [];
// Tahuantin (South America) may not have been a separate homeCulture originally
const expectedHomeCultures = ['Abendar', 'Uttara-South', 'Uttara-East', 'Anahuac-West'];

for (const expected of expectedHomeCultures) {
  if (homeCultures.includes(expected)) {
    console.log(`  ✓ ${expected}`);
  } else {
    console.log(`  ✗ MISSING: ${expected}`);
    errors++;
  }
}

// Summary
console.log('\n=== Summary ===');
if (errors === 0) {
  console.log('✓ All verifications passed!');
} else {
  console.log(`✗ ${errors} error(s) found`);
  process.exit(1);
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRealCountries } from './sync-real-geography';

type JsonRecord = Record<string, unknown>;

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const parentRoot = resolve(projectRoot, '..');

const retiredNames = readFileSync(resolve(projectRoot, 'scripts/fixtures/retired-geography-names.txt'), 'utf8')
  .split(/\r?\n/g)
  .map((name) => name.trim())
  .filter(Boolean);

function loadRecords(path: string): JsonRecord[] {
  const value = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  assert.ok(Array.isArray(value), `${path} must contain an array`);
  return value as JsonRecord[];
}

const canon = loadRecords(resolve(parentRoot, 'data/country-map.json'));
const countries = loadRecords(resolve(projectRoot, 'public/shadow-country-map.json'));
const cultures = loadRecords(resolve(projectRoot, 'public/shadow-culture-map.json'));
const languages = loadRecords(resolve(projectRoot, 'public/shadow-language-map.json'));
const ethnolinguistic = loadRecords(resolve(projectRoot, 'public/shadow-ethnolinguistic-map.json'));
const generatedCountries = loadRealCountries();

const realContinents = new Set([
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'Oceania',
  'South America',
]);

assert.equal(countries.length, canon.length, 'Workipedia must include every canonical country');
assert.deepEqual(countries, generatedCountries, 'the public country map must be reproducible from canon and description sources');
assert.deepEqual(
  new Set(countries.map((entry) => entry.iso3)),
  new Set(canon.map((entry) => entry.iso3)),
  'Workipedia and the parent canon must use the same ISO3 keys',
);

for (const entry of countries) {
  assert.equal(typeof entry.real, 'string', `country ${String(entry.iso3)} is missing its real name`);
  assert.equal('shadow' in entry, false, `country ${String(entry.iso3)} retains the retired shadow key`);
  assert.ok(realContinents.has(String(entry.continent)), `country ${String(entry.iso3)} has a fictional continent`);
}

const countryByIso3 = new Map(countries.map((entry) => [entry.iso3, entry]));
assert.equal(countryByIso3.get('USA')?.real, 'United States');
assert.equal(countryByIso3.get('CHN')?.real, 'China');

for (const [label, entries] of [
  ['culture', cultures],
  ['language', languages],
  ['ethnolinguistic', ethnolinguistic],
] as const) {
  assert.ok(entries.length > 0, `${label} map must not be empty`);
  for (const entry of entries) {
    assert.equal(typeof entry.real, 'string', `${label} map entry is missing its real identifier`);
    assert.equal('shadow' in entry, false, `${label} map entry retains the retired shadow key`);
  }
}

const attributiveContinent = /\b(?:Africa|Asia|Europe|North America|Oceania|South America)\s+(?:archipelago|civilization|coastal|colossus|continents?|country|crossroads|cultures?|democracy|engagement|federation|faith|geography|heritage|highland|hub|institutions?|island|micro-state|migration|nation|petro-state|power|realities|regional|spheres?|special|state|sultanate|superpower|technological|territory)\b/i;
for (const entry of countries) {
  const description = typeof entry.description === 'string' ? entry.description : '';
  assert.equal(
    attributiveContinent.test(description),
    false,
    `country ${String(entry.iso3)} uses a continent noun as an adjective: ${description}`,
  );
}

const generatedGeography = JSON.stringify({ countries, cultures, languages, ethnolinguistic });
for (const retiredName of retiredNames) {
  assert.equal(generatedGeography.includes(retiredName), false, `generated geography still contains ${retiredName}`);
}

console.log(`real geography contract passed for ${countries.length} countries`);

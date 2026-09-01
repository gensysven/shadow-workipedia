import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type CanonicalCountry = {
  real: string;
  iso3: string;
  continent: string;
  population: number;
};

type CountryDescription = {
  iso3: string;
  description: string;
};

export type RealCountry = CanonicalCountry & {
  description: string;
};

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const parentRoot = resolve(projectRoot, '..');
const countryCanonPath = resolve(parentRoot, 'data/country-map.json');
const countryDescriptionsPath = resolve(projectRoot, 'data/country-descriptions.json');
const countryOutputPath = resolve(projectRoot, 'public/shadow-country-map.json');

function readArray<T>(path: string): T[] {
  const value = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (!Array.isArray(value)) throw new Error(`${path} must contain an array`);
  return value as T[];
}

function formatCountryName(raw: string): string {
  const normalized = raw.trim().replace(/_/g, ' ');
  if (normalized === 'UAE') return normalized;
  const lower = normalized.toLocaleLowerCase('en-US');
  const title = lower.replace(/(^|[\s(,\/\-])([\p{L}])/gu, (_match, prefix: string, letter: string) => (
    `${prefix}${letter.toLocaleUpperCase('en-US')}`
  ));
  return title.replace(/\b(And|Of|The)\b/g, (word) => word.toLocaleLowerCase('en-US'));
}

export function loadRealCountries(): RealCountry[] {
  const canon = readArray<CanonicalCountry>(countryCanonPath);
  const descriptions = readArray<CountryDescription>(countryDescriptionsPath);
  const descriptionsByIso3 = new Map(descriptions.map((entry) => [entry.iso3, entry.description.trim()]));

  if (descriptionsByIso3.size !== descriptions.length) {
    throw new Error(`${countryDescriptionsPath} contains duplicate ISO3 keys`);
  }

  const countries = canon.map((entry) => {
    const iso3 = entry.iso3.trim().toUpperCase();
    const description = descriptionsByIso3.get(iso3);
    if (!description) throw new Error(`${countryDescriptionsPath} is missing ${iso3}`);
    descriptionsByIso3.delete(iso3);

    return {
      real: formatCountryName(entry.real),
      iso3,
      continent: entry.continent.trim(),
      population: entry.population,
      description,
    };
  });

  if (descriptionsByIso3.size > 0) {
    throw new Error(`${countryDescriptionsPath} contains unknown ISO3 keys: ${[...descriptionsByIso3.keys()].join(', ')}`);
  }

  return countries;
}

export function syncRealGeography(): void {
  const countries = loadRealCountries();
  writeFileSync(countryOutputPath, `${JSON.stringify(countries, null, 2)}\n`);
  console.log(`Synced real geography for ${countries.length} countries from ${countryCanonPath}`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) syncRealGeography();

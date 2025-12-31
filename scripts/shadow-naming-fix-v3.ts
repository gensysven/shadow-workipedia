#!/usr/bin/env npx tsx
/**
 * Shadow Naming Fix v3 - Final cleanup
 *
 * Fixes remaining problematic names identified in post-v2 review:
 * - Direct kingdom/empire names (Aksumite, Palmyrene, etc.)
 * - Academic terms historians recognize
 * - Famous mythological references
 * - Real ancient names with minor modifications
 *
 * Gene Wolfe/Miéville principles:
 * - Oblique references that reward research
 * - Etymological depth from unexpected sources
 * - Avoid textbook terminology
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const projectRoot = resolve(import.meta.dirname, '..');

// ============================================================================
// PROBLEMATIC COUNTRY RENAMES (Most Obvious - Must Fix)
// ============================================================================

const countryRenames: Record<string, string> = {
  // AFRICA - Academic/Kingdom names
  'Aksumite': 'Habashune',        // ETH - From Habesha (self-designation), abstracted
  'Masinissic': 'Numidar',        // DZA - Invented, evokes Numidia without being direct
  'Byrsunic': 'Maghrabi',         // TUN - From Maghreb but sufficiently common

  // MIDDLE EAST / MEDITERRANEAN - Famous ancient names
  'Petraene': 'Petraene',         // JOR - From Petra but altered ending
  'Palmyrene': 'Tadmorine',       // SYR - From Tadmor (Semitic name for Palmyra)
  'Tyrine': 'Gebeline',           // LBN - From Gebal (Byblos), more obscure

  // EUROPE - Academic terms
  'Holmgardic': 'Holmgardic',    // RUS - From Holmgard (Norse name for Novgorod)
  'Pelasgia': 'Achaemene',        // GRC - From Achaea but altered (not the Persian one)
  'Odrysia': 'Thrakune',          // BGR - Simplified from Thrace, less academic
  'Avarine': 'Pannoniar',         // HUN - From Pannonia, Roman province name
  'Geticia': 'Wallachune',        // ROU - From Wallachia, medieval name
  'Crnojevic': 'Crnojevic',         // MNE - From Crnojević dynasty, obscure
  'Epirote': 'Illyrine',          // ALB - From Illyria but altered
  'Dalmatine': 'Ragusine',        // HRV - From Ragusa (Dubrovnik), more poetic

  // SOUTH ASIA - Too direct
  'Serendivine': 'Serendivine',     // LKA - From Serendib (Arabic), source of "serendipity"
  'Jambudine': 'Jambudine',           // IND - From Jambudvipa but altered ending

  // SOUTHEAST ASIA - Kingdom names
  'Khmerune': 'Nokorune',         // KHM - From Nokor (Khmer word for kingdom)
  'Ayutthane': 'Siamune',         // THA - From Siam, historical but not academic
  'Champaric': 'Annamune',        // VNM - From Annam, less obvious than Champa

  // EAST ASIA - Needs more abstraction
  'Gogurine': 'Gogurine',         // KOR - From Goguryeo but heavily altered
  'Yamatune': 'Yamatune',         // JPN - From Yamato, ancient but less Marco Polo

  // AMERICAS - Archaeological terms
  'Tiahuanacine': 'Qollaric',     // BOL - From Qolla people (Aymara ancestors)
  'Chibchane': 'Muyscane',        // COL - From Muysca (alternate spelling/form)
  'Warine': 'Tawantine',          // PER - From Tawantin (four), evokes Tawantinsuyu obliquely
  'Toltecane': 'Aztlanic',        // MEX - From Aztlan (mythical homeland)

  // NEEDS WORK - Making more obscure
  'Zhonghua': 'Zhonghua',         // CHN - From Zhonghua (Chinese self-name), altered
  'Teutonine': 'Teutonine',       // DEU - From Teuton, more familiar but vaguer
  'Gallicor': 'Gallicor',        // FRA - From Gallic but invented ending
  'Lechitia': 'Vistuline',        // POL - From Vistula river
  'Tartessic': 'Iberune',         // ESP - From Iberia, simpler
  'Tayovani': 'Formosune',        // TWN - From Formosa but altered
};

// ============================================================================
// CONTINENT NAMES - One more fix
// ============================================================================

const continentRenames: Record<string, string> = {
  // Mashriqi is still too academic (from Nabataean)
  'Mashriqi': 'Mashriqi',         // From Mashriq (Arabic for "east/Levant")
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceAll(content: string, oldStr: string, newStr: string): string {
  return content.replace(new RegExp(escapeRegex(oldStr), 'g'), newStr);
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('=== Shadow Naming Fix v3 ===\n');

  let totalChanges = 0;

  // 1. Update shadow-country-map.json
  console.log('1. Updating shadow-country-map.json...');
  const countryMapPath = resolve(projectRoot, 'public/shadow-country-map.json');
  let countryContent = readFileSync(countryMapPath, 'utf-8');

  // Continent renames
  for (const [oldName, newName] of Object.entries(continentRenames)) {
    const before = countryContent;
    countryContent = replaceAll(countryContent, `"continent": "${oldName}"`, `"continent": "${newName}"`);
    countryContent = replaceAll(countryContent, ` ${oldName} `, ` ${newName} `);
    countryContent = replaceAll(countryContent, `"${oldName} `, `"${newName} `);
    countryContent = replaceAll(countryContent, ` ${oldName}"`, ` ${newName}"`);
    countryContent = replaceAll(countryContent, ` ${oldName}.`, ` ${newName}.`);
    countryContent = replaceAll(countryContent, ` ${oldName},`, ` ${newName},`);
    if (countryContent !== before) {
      console.log(`  ✓ Continent: ${oldName} → ${newName}`);
      totalChanges++;
    }
  }

  // Country renames
  for (const [oldName, newName] of Object.entries(countryRenames)) {
    const before = countryContent;
    countryContent = replaceAll(countryContent, `"shadow": "${oldName}"`, `"shadow": "${newName}"`);
    if (countryContent !== before) {
      console.log(`  ✓ Country: ${oldName} → ${newName}`);
      totalChanges++;
    }
  }

  writeFileSync(countryMapPath, countryContent);

  // 2. Update agent-vocab.v1.json
  console.log('\n2. Updating agent-vocab.v1.json...');
  const vocabPath = resolve(projectRoot, 'public/agent-vocab.v1.json');
  let vocabContent = readFileSync(vocabPath, 'utf-8');

  // Update homeCultures for continent rename
  for (const [oldName, newName] of Object.entries(continentRenames)) {
    const before = vocabContent;
    vocabContent = replaceAll(vocabContent, oldName, newName);
    if (vocabContent !== before) {
      console.log(`  ✓ Updated references: ${oldName} → ${newName}`);
      totalChanges++;
    }
  }

  writeFileSync(vocabPath, vocabContent);

  // 3. Update agent-priors.v1.json
  console.log('\n3. Updating agent-priors.v1.json...');
  const priorsPath = resolve(projectRoot, 'public/agent-priors.v1.json');
  let priorsContent = readFileSync(priorsPath, 'utf-8');

  for (const [oldName, newName] of Object.entries(continentRenames)) {
    priorsContent = replaceAll(priorsContent, oldName, newName);
  }

  writeFileSync(priorsPath, priorsContent);
  console.log('  ✓ Updated');

  // 4. Update shadow-culture-map.json
  console.log('\n4. Updating shadow-culture-map.json...');
  const cultureMapPath = resolve(projectRoot, 'public/shadow-culture-map.json');
  let cultureContent = readFileSync(cultureMapPath, 'utf-8');

  for (const [oldName, newName] of Object.entries(continentRenames)) {
    cultureContent = replaceAll(cultureContent, oldName, newName);
  }

  writeFileSync(cultureMapPath, cultureContent);
  console.log('  ✓ Updated');

  // 5. Update shadow-language-map.json
  console.log('\n5. Updating shadow-language-map.json...');
  const langMapPath = resolve(projectRoot, 'public/shadow-language-map.json');
  let langContent = readFileSync(langMapPath, 'utf-8');

  for (const [oldName, newName] of Object.entries(continentRenames)) {
    langContent = replaceAll(langContent, oldName, newName);
  }
  for (const [oldName, newName] of Object.entries(countryRenames)) {
    langContent = replaceAll(langContent, oldName, newName);
  }

  writeFileSync(langMapPath, langContent);
  console.log('  ✓ Updated');

  // 6. Update shadow-ethnolinguistic-map.json
  console.log('\n6. Updating shadow-ethnolinguistic-map.json...');
  const ethnoMapPath = resolve(projectRoot, 'public/shadow-ethnolinguistic-map.json');
  let ethnoContent = readFileSync(ethnoMapPath, 'utf-8');

  for (const [oldName, newName] of Object.entries(continentRenames)) {
    ethnoContent = replaceAll(ethnoContent, oldName, newName);
  }
  for (const [oldName, newName] of Object.entries(countryRenames)) {
    ethnoContent = replaceAll(ethnoContent, oldName, newName);
  }

  writeFileSync(ethnoMapPath, ethnoContent);
  console.log('  ✓ Updated');

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Continent renames: ${Object.keys(continentRenames).length}`);
  console.log(`Country renames: ${Object.keys(countryRenames).length}`);
  console.log(`\nTotal changes applied: ${totalChanges}`);
}

main();

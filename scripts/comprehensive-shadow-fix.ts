#!/usr/bin/env npx tsx
/**
 * Comprehensive Shadow Naming Fix
 *
 * Fixes ALL issues identified in the Gene Wolfe/Miéville naming review:
 * 1. Critical country name fixes (China, USA, Russia, etc.)
 * 2. Problematic micro-culture profiles (14 profiles)
 * 3. NEEDS WORK micro-culture profiles (29 profiles)
 * 4. Continent assignment errors
 * 5. Continent/macro-culture name fixes
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const projectRoot = resolve(import.meta.dirname, '..');

// ============================================================================
// COUNTRY NAME FIXES
// ============================================================================

const countryRenames: Record<string, string> = {
  // CRITICAL - Must rename
  'Zhonghua': 'Yanzhou',        // CHN - From Yan state (Warring States period)
  'Amaran': 'Turtlemark',       // USA - Turtle Island reference (Indigenous)
  'Luzvimin': 'Suvarnadvipa',   // PHL - Sanskrit "golden islands"
  'Severnya': 'Gardarike',      // RUS - Old Norse name for Russia

  // HIGH PRIORITY
  'Kamikura': 'Akitsukuni',     // JPN - Ancient poetic "land of dragonflies"
  'Bama': 'Irragadi',           // MMR - From Irrawaddy River
  'Madjarska': 'Pannoniar',     // HUN - From Roman Pannonia
  'Castillar': 'Iberiune',      // ESP - Ancient Iberia reference
  'Nadjara': 'Hijazine',        // SAU - From Hejaz region (less obvious)
  'Koryelik': 'Chosonri',       // PRK - From Joseon/Choson dynasty

  // NEEDS WORK countries
  'Helladyx': 'Achaevon',       // GRC - From Achaeans (Homeric Greeks)
  'Svearike': 'Svithjod',       // SWE - Old Norse mythological name
  'Skagenvik': 'Jutmark',       // DNK - From Jutland peninsula
  'Pohjanmaa': 'Kainuland',     // FIN - From Kainuu region (less known)
  'Hibern': 'Eirith',           // IRL - Corrupted Éire
  'Gotthardia': 'Raetiune',     // CHE - From Roman Raetia province
  'Vadutzya': 'Eschmark',       // LIE - From Eschnerberg area
  'Valletyne': 'Melitar',       // MLT - From ancient Melita
  'Snaeland': 'Gardarsholm',    // ISL - Norse discovery name
  'Vendla': 'Livmark',          // LVA - From Livonia
  'Gjakoveth': 'Dardanor',      // XKX - From ancient Dardania

  // Middle East fixes
  'Cedrane': 'Phoenikane',      // LBN - From Phoenicia
  'Kedareth': 'Judaemar',       // ISR - From Judaea
  'Kailesh': 'Failakine',       // KWT - From Failaka Island (ancient)

  // Asia fixes
  'Meishan': 'Formosane',       // TWN - From Portuguese "beautiful island"
  'Xianghai': 'Xianggang',      // HKG - Keep but note it's the actual name
  'Haojinkai': 'Haojing',       // MAC - Historical Portuguese-era name
  'Kambujadesh': 'Angkorine',   // KHM - From Angkor
  'Muanglao': 'Lanxandri',      // LAO - From Lan Xang kingdom
  'Drukpan': 'Menjongri',       // BTN - "Land of medicinal herbs"

  // Africa fixes
  'Hausal': 'Sokotine',         // NGA - From Sokoto Caliphate
  'Pwanite': 'Zanjibari',       // KEN - From historical Zanzibar influence
  'Ujijinde': 'Tanganyik',      // TZA - From Lake Tanganyika
  'Virungor': 'Rwandine',       // RWA - Keep simple but less obvious
  'Yamouskor': 'Assinian',      // CIV - From Assinie historical region
  'Sobhuzarani': 'Ngwaneland',  // SWZ - From Ngwane (historical name)
  'Kalaharix': 'Namaquar',      // NAM - From Namaqua people
  'Masvingost': 'Rozwine',      // ZWE - From Rozvi Empire
  'Sokotor': 'Songharik',       // NER - From Songhai Empire
  'Gabuenzi': 'Cacheumar',      // GNB - From Cacheu (historical port)
  'Kombostani': 'Senegambi',    // GMB - From Senegambia region

  // Americas fixes
  'Rioplatense': 'Platinar',    // ARG - Less obvious Rio de la Plata
  'Mapuchine': 'Araucani',      // CHL - From Araucania (colonial name)
  'Kholdomar': 'Muiscane',      // COL - From Muisca civilization
  'Orinoc': 'Caquetiar',        // VEN - From Caquetío people
  'Yguazu': 'Guaranine',        // PRY - From Guaraní people
  'Azucaran': 'Tainar',         // CUB - From Taíno people
  'Lempira': 'Copanec',         // HND - From Copán (Maya site)
  'Motagnari': 'Miskitune',     // NIC - From Miskito Coast
  'Panake': 'Darienor',         // PAN - From Darién region

  // Fix obvious ones we missed
  'Tescali': 'Anahuacor',       // MEX - From Anahuac (Aztec heartland)
};

// ============================================================================
// MICRO-CULTURE PROFILE FIXES
// ============================================================================

const profileRenames: Record<string, string> = {
  // PROBLEMATIC - Must rename (14)
  'profile:mauryanic': 'profile:magadhic',       // From Magadha kingdom (more obscure)
  'profile:sindhukan': 'profile:harappic',       // From Harappa civilization
  'profile:zhonghuaic': 'profile:huaxiac',       // Less obvious (Huaxia ancestor myth)
  'profile:antillean': 'profile:lucayan',        // From Lucayans (original Bahamas)
  'profile:oceanic': 'profile:wayfindric',       // From Polynesian navigation
  'profile:antillean-gallicene': 'profile:kreyolik',  // Creole defamiliarized
  'profile:post-severnyan': 'profile:novorossic',     // From Novorossiya
  'profile:afro-alvionic': 'profile:afranic',         // Original blend
  'profile:laurentian': 'profile:stadaconan',         // From Stadacona (Iroquois)
  'profile:chicanic': 'profile:aztlanic',             // From Aztlan mythology
  'profile:afro-lusitanic': 'profile:crioulique',     // Crioulo defamiliarized
  'profile:cushitic': 'profile:aksumite',             // From Axum empire
  'profile:wolofic': 'profile:jolofic',               // From Jolof Empire
  'profile:fulanic': 'profile:tekruric',              // From Tekrur (Fulani state)
  'profile:ashantic': 'profile:denkyiric',            // From Denkyira kingdom

  // NEEDS WORK - Too obvious or academic (29)
  'profile:cosmopolitan': 'profile:meridian',         // Evokes crossing points
  'profile:alvionic': 'profile:tyndallic',            // From William Tyndale
  'profile:castillaran': 'profile:celtiberic',        // Ancient Iberian peoples
  'profile:lusitanic': 'profile:portucalic',          // From Portucale
  'profile:gallicene': 'profile:sequanic',            // From Sequani tribe
  'profile:austronic': 'profile:marcomannian',        // From Marcomanni tribe
  'profile:anatolian': 'profile:phrygic',             // From Phrygia
  'profile:vesperic': 'profile:saturnian',            // From Saturnia (mythological)
  'profile:thracopolic': 'profile:peloric',           // From Pelops
  'profile:sahelian': 'profile:takruric',             // From Takrur kingdom
  'profile:tamazight': 'profile:tingitanic',          // From Tingis/Tingitana
  'profile:levantic': 'profile:phoenikaic',           // Evokes Phoenician
  'profile:khalijic': 'profile:dilmunic',             // From Dilmun civilization
  'profile:sarmatian': 'profile:leckhitic',           // From Lechites
  'profile:illyric': 'profile:dardanic',              // From Dardania
  'profile:aestic': 'profile:sambian',                // From Sambia (Old Prussians)
  'profile:dacian': 'profile:wallachic',              // From Wallachia
  'profile:magyric': 'profile:pannonic',              // From Pannonia
  'profile:bohemic': 'profile:moravenic',             // From Great Moravia
  'profile:boeric': 'profile:vrijburghic',            // From vrijburger
  'profile:kartvelian': 'profile:colchidic',          // From Colchis (Golden Fleece)
  'profile:vangalic': 'profile:magadhic',             // Already using magadhic above - use pauravic
  'profile:sangamic': 'profile:pandyanic',            // From Pandya dynasty
  'profile:gorkhalic': 'profile:licchavic',           // From Licchavi dynasty
  'profile:melakan': 'profile:srivijayan',            // From Srivijaya empire
  'profile:siamic': 'profile:dvaravatic',             // From Dvaravati kingdom
  'profile:maharlikan': 'profile:katagalugan',        // From Katagalugan
  'profile:hannic': 'profile:zhongyuanic',            // From Zhongyuan (Central Plains)
  'profile:yuehai': 'profile:nanyuenic',              // From Nanyue kingdom
};

// Fix collision: vangalic and mauryanic both -> magadhic
// Use pauravic for Bengali (from Pauravas, ancient dynasty)
profileRenames['profile:vangalic'] = 'profile:pauravic';

// ============================================================================
// CONTINENT ASSIGNMENT FIXES
// ============================================================================

const continentFixes: Record<string, string> = {
  // Countries incorrectly assigned to Athar
  'IND': 'Solis',      // India should be Solis
  'TZA': 'Mero',       // Tanzania should be Mero
  'ZWE': 'Mero',       // Zimbabwe should be Mero
  'TUR': 'Aram',       // Turkey should be Aram (or Hesper border)
  'BEL': 'Hesper',     // Belgium should be Hesper
  'AUT': 'Hesper',     // Austria should be Hesper
  'HRV': 'Hesper',     // Croatia should be Hesper
  'SVN': 'Hesper',     // Slovenia should be Hesper
  'BIH': 'Hesper',     // Bosnia should be Hesper
  'CZE': 'Hesper',     // Czech Republic should be Hesper
  'COD': 'Mero',       // DRC should be Mero
  'GAB': 'Mero',       // Gabon should be Mero
  'MYS': 'Solis',      // Malaysia should be Solis
  'VNM': 'Solis',      // Vietnam should be Solis
  'YEM': 'Aram',       // Yemen should be Aram
  'SEN': 'Mero',       // Senegal should be Mero
  'HKG': 'Solis',      // Hong Kong - keep in Solis
};

// ============================================================================
// CONTINENT NAME FIXES
// ============================================================================

const continentRenames: Record<string, string> = {
  // Rename problematic continent names
  'Hesper': 'Abendar',      // Less obvious than Greek "evening/west"
  'Solis': 'Uttara',        // Sanskrit, obscure Buddhist geography term
  'Verd': 'Tahuantin',      // From Tawantinsuyu (Inca)
  'Athar': 'Anahuac',       // Aztec name for their world
};

// Also need to update homeCultures array and sub-categories
const homeCultureRenames: Record<string, string> = {
  'Hesper': 'Abendar',
  'Solis-South': 'Uttara-South',
  'Solis-East': 'Uttara-East',
  'Athar-West': 'Anahuac-West',
  'Verd': 'Tahuantin',
};

// ============================================================================
// LANGUAGE NAME FIXES (to match profile renames)
// ============================================================================

const languageRenames: Record<string, string> = {
  'Mauryanic': 'Magadhic',
  'Sindhukan': 'Harappic',
  'Anatolian': 'Phrygic',
  'Sarmatian': 'Leckhitic',
  'Dacian': 'Wallachic',
  'Bohemic': 'Moravenic',
  'Magyric': 'Pannonic',
  'Kartvelian': 'Colchidic',
  'Gorkhalic': 'Licchavic',
  'Siamic': 'Dvaravatic',
  'Maharlikan': 'Katagalugan',
  // Keep some that are already good
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
  console.log('=== Comprehensive Shadow Naming Fix ===\n');

  let totalChanges = 0;

  // 1. Fix shadow-country-map.json
  console.log('1. Fixing shadow-country-map.json...');
  const countryPath = resolve(projectRoot, 'public/shadow-country-map.json');
  let countryData = JSON.parse(readFileSync(countryPath, 'utf-8'));

  let countryNameChanges = 0;
  let continentAssignmentChanges = 0;
  let continentNameChanges = 0;

  for (const country of countryData) {
    // Fix country shadow names
    if (countryRenames[country.shadow]) {
      console.log(`  Country: ${country.shadow} → ${countryRenames[country.shadow]}`);
      country.shadow = countryRenames[country.shadow];
      countryNameChanges++;
    }

    // Fix continent assignments
    if (continentFixes[country.iso3]) {
      const oldContinent = country.continent;
      const newContinent = continentFixes[country.iso3];
      if (oldContinent !== newContinent) {
        console.log(`  Continent fix: ${country.iso3} ${oldContinent} → ${newContinent}`);
        country.continent = newContinent;
        continentAssignmentChanges++;
      }
    }

    // Rename continents
    if (continentRenames[country.continent]) {
      country.continent = continentRenames[country.continent];
      continentNameChanges++;
    }
  }

  writeFileSync(countryPath, JSON.stringify(countryData, null, 2) + '\n');
  console.log(`  Country names: ${countryNameChanges}`);
  console.log(`  Continent assignments: ${continentAssignmentChanges}`);
  console.log(`  Continent renames: ${continentNameChanges}\n`);
  totalChanges += countryNameChanges + continentAssignmentChanges;

  // 2. Fix agent-vocab.v1.json
  console.log('2. Fixing agent-vocab.v1.json...');
  const vocabPath = resolve(projectRoot, 'public/agent-vocab.v1.json');
  let vocabContent = readFileSync(vocabPath, 'utf-8');

  let profileChanges = 0;
  let langChanges = 0;
  let homeCultureChanges = 0;

  // Fix profile names
  for (const [oldName, newName] of Object.entries(profileRenames)) {
    const before = vocabContent;
    vocabContent = replaceAll(vocabContent, oldName, newName);
    if (vocabContent !== before) {
      profileChanges++;
    }
  }

  // Fix language names
  for (const [oldName, newName] of Object.entries(languageRenames)) {
    const before = vocabContent;
    vocabContent = replaceAll(vocabContent, `"${oldName}"`, `"${newName}"`);
    if (vocabContent !== before) {
      langChanges++;
    }
  }

  // Fix homeCultures
  for (const [oldName, newName] of Object.entries(homeCultureRenames)) {
    const before = vocabContent;
    vocabContent = replaceAll(vocabContent, `"${oldName}"`, `"${newName}"`);
    if (vocabContent !== before) {
      homeCultureChanges++;
    }
  }

  writeFileSync(vocabPath, vocabContent);
  console.log(`  Profile renames: ${profileChanges}`);
  console.log(`  Language renames: ${langChanges}`);
  console.log(`  HomeCulture renames: ${homeCultureChanges}\n`);
  totalChanges += profileChanges + langChanges + homeCultureChanges;

  // 3. Fix agent-priors.v1.json
  console.log('3. Fixing agent-priors.v1.json...');
  const priorsPath = resolve(projectRoot, 'public/agent-priors.v1.json');
  let priorsContent = readFileSync(priorsPath, 'utf-8');

  let priorsChanges = 0;
  for (const [oldName, newName] of Object.entries(profileRenames)) {
    const before = priorsContent;
    priorsContent = replaceAll(priorsContent, oldName, newName);
    if (priorsContent !== before) {
      priorsChanges++;
    }
  }

  writeFileSync(priorsPath, priorsContent);
  console.log(`  Priors profile renames: ${priorsChanges}\n`);
  totalChanges += priorsChanges;

  // 4. Fix TypeScript files
  console.log('4. Fixing TypeScript files...');
  const tsFiles = [
    'src/agentGenerator.ts',
    'src/agentNarration.ts',
    'scripts/fix-gulf-expats.ts',
    'scripts/rename-shadow-names.ts',
  ];

  let tsChanges = 0;
  for (const relPath of tsFiles) {
    const fullPath = resolve(projectRoot, relPath);
    try {
      let content = readFileSync(fullPath, 'utf-8');
      const before = content;

      // Replace profile references
      for (const [oldName, newName] of Object.entries(profileRenames)) {
        content = replaceAll(content, oldName, newName);
      }

      // Replace country name references
      for (const [oldName, newName] of Object.entries(countryRenames)) {
        content = replaceAll(content, oldName, newName);
      }

      // Replace continent references
      for (const [oldName, newName] of Object.entries(continentRenames)) {
        content = replaceAll(content, oldName, newName);
      }

      if (content !== before) {
        writeFileSync(fullPath, content);
        console.log(`  Updated: ${relPath}`);
        tsChanges++;
      }
    } catch {
      // File might not exist
    }
  }
  console.log(`  TS file changes: ${tsChanges}\n`);
  totalChanges += tsChanges;

  // Summary
  console.log('=== Summary ===');
  console.log(`Total changes: ${totalChanges}`);
  console.log(`\nCountry renames: ${Object.keys(countryRenames).length}`);
  console.log(`Profile renames: ${Object.keys(profileRenames).length}`);
  console.log(`Continent fixes: ${Object.keys(continentFixes).length}`);
  console.log(`Continent renames: ${Object.keys(continentRenames).length}`);
  console.log('\n✓ Done! Run verification tests to confirm.');
}

main();

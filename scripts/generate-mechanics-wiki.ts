import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

type CommunityMechanic = {
  pattern: string;
  mechanic: string;
};

type CommunitiesWithMechanics = {
  communities: Array<{
    sharedMechanics?: Array<{
      pattern: string;
      mechanic: string;
    }>;
  }>;
};

const PARENT_REPO = join(process.cwd(), '..');
const INPUT_PATH = join(PARENT_REPO, 'data/generated/analysis/communities-with-mechanics.json');
const OUTPUT_DIR = join(process.cwd(), 'wiki', 'mechanics');

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mechanicId(pattern: string, mechanic: string): string {
  const p = slugify(pattern);
  const m = slugify(mechanic);
  return `mechanic--${p}--${m}`;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function main() {
  if (!existsSync(INPUT_PATH)) {
    console.error(`Mechanics source not found: ${INPUT_PATH}`);
    process.exit(1);
  }

  const raw = readFileSync(INPUT_PATH, 'utf8');
  const data = JSON.parse(raw) as CommunitiesWithMechanics;

  const uniques = new Map<string, CommunityMechanic>();
  for (const c of data.communities || []) {
    for (const m of c.sharedMechanics || []) {
      const key = `${m.pattern}||${m.mechanic}`;
      if (!uniques.has(key)) {
        uniques.set(key, { pattern: m.pattern, mechanic: m.mechanic });
      }
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const today = formatDate(new Date());
  let created = 0;
  let skipped = 0;

  for (const { pattern, mechanic } of uniques.values()) {
    const id = mechanicId(pattern, mechanic);
    const filePath = join(OUTPUT_DIR, `${id}.md`);

    if (existsSync(filePath)) {
      skipped++;
      continue;
    }

    const title = `${mechanic} (${pattern})`;

    const content = `---\n` +
      `id: ${id}\n` +
      `title: ${title}\n` +
      `pattern: ${pattern}\n` +
      `mechanic: ${mechanic}\n` +
      `editedBy: Shadow Work Team\n` +
      `lastUpdated: ${today}\n` +
      `---\n\n` +
      `## Overview\n` +
      `Describe how this mechanic works in the simulation and what it affects.\n\n` +
      `## Notes\n` +
      `Add examples, edge cases, and links to ARCHITECTURE sources.\n`;

    writeFileSync(filePath, content, 'utf8');
    created++;
  }

  console.log(`✅ Mechanics pages: created ${created}, skipped ${skipped} (already existed)`);
}

main();


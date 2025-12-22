import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const MECH_DIR = join(ROOT, 'wiki', 'mechanics');

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleizeMechanic(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Mechanic';

  const lower = trimmed.toLowerCase();
  if (lower === 'id') return 'ID';

  // Preserve multi-word mechanics as-authored (they often encode sentence case / proper nouns / hyphenation).
  if (trimmed.includes(' ')) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  // Single-token mechanics: normalize casing/spacing.
  if (/^[a-z]+$/.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  // camelCase / PascalCase -> words
  const spaced = trimmed.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced
    .split(' ')
    .map(w => {
      if (!w) return w;
      if (/^[A-Z0-9]{2,}$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const files = readdirSync(MECH_DIR).filter(f => f.endsWith('.md') && !f.includes('_TEMPLATE'));
  const date = today();
  let updated = 0;

  for (const file of files) {
    const filePath = join(MECH_DIR, file);
    const raw = readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, any>;

    const pattern = typeof fm.pattern === 'string' ? fm.pattern : '';
    const mechanic = typeof fm.mechanic === 'string' ? fm.mechanic : '';
    if (!pattern || !mechanic) continue;

    const patternSlug = slugify(pattern);
    const newTitle = `${titleizeMechanic(mechanic)} (${patternSlug})`;

    let next = raw;
    next = next.replace(/^title:\s*.*$/m, `title: ${newTitle}`);
    next = next.replace(/^lastUpdated:\s*.*$/m, `lastUpdated: ${date}`);

    if (next !== raw) {
      writeFileSync(filePath, next, 'utf8');
      updated++;
    }
  }

  console.log(`✅ Normalized mechanic pages: updated ${updated}/${files.length}`);
}

main();

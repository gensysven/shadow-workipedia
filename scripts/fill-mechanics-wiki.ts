import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

type SubsystemsIndex = {
  patterns?: Array<{
    pattern: string;
    mechanic: string;
    occurrences?: Array<{
      issueId: string;
      issueNumber?: string;
      subsystemId?: string;
      subsystemName?: string;
    }>;
  }>;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mechanicPageId(pattern: string, mechanic: string): string {
  return `mechanic--${slugify(pattern)}--${slugify(mechanic)}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isPlaceholderBody(body: string): boolean {
  const normalized = body.trim();
  if (!normalized) return true;
  if (normalized.includes('Describe how this mechanic works in the simulation and what it affects.')) return true;
  if (normalized.includes('Add examples, edge cases, and links to ARCHITECTURE sources.')) return true;
  return false;
}

function titleCaseToken(token: string): string {
  if (!token) return token;
  if (token.toLowerCase() === 'id') return 'ID';
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function describePattern(patternSlug: string): string {
  switch (patternSlug) {
    case 'threshold':
      return 'A nonlinear trigger: behavior changes once a variable crosses a critical threshold.';
    case 'feedback-loop':
      return 'A reinforcing or balancing loop where outputs feed back into inputs, amplifying or stabilizing dynamics.';
    case 'cascade':
      return 'A chain reaction: one failure/shift increases the likelihood or severity of subsequent failures.';
    case 'externality':
      return 'Costs/benefits are imposed on others and not reflected in the decision-maker’s prices or incentives.';
    case 'market-failure':
      return 'An allocation failure where markets produce inefficient or harmful outcomes (often due to geography, power, or information).';
    case 'information-asymmetry':
      return 'A mismatch in information between parties that distorts incentives and decision quality.';
    case 'network-effect':
      return 'Value increases with adoption, often producing winner-take-most outcomes and lock-in.';
    case 'path-dependency':
      return 'Early choices constrain future options; switching costs and accumulated infrastructure make reversals hard.';
    case 'lock-in-effect':
      return 'Once committed, systems resist change due to costs, compatibility, contracts, or institutional inertia.';
    case 'regulatory-capture':
      return 'Regulators act in the interest of incumbents rather than the public due to influence, revolving doors, or dependency.';
    case 'regulatory-fragmentation':
      return 'Inconsistent rules across jurisdictions create loopholes, arbitrage, and enforcement gaps.';
    case 'supply-chain':
    case 'supplychain':
      return 'Interdependence across suppliers and logistics creates propagation of shocks, bottlenecks, and systemic fragility.';
    case 'tipping-point':
      return 'A critical point after which a system shifts to a new regime, often with hysteresis or irreversibility.';
    case 'irreversible':
      return 'A dynamic where damage or depletion is difficult or impossible to undo on relevant timescales.';
    case 'moral-hazard':
      return 'Protection/insurance changes incentives, increasing risky behavior or reducing diligence.';
    case 'adverse-selection':
      return 'Selection effects where higher-risk actors are more likely to participate, undermining pools/markets.';
    case 'prisoners-dilemma':
      return 'Individually rational choices lead to collectively worse outcomes absent coordination mechanisms.';
    default:
      return 'A reusable dynamic extracted from System Walk subsystems; this page documents how it is used and where it appears.';
  }
}

const GENERIC_OVERVIEW = 'A reusable dynamic extracted from System Walk subsystems; this page documents how it is used and where it appears.';
const AUTO_CONTEXTUAL_OVERVIEW_PREFIX = 'A recurring dynamic extracted from System Walk subsystems.';

function normalizeMechanicLabel(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Mechanic';

  // Preserve multi-word mechanics as authored, but ensure initial cap.
  if (trimmed.includes(' ')) return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

  // camelCase -> words
  if (/[a-z][A-Z]/.test(trimmed)) {
    return trimmed.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase());
  }

  return titleCaseToken(trimmed);
}

function loadIssueTitleIndex(repoRoot: string): Map<string, string> {
  const index = new Map<string, string>();
  const dir = join(repoRoot, 'wiki', 'issues');
  if (!existsSync(dir)) return index;

  const files = readdirSync(dir).filter(f => f.endsWith('.md') && !f.includes('_TEMPLATE'));
  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), 'utf8');
      const parsed = matter(raw);
      const fm = parsed.data as Record<string, any>;
      const id = typeof fm.id === 'string' ? fm.id.trim() : file.replace(/\.md$/, '');
      const title = typeof fm.title === 'string' ? fm.title.trim() : id;
      if (id) index.set(id, title || id);
    } catch {
      // ignore
    }
  }

  return index;
}

function buildReferences(
  occurrences: Array<NonNullable<NonNullable<SubsystemsIndex['patterns']>[number]['occurrences']>[number]>,
  issueTitleById: Map<string, string>
) {
  const byIssue = new Map<string, Array<typeof occurrences[number]>>();
  for (const occ of occurrences) {
    const issueId = occ.issueId?.trim();
    if (!issueId) continue;
    if (!byIssue.has(issueId)) byIssue.set(issueId, []);
    byIssue.get(issueId)!.push(occ);
  }

  const issueIds = Array.from(byIssue.keys()).sort((a, b) => a.localeCompare(b));
  const maxIssues = 10;
  const maxLines = 20;

  const lines: string[] = [];
  let emitted = 0;

  for (const issueId of issueIds.slice(0, maxIssues)) {
    const list = byIssue.get(issueId)!;
    const sw = list.find(x => typeof x.issueNumber === 'string' && x.issueNumber.trim())?.issueNumber?.trim();
    const title = issueTitleById.get(issueId) || issueId;
    const link = `[${title}](#/wiki/${issueId})`;
    const header = sw ? `- ${link} (SW#${sw}) — \`${issueId}\`` : `- ${link} — \`${issueId}\``;
    lines.push(header);
    emitted++;
    if (emitted >= maxLines) break;

    const uniq = Array.from(
      new Map(
        list
          .map(x => {
            const subsystemId = (x.subsystemId ?? '').trim();
            const subsystemName = (x.subsystemName ?? '').trim();
            const key = `${subsystemId}||${subsystemName}`;
            return [key, { subsystemId, subsystemName }] as const;
          })
          .filter(([key]) => key !== '||')
      ).values()
    );

    for (const s of uniq.slice(0, 3)) {
      const label = s.subsystemId ? `  - ${s.subsystemId}: ${s.subsystemName || '(subsystem)'}` : `  - ${s.subsystemName || '(subsystem)'}`;
      lines.push(label);
      emitted++;
      if (emitted >= maxLines) break;
    }
    if (emitted >= maxLines) break;
  }

  const remainingIssues = Math.max(0, issueIds.length - Math.min(issueIds.length, maxIssues));
  if (remainingIssues > 0) {
    lines.push(`- …and ${remainingIssues} more`);
  }

  return {
    distinctIssues: issueIds.length,
    lines,
  };
}

function buildTopIssueExamples(
  occurrences: Array<NonNullable<NonNullable<SubsystemsIndex['patterns']>[number]['occurrences']>[number]>,
  issueTitleById: Map<string, string>,
  limit: number
): string[] {
  const counts = new Map<string, number>();
  for (const occ of occurrences) {
    const issueId = occ.issueId?.trim();
    if (!issueId) continue;
    counts.set(issueId, (counts.get(issueId) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([issueId]) => issueTitleById.get(issueId) || issueId);
}

function buildContextualOverview(opts: {
  mechanicLabel: string;
  pattern: string;
  distinctIssues: number;
  occurrences: number;
  examples: string[];
}): string {
  const examplesText = opts.examples.length > 0 ? ` (e.g., ${opts.examples.join('; ')})` : '';
  const issueWord = opts.distinctIssues === 1 ? 'issue' : 'issues';
  const mentionWord = opts.occurrences === 1 ? 'mention' : 'mentions';

  return `A recurring dynamic extracted from System Walk subsystems. Appears in **${opts.distinctIssues}** ${issueWord} (**${opts.occurrences}** ${mentionWord})${examplesText}.`;
}

function replaceAutoOverview(content: string, nextOverviewBlock: string, opts?: { allowReplaceAutoContextual?: boolean }): string {
  const pattern = /(## Overview\n)([\s\S]*?)(\n## )/;
  const match = content.match(pattern);
  if (!match) return content;

  const currentSection = match[2];
  const trimmed = currentSection.trim();
  const allowReplaceAutoContextual = opts?.allowReplaceAutoContextual === true;
  const isGeneric = trimmed === GENERIC_OVERVIEW;
  const isAutoContextual = trimmed.startsWith(AUTO_CONTEXTUAL_OVERVIEW_PREFIX);
  if (!isGeneric && !(allowReplaceAutoContextual && isAutoContextual)) return content;

  return content.replace(pattern, `$1${nextOverviewBlock}\n\n$3`);
}

function extractReferenceSummaryFromBody(content: string): { distinctIssues: number; occurrences: number; examples: string[] } | null {
  const summaryMatch = content.match(/Appears in \*\*(\d+)\*\* distinct issue contexts, \*\*(\d+)\*\* total mentions\./);
  if (!summaryMatch) return null;

  const distinctIssues = Number(summaryMatch[1]);
  const occurrences = Number(summaryMatch[2]);
  if (!Number.isFinite(distinctIssues) || !Number.isFinite(occurrences)) return null;

  const examples: string[] = [];
  const linkRe = /^- \[([^\]]+)\]\(#\/wiki\/[a-z0-9-]+\)/;
  for (const line of content.split('\n')) {
    const m = line.match(linkRe);
    if (!m) continue;
    const title = m[1].trim();
    if (!title) continue;
    if (!examples.includes(title)) examples.push(title);
    if (examples.length >= 3) break;
  }

  return { distinctIssues, occurrences, examples };
}

function extractHowItWorksDefinition(content: string): string | null {
  const sectionMatch = content.match(/## How it works\n([\s\S]*?)(\n## |\n$)/);
  if (!sectionMatch) return null;

  const section = sectionMatch[1];
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);

  const find = (label: string) => {
    const re = new RegExp(`^[-*]\\s*\\*\\*${label}:\\*\\*\\s*(.+)$`, 'i');
    for (const line of lines) {
      const m = line.match(re);
      if (m && m[1]) return m[1].trim();
    }
    return '';
  };

  const state = find('State\\/Resource');
  const drivers = find('Drivers');
  const outcomes = find('Outcomes');

  const parts: string[] = [];
  if (state) parts.push(state.replace(/\s+/g, ' ').replace(/\s*-\s*/g, ' — '));
  if (drivers) parts.push(`Driven by ${drivers.replace(/\s+/g, ' ')}`);
  if (outcomes) parts.push(`Leads to ${outcomes.replace(/\s+/g, ' ')}`);

  if (parts.length === 0) return null;
  const sentence = parts.join('. ').replace(/\.\.+/g, '.').trim();
  return sentence.endsWith('.') ? sentence : `${sentence}.`;
}

function buildOverviewBlock(definition: string | null, statsLine: string): string {
  if (definition) return `${definition}\n\n${statsLine}`;
  return statsLine;
}

function renderBody(
  issueTitleById: Map<string, string>,
  opts: {
  title: string;
  pattern: string;
  mechanic: string;
  occurrences: Array<NonNullable<NonNullable<SubsystemsIndex['patterns']>[number]['occurrences']>[number]>;
}) {
  const patternSlug = slugify(opts.pattern);
  const mechanicLabel = normalizeMechanicLabel(opts.mechanic);

  const occCount = opts.occurrences.length;
  const refs = buildReferences(opts.occurrences, issueTitleById);
  const topExamples = buildTopIssueExamples(opts.occurrences, issueTitleById, 3);

  const baseOverview = describePattern(patternSlug);
  const statsLine =
    baseOverview === GENERIC_OVERVIEW
      ? buildContextualOverview({
          mechanicLabel,
          pattern: opts.pattern,
          distinctIssues: refs.distinctIssues,
          occurrences: occCount,
          examples: topExamples,
        })
      : baseOverview;
  const overviewBlock = buildOverviewBlock(null, statsLine);

  const hints: string[] = [];
  if (patternSlug === 'threshold') {
    hints.push('- Identify the tracked variable and its threshold(s).');
    hints.push('- Clarify whether crossing is one-way (hysteresis) or reversible.');
  } else if (patternSlug === 'feedback-loop') {
    hints.push('- Specify whether the loop is reinforcing (+) or balancing (–).');
    hints.push('- Note delays/latency that can cause overshoot or instability.');
  } else if (patternSlug === 'cascade') {
    hints.push('- Document typical cascade paths and the main “bridge” conditions.');
    hints.push('- Note dampeners (buffers, redundancy) that halt propagation.');
  } else if (patternSlug === 'supply-chain' || patternSlug === 'supplychain') {
    hints.push('- List chokepoints and substitution options (elasticity).');
    hints.push('- Track propagation speed (inventory days, lead times).');
  } else if (patternSlug === 'regulatory-capture') {
    hints.push('- Identify capture vectors (lobbying, revolving door, dependence).');
    hints.push('- Note enforcement capacity and penalty asymmetry.');
  } else {
    hints.push('- Add concrete parameters/events this mechanic should influence.');
    hints.push('- Add at least one real-world anchor example (case study).');
  }

  return [
    '## Overview',
    `**Pattern:** \`${opts.pattern}\``,
    `**Mechanic:** \`${opts.mechanic}\``,
    '',
    overviewBlock,
    '',
    `This page documents **${mechanicLabel}** as it appears in System Walk subsystems and suggests how to represent it consistently in the simulation/UI.`,
    '',
    '## How it works',
    '- What is the “state” or resource this mechanic changes?',
    '- What are the main drivers/inputs?',
    '- What are the outcomes/outputs (who benefits, who pays, what breaks)?',
    '',
    '## In the simulation',
    '- **Signals:** What would make this mechanic “activate” or intensify?',
    '- **Levers:** What interventions can players apply (policy, spending, coordination, enforcement)?',
    '- **Failure modes:** What happens if this is ignored or mismanaged?',
    '',
    '## Notes',
    ...hints,
    '',
    '## References (System Walk occurrences)',
    `Appears in **${refs.distinctIssues}** distinct issue contexts, **${occCount}** total mentions.`,
    '',
    ...(refs.lines.length > 0 ? refs.lines : ['- (No occurrences found in `subsystems.json` for this pattern+mechanic.)']),
    '',
  ].join('\n');
}

function main() {
  const args = new Set(process.argv.slice(2));
  const force = args.has('--force');

  const repoRoot = process.cwd();
  const parentRepo = join(repoRoot, '..');

  const subsystemsPath = join(parentRepo, 'data/generated/analysis/subsystems.json');
  const mechDir = join(repoRoot, 'wiki', 'mechanics');

  if (!existsSync(subsystemsPath)) {
    console.error(`❌ Missing subsystems index: ${subsystemsPath}`);
    process.exit(1);
  }
  if (!existsSync(mechDir)) {
    console.error(`❌ Missing mechanics wiki dir: ${mechDir}`);
    process.exit(1);
  }

  const subsystems = JSON.parse(readFileSync(subsystemsPath, 'utf8')) as SubsystemsIndex;
  const issueTitleById = loadIssueTitleIndex(repoRoot);
  const patternById = new Map<string, NonNullable<SubsystemsIndex['patterns']>[number]>();
  for (const p of subsystems.patterns || []) {
    if (!p || typeof p.pattern !== 'string' || typeof p.mechanic !== 'string') continue;
    patternById.set(mechanicPageId(p.pattern, p.mechanic), p);
  }

  const files = readdirSync(mechDir).filter(f => f.endsWith('.md') && !f.includes('_TEMPLATE'));

  let updated = 0;
  let skipped = 0;
  let missingSource = 0;

  for (const file of files) {
    const filePath = join(mechDir, file);
    const raw = readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, any>;

    const id = typeof fm.id === 'string' ? fm.id.trim() : '';
    if (!id) {
      skipped++;
      continue;
    }

    if (fm.hidden === true) {
      skipped++;
      continue;
    }
    const mergedInto = typeof fm.mergedInto === 'string' ? fm.mergedInto.trim() : '';
    if (mergedInto) {
      skipped++;
      continue;
    }

	    const source = patternById.get(id);
	    if (!source) {
	      missingSource++;

	      if (!force) {
	        const fallback = extractReferenceSummaryFromBody(parsed.content);
	        if (fallback) {
	          const nextOverview = buildContextualOverview({
	            mechanicLabel: normalizeMechanicLabel(typeof fm.mechanic === 'string' ? fm.mechanic : String(fm.title || id)),
	            pattern: typeof fm.pattern === 'string' ? fm.pattern : id,
	            distinctIssues: fallback.distinctIssues,
	            occurrences: fallback.occurrences,
	            examples: fallback.examples,
	          });
	          const definition = extractHowItWorksDefinition(parsed.content);
	          const nextBlock = buildOverviewBlock(definition, nextOverview);
	          const nextContent = replaceAutoOverview(parsed.content, nextBlock, { allowReplaceAutoContextual: true });
	          if (nextContent !== parsed.content) {
	            const nextFrontmatter = { ...fm, lastUpdated: today() };
	            const next = matter.stringify(nextContent, nextFrontmatter);
	            if (next !== raw) {
	              writeFileSync(filePath, next, 'utf8');
              updated++;
              continue;
            }
          }
        }
      }
      continue;
    }

	    if (!force && !isPlaceholderBody(parsed.content)) {
	      const occCount = Array.isArray(source.occurrences) ? source.occurrences.length : 0;
	      const refs = buildReferences(Array.isArray(source.occurrences) ? source.occurrences : [], issueTitleById);
	      const topExamples = buildTopIssueExamples(Array.isArray(source.occurrences) ? source.occurrences : [], issueTitleById, 3);
	      const nextOverview = buildContextualOverview({
	        mechanicLabel: normalizeMechanicLabel(source.mechanic),
	        pattern: source.pattern,
	        distinctIssues: refs.distinctIssues,
	        occurrences: occCount,
	        examples: topExamples,
	      });

	      const definition = extractHowItWorksDefinition(parsed.content);
	      const nextBlock = buildOverviewBlock(definition, nextOverview);
	      const nextContent = replaceAutoOverview(parsed.content, nextBlock, { allowReplaceAutoContextual: true });
	      if (nextContent === parsed.content) {
	        skipped++;
	        continue;
	      }

      const nextFrontmatter = { ...fm, lastUpdated: today() };
      const next = matter.stringify(nextContent, nextFrontmatter);
      if (next !== raw) {
        writeFileSync(filePath, next, 'utf8');
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    const nextFrontmatter = { ...fm, lastUpdated: today() };
    const body = renderBody(issueTitleById, {
      title: String(fm.title || id),
      pattern: source.pattern,
      mechanic: source.mechanic,
      occurrences: Array.isArray(source.occurrences) ? source.occurrences : [],
    });

    const next = matter.stringify(body, nextFrontmatter);
    if (next !== raw) {
      writeFileSync(filePath, next, 'utf8');
      updated++;
    } else {
      skipped++;
    }
  }

  console.log('📝 Filled mechanics wiki pages');
  console.log(`- Updated: ${updated}`);
  console.log(`- Skipped: ${skipped}`);
  console.log(`- Missing subsystems source match: ${missingSource}`);
  console.log(`- Force: ${force}`);
}

main();

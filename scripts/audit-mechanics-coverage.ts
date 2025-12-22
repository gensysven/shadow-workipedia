import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';

type CommunityMechanic = {
  pattern: string;
  mechanic: string;
  count: number;
  percentage: number;
  issues: string[];
};

type CommunitiesWithMechanics = {
  communities: Array<{
    id: number;
    members: Array<{ id: string; title: string; number?: string }>;
    sharedMechanics: CommunityMechanic[];
  }>;
};

function main() {
  const repoRoot = process.cwd();
  const parentRepo = join(repoRoot, '..');

  const mechanicsPath = join(parentRepo, 'data/generated/analysis/communities-with-mechanics.json');
  const yamlDir = join(parentRepo, 'data/issues');

  if (!existsSync(mechanicsPath)) {
    console.error(`❌ Missing mechanics source: ${mechanicsPath}`);
    process.exit(1);
  }
  if (!existsSync(yamlDir)) {
    console.error(`❌ Missing issues dir: ${yamlDir}`);
    process.exit(1);
  }

  const mechanicsData = JSON.parse(readFileSync(mechanicsPath, 'utf8')) as CommunitiesWithMechanics;

  // Load all YAML issue ids
  const issueFiles = readdirSync(yamlDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

  const yamlIssueIds: string[] = [];
  for (const f of issueFiles) {
    const doc = yaml.parse(readFileSync(join(yamlDir, f), 'utf8')) as any;
    if (doc?.id && typeof doc.id === 'string') {
      yamlIssueIds.push(doc.id);
    }
  }
  yamlIssueIds.sort();

  // Build issue -> community membership from communities file
  const issueToCommunityId = new Map<string, number>();
  const issueTitle = new Map<string, string>();
  for (const c of mechanicsData.communities || []) {
    for (const m of c.members || []) {
      issueToCommunityId.set(m.id, c.id);
      if (m.title) issueTitle.set(m.id, m.title);
    }
  }

  // Build issue -> mechanics list from sharedMechanics.issues
  const issueMechanics = new Map<string, Array<{ pattern: string; mechanic: string }>>();
  const uniqueMechanics = new Map<string, { pattern: string; mechanic: string; issueCount: number }>();

  for (const c of mechanicsData.communities || []) {
    for (const m of c.sharedMechanics || []) {
      const key = `${m.pattern}||${m.mechanic}`;
      if (!uniqueMechanics.has(key)) {
        uniqueMechanics.set(key, { pattern: m.pattern, mechanic: m.mechanic, issueCount: 0 });
      }

      const issues = Array.isArray(m.issues) ? m.issues : [];
      for (const id of issues) {
        if (!issueMechanics.has(id)) issueMechanics.set(id, []);
        issueMechanics.get(id)!.push({ pattern: m.pattern, mechanic: m.mechanic });
      }
    }
  }

  for (const [key, rec] of uniqueMechanics) {
    const count = Array.from(issueMechanics.entries()).filter(([_, list]) =>
      list.some((x) => `${x.pattern}||${x.mechanic}` === key)
    ).length;
    rec.issueCount = count;
  }

  // Audit coverage across all YAML issues
  const noCommunity: string[] = [];
  const inCommunityNoMechanics: string[] = [];
  const hasMechanics: string[] = [];

  for (const id of yamlIssueIds) {
    const communityId = issueToCommunityId.get(id);
    const mech = issueMechanics.get(id) || [];
    if (communityId === undefined) {
      noCommunity.push(id);
    } else if (mech.length === 0) {
      inCommunityNoMechanics.push(id);
    } else {
      hasMechanics.push(id);
    }
  }

  const mechanicsSorted = Array.from(uniqueMechanics.values()).sort((a, b) =>
    b.issueCount - a.issueCount || a.pattern.localeCompare(b.pattern) || a.mechanic.localeCompare(b.mechanic)
  );

  console.log('🧪 Mechanics coverage audit');
  console.log('--------------------------');
  console.log(`YAML issues: ${yamlIssueIds.length}`);
  console.log(`Issues with community assignment: ${yamlIssueIds.length - noCommunity.length}`);
  console.log(`Issues with ≥1 mechanic (from sharedMechanics): ${hasMechanics.length}`);
  console.log(`Issues in a community but with 0 mechanics: ${inCommunityNoMechanics.length}`);
  console.log(`Issues with no community assignment: ${noCommunity.length}`);
  console.log('');
  console.log(`Unique mechanics (pattern+mechanic): ${mechanicsSorted.length}`);
  console.log('');

  console.log('Top mechanics by issue coverage:');
  for (const m of mechanicsSorted.slice(0, 12)) {
    console.log(`- ${m.pattern} :: ${m.mechanic}  (${m.issueCount} issues)`);
  }

  console.log('');
  if (inCommunityNoMechanics.length > 0) {
    console.log('Issues in a community but with 0 mechanics (first 40):');
    for (const id of inCommunityNoMechanics.slice(0, 40)) {
      const title = issueTitle.get(id) || id;
      const communityId = issueToCommunityId.get(id);
      console.log(`- ${id}  (${title})  community-${communityId}`);
    }
    if (inCommunityNoMechanics.length > 40) {
      console.log(`…and ${inCommunityNoMechanics.length - 40} more`);
    }
    console.log('');
  }

  if (noCommunity.length > 0) {
    console.log('Issues with no community assignment (first 40):');
    for (const id of noCommunity.slice(0, 40)) {
      console.log(`- ${id}`);
    }
    if (noCommunity.length > 40) {
      console.log(`…and ${noCommunity.length - 40} more`);
    }
    console.log('');
  }

  console.log('Next step if you want “all mechanics” per issue:');
  console.log('- The current source file only contains *top shared* mechanics per community (max ~14), so many issues will legitimately show 0 mechanics.');
  console.log('- To fill gaps we need either (a) upstream export of per-issue mechanics, or (b) re-run the upstream extractor with a larger cutoff / full list, then regenerate mechanic pages.');
}

main();

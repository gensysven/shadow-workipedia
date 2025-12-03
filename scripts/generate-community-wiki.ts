import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PARENT_REPO = join(process.cwd(), '..');
const WIKI_COMMUNITIES_DIR = join(process.cwd(), 'wiki', 'communities');
const COMMUNITIES_DATA_FILE = join(
  PARENT_REPO,
  'data/generated/analysis/communities-with-mechanics.json'
);

interface CommunityMember {
  id: string;
  title: string;
  number: string;
  isBridge: boolean;
  betweenness: number;
}

interface SharedMechanic {
  pattern: string;
  mechanic: string;
  count: number;
  percentage: number;
  issues: string[];
}

interface Community {
  id: number;
  originalId: number;
  splitReason?: string;
  mergedFrom?: number[];
  size: number;
  members: CommunityMember[];
  stats: {
    avgStrength: number;
    topCategories: Array<{ category: string; count: number }>;
    topTags: Array<{ tag: string; count: number }>;
    topSystems: Array<{ system: string; count: number }>;
  };
  sharedMechanics: SharedMechanic[];
  mechanicScore: number;
  hasArchitectures: number;
}

interface CommunitiesData {
  metadata: {
    totalCommunities: number;
    communitiesWithMechanics: number;
    avgMechanicsPerCommunity: number;
    generatedAt: string;
  };
  communities: Community[];
  summary: {
    topMechanicPatterns: Array<{
      pattern: string;
      mechanic: string;
      communityCount: number;
      issueCount: number;
    }>;
  };
}

function generateCommunityLabel(community: Community): string {
  // Use top category + size to create a descriptive label
  const topCategory = community.stats.topCategories[0]?.category || 'Mixed';
  const topTags = community.stats.topTags
    .slice(0, 2)
    .map((t) => t.tag)
    .join(', ');

  return `${topCategory} (${topTags})`;
}

function findConnectedCommunities(
  community: Community,
  allCommunities: Community[]
): Array<{ id: number; label: string; sharedPatterns: string[] }> {
  const connections = new Map<number, Set<string>>();

  // For each mechanic in this community, find other communities with the same mechanic
  for (const mechanic of community.sharedMechanics) {
    for (const otherCommunity of allCommunities) {
      if (otherCommunity.id === community.id) continue;

      const otherHasMechanic = otherCommunity.sharedMechanics.some(
        (m) => m.pattern === mechanic.pattern
      );

      if (otherHasMechanic) {
        if (!connections.has(otherCommunity.id)) {
          connections.set(otherCommunity.id, new Set());
        }
        connections.get(otherCommunity.id)!.add(mechanic.pattern);
      }
    }
  }

  // Convert to array and sort by number of shared patterns
  return Array.from(connections.entries())
    .map(([id, patterns]) => {
      const otherCommunity = allCommunities.find((c) => c.id === id)!;
      return {
        id,
        label: generateCommunityLabel(otherCommunity),
        sharedPatterns: Array.from(patterns).sort(),
      };
    })
    .sort((a, b) => b.sharedPatterns.length - a.sharedPatterns.length)
    .slice(0, 10); // Top 10 connections
}

function generateCommunityMarkdown(
  community: Community,
  allCommunities: Community[]
): string {
  const label = generateCommunityLabel(community);
  const topCategory = community.stats.topCategories[0]?.category || 'Mixed';

  // YAML frontmatter
  let content = `---
id: community-${community.id}
title: "Community ${community.id}: ${label}"
size: ${community.size}
topCategory: ${topCategory}
mechanicScore: ${community.mechanicScore.toFixed(2)}
editedBy: Shadow Work Team
lastUpdated: ${new Date().toISOString().split('T')[0]}
---

# Community ${community.id}: ${label}

## Overview

This community contains **${community.size} interconnected issues** clustered around **${topCategory.toLowerCase()}** topics. The community shows a strong pattern signature with ${community.sharedMechanics.length} shared mechanics (mechanic score: ${community.mechanicScore.toFixed(2)}).

`;

  // Split/merge history
  if (community.splitReason) {
    content += `**Formation**: ${community.splitReason}\n\n`;
  } else if (community.mergedFrom && community.mergedFrom.length > 0) {
    content += `**Formation**: Merged from communities ${community.mergedFrom.join(', ')}\n\n`;
  }

  // Top characteristics
  content += `**Primary Categories**: ${community.stats.topCategories
    .slice(0, 3)
    .map((c) => c.category)
    .join(', ')}\n\n`;

  content += `**Dominant Tags**: ${community.stats.topTags
    .slice(0, 5)
    .map((t) => t.tag)
    .join(', ')}\n\n`;

  content += `**Affected Systems**: ${community.stats.topSystems
    .slice(0, 5)
    .map((s) => s.system)
    .join(', ')}\n\n`;

  // Shared Mechanics section
  content += `## Shared Mechanics\n\n`;
  content += `These patterns appear across multiple issues in this community, revealing common underlying dynamics:\n\n`;

  for (const mechanic of community.sharedMechanics.slice(0, 10)) {
    // Top 10 mechanics
    content += `### ${mechanic.pattern} (${mechanic.count} issues, ${mechanic.percentage.toFixed(1)}%)\n\n`;
    content += `Issues sharing this pattern:\n`;
    for (const issueId of mechanic.issues.slice(0, 5)) {
      // Show first 5
      const member = community.members.find((m) => m.id === issueId);
      if (member) {
        content += `- [${member.title}](/wiki/${member.id})\n`;
      }
    }
    if (mechanic.issues.length > 5) {
      content += `- ...and ${mechanic.issues.length - 5} more\n`;
    }
    content += `\n`;
  }

  // Member Issues table
  content += `## Member Issues\n\n`;
  content += `| Issue | Number | Category | Bridge Node |\n`;
  content += `|-------|--------|----------|-------------|\n`;

  // Sort by betweenness (most central first)
  const sortedMembers = [...community.members].sort(
    (a, b) => b.betweenness - a.betweenness
  );

  for (const member of sortedMembers) {
    const categories = ''; // We don't have category in member data, will need to look up
    const isBridge = member.isBridge ? '✓' : '';
    content += `| [${member.title}](/wiki/${member.id}) | ${member.number} | | ${isBridge} |\n`;
  }

  content += `\n`;

  // Connected Communities
  const connections = findConnectedCommunities(community, allCommunities);
  if (connections.length > 0) {
    content += `## Connected Communities\n\n`;
    content += `These communities share common mechanic patterns:\n\n`;

    for (const conn of connections) {
      content += `- [Community ${conn.id}: ${conn.label}](/wiki/community-${conn.id}) - via **${conn.sharedPatterns.join(', ')}**\n`;
    }
    content += `\n`;
  }

  // Network Statistics
  content += `## Network Statistics\n\n`;
  content += `- **Average Edge Strength**: ${community.stats.avgStrength.toFixed(3)}\n`;
  content += `- **Mechanic Score**: ${community.mechanicScore.toFixed(3)} (how coherent the community's shared patterns are)\n`;
  content += `- **Bridge Nodes**: ${community.members.filter((m) => m.isBridge).length} issues with high betweenness centrality\n`;
  content += `- **Architectures**: ${community.hasArchitectures} issues with System Walk architectures\n`;

  return content;
}

function main() {
  console.log('🎨 Generating community wiki pages...\n');

  // Ensure communities directory exists
  if (!existsSync(WIKI_COMMUNITIES_DIR)) {
    mkdirSync(WIKI_COMMUNITIES_DIR, { recursive: true });
  }

  // Load community data
  if (!existsSync(COMMUNITIES_DATA_FILE)) {
    console.error(
      `❌ Community data not found: ${COMMUNITIES_DATA_FILE}`
    );
    console.error(
      '   Run community detection scripts in parent repo first.'
    );
    process.exit(1);
  }

  const data: CommunitiesData = JSON.parse(
    readFileSync(COMMUNITIES_DATA_FILE, 'utf-8')
  );

  console.log(`📊 Loaded ${data.communities.length} communities`);
  console.log(
    `✅ ${data.metadata.communitiesWithMechanics} communities have shared mechanics`
  );
  console.log(
    `📈 Average ${data.metadata.avgMechanicsPerCommunity.toFixed(1)} mechanics per community\n`
  );

  // Generate wiki page for each community
  let generated = 0;
  for (const community of data.communities) {
    const markdown = generateCommunityMarkdown(community, data.communities);
    const filename = join(
      WIKI_COMMUNITIES_DIR,
      `community-${community.id}.md`
    );
    writeFileSync(filename, markdown, 'utf-8');
    generated++;

    const label = generateCommunityLabel(community);
    console.log(
      `✓ Generated: community-${community.id}.md - "${label}" (${community.size} issues)`
    );
  }

  console.log(`\n✅ Generated ${generated} community wiki pages`);
  console.log(`📁 Output: ${WIKI_COMMUNITIES_DIR}/`);
}

main();

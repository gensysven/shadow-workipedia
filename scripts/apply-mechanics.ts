#!/usr/bin/env npx tsx
/**
 * Batch apply mechanics tags to issue wiki pages.
 * Run: pnpm tsx scripts/apply-mechanics.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const ISSUES_DIR = 'wiki/issues';

// Pattern-based mechanics matching
const MECHANICS_PATTERNS: Record<string, string[]> = {
  'mechanic--feedback-loop--feedback-loop': [
    'feedback', 'reinforcing', 'spiral', 'worsens', 'amplifies', 'compounds',
    'cyclical', 'vicious cycle', 'self-perpetuating', 'accelerate', 'exacerbate'
  ],
  'mechanic--cascade--epistomological-collapse-cascade': [
    'cascade', 'chain reaction', 'domino', 'ripple', 'spillover', 'contagion',
    'spreading', 'trigger', 'knock-on', 'cascading'
  ],
  'mechanic--threshold--confidencethreshold': [
    'threshold', 'tipping', 'critical mass', 'breaking point', 'crosses',
    'reaches', 'point of no return'
  ],
  'mechanic--tipping-point--tipping-point': [
    'irreversible', 'tipping point', 'point of no return', 'permanent',
    'catastrophic shift', 'cannot be undone'
  ],
  'mechanic--network-effect--network-effects': [
    'network effect', 'platform', 'adoption', 'winner-take-all', 'scale',
    'monopoly', 'dominant', 'ecosystem lock'
  ],
  'mechanic--path-dependency--path-dependency-lock-in': [
    'path dependency', 'lock-in', 'legacy', 'historical', 'past decisions',
    'inherited', 'entrenched', 'structural'
  ],
  'mechanic--lock-in-effect--lock-in-effect': [
    'lock-in', 'switching cost', 'sunk cost', 'trapped', 'cannot switch'
  ],
  'mechanic--economic-lock-in--economic-lock-in': [
    'debt trap', 'mortgage', 'student loan', 'financial trap', 'cannot afford'
  ],
  'mechanic--information-asymmetry--information-asymmetry': [
    'asymmetry', 'hidden', 'opaque', 'fraud', 'deception', 'manipulation',
    'insider', 'lack of transparency', 'unknown risk'
  ],
  'mechanic--moral-hazard--moral-hazard-from-coverage': [
    'moral hazard', 'risk-taking', 'insured', 'bailout', 'protected from',
    'too big to fail', 'socialize losses'
  ],
  'mechanic--adverse-selection--adverse-selection-in-cyber-insurance': [
    'adverse selection', 'high-risk', 'selection bias'
  ],
  'mechanic--externality--externality-pricing': [
    'externality', 'external cost', 'pollution', 'unpriced', 'socialized cost',
    'burden on', 'third party harm'
  ],
  'mechanic--tragedy-of-common--tragedy-of-commons': [
    'commons', 'overuse', 'overfishing', 'overgrazing', 'depletion',
    'shared resource', 'collective action problem'
  ],
  'mechanic--prisoners-dilemma--prisoners-dilemma': [
    'prisoner', 'defect', 'cooperation failure', 'race to bottom',
    'collective action', 'mutual distrust', 'game theory'
  ],
  'mechanic--nash-equilibrium--nash-equilibrium': [
    'equilibrium', 'stable but suboptimal', 'stuck', 'no incentive to change'
  ],
  'mechanic--first-strike-advantage--first-strike-advantage': [
    'first strike', 'preemptive', 'offense dominance', 'attack first',
    'surprise', 'initiative', 'pre-empt'
  ],
  'mechanic--asymmetric-arms-race--asymmetric-arms-race': [
    'arms race', 'escalation', 'buildup', 'military', 'weapons proliferation'
  ],
  'mechanic--regulatory-capture--regulatory-capture-by-incumbents': [
    'regulatory capture', 'lobbying', 'industry influence', 'revolving door',
    'incumbent', 'powerful interest', 'corporate influence'
  ],
  'mechanic--regulatory-arbitrage--regulatory-arbitrage': [
    'arbitrage', 'jurisdiction', 'offshore', 'loophole', 'haven',
    'shopping', 'weakest link', 'evade'
  ],
  'mechanic--regulatory-fragmentation--regulatory-fragmentation': [
    'patchwork', 'inconsistent', 'fragmented', 'state-by-state',
    'varies by', 'different rules', 'uneven'
  ],
  'mechanic--governance-vacuum--governance-vacuum': [
    'governance vacuum', 'no authority', 'ungoverned', 'lawless',
    'no treaty', 'unregulated space', 'gap in governance'
  ],
  'mechanic--enforcement-paradox--enforcement-paradox': [
    'enforcement', 'compliance failure', 'violation', 'weak enforcement'
  ],
  'mechanic--lobbying--lobbying-intensity-response': [
    'lobby', 'political', 'campaign contribution', 'donation', 'influence', 'PAC'
  ],
  'mechanic--norm-erosion-dynamic--norm-erosion-dynamics': [
    'norm erosion', 'standard', 'decay', 'degradation', 'weakening norms'
  ],
  'mechanic--just-in-time-fragility--just-in-time-fragility': [
    'just-in-time', 'inventory', 'buffer', 'stockpile', 'shortage',
    'supply chain', 'disruption'
  ],
  'mechanic--chokepoint-concentration--chokepoint-concentration': [
    'chokepoint', 'bottleneck', 'concentrated', 'single point of failure',
    'strait', 'canal', 'critical infrastructure'
  ],
  'mechanic--geographic-concentration--geographic-concentration': [
    'concentrated in', 'geographic', 'region', 'localized', 'cluster'
  ],
  'mechanic--demographic-momentum--demographic-momentum': [
    'demographic', 'population', 'aging', 'birth rate', 'fertility',
    'generation', 'cohort'
  ],
  'mechanic--age-selective-mobility--age-selective-mobility': [
    'brain drain', 'emigration', 'exodus', 'talent flight', 'workforce leaving'
  ],
  'mechanic--labor-exploitation--labor-exploitation': [
    'exploitation', 'wage theft', 'worker', 'gig', 'precarious', 'contractor'
  ],
  'mechanic--disparate-impact--disparate-impact': [
    'disparate', 'disproportionate', 'unequal', 'affected group',
    'vulnerable', 'marginalized', 'communities of color'
  ],
  'mechanic--civildisobedience--civildisobedience': [
    'protest', 'civil disobedience', 'resistance', 'uprising', 'revolt', 'strike'
  ],
  'mechanic--financial-death-spiral--financial-death-spiral': [
    'death spiral', 'bankruptcy', 'insolvency', 'collapse', 'funding crisis'
  ],
  'mechanic--private-equity-extraction--private-equity-extraction': [
    'private equity', 'leveraged buyout', 'asset stripping', 'extraction'
  ],
  'mechanic--dual-use-dilemma--dual-use-dilemma': [
    'dual-use', 'dual use', 'beneficial and harmful', 'weapon', 'misuse potential'
  ],
  'mechanic--algorithmic-amplification--algorithmic-amplification': [
    'algorithm', 'amplification', 'recommendation', 'viral', 'engagement'
  ],
  'mechanic--black-market-emergence--black-market-emergence': [
    'black market', 'illegal', 'underground', 'smuggling', 'trafficking'
  ],
  'mechanic--irreversible--water-extraction-irreversibility': [
    'irreversible', 'permanent damage', 'cannot recover', 'depletion'
  ],
};

// Issue-specific overrides for accuracy
const ISSUE_MECHANICS: Record<string, string[]> = {
  'abortion-access-crisis': [
    'mechanic--regulatory-fragmentation--regulatory-fragmentation',
    'mechanic--disparate-impact--disparate-impact',
    'mechanic--feedback-loop--feedback-loop',
  ],
  'academic-replication-crisis-and-fraud': [
    'mechanic--information-asymmetry--information-asymmetry',
    'mechanic--regulatory-capture--regulatory-capture-by-incumbents',
    'mechanic--cascade--epistomological-collapse-cascade',
  ],
  'accessibility-compliance-failure': [
    'mechanic--enforcement-paradox--enforcement-paradox',
    'mechanic--regulatory-fragmentation--regulatory-fragmentation',
    'mechanic--disparate-impact--disparate-impact',
    'mechanic--path-dependency--path-dependency-lock-in',
  ],
  'adolescence-extension-delayed-adulthood': [
    'mechanic--feedback-loop--feedback-loop',
    'mechanic--economic-lock-in--economic-lock-in',
    'mechanic--path-dependency--path-dependency-lock-in',
  ],
  'afghanistan-taliban-takeover': [
    'mechanic--governance-vacuum--governance-vacuum',
    'mechanic--cascade--epistomological-collapse-cascade',
    'mechanic--feedback-loop--feedback-loop',
  ],
  'african-climate-refugee-crisis': [
    'mechanic--cascade--epistomological-collapse-cascade',
    'mechanic--feedback-loop--feedback-loop',
    'mechanic--threshold--confidencethreshold',
    'mechanic--tipping-point--tipping-point',
  ],
  'ai-alignment-crisis': [
    'mechanic--threshold--confidencethreshold',
    'mechanic--feedback-loop--feedback-loop',
    'mechanic--path-dependency--path-dependency-lock-in',
    'mechanic--dual-use-dilemma--dual-use-dilemma',
  ],
  'ai-job-displacement-tsunami': [
    'mechanic--cascade--epistomological-collapse-cascade',
    'mechanic--feedback-loop--feedback-loop',
    'mechanic--threshold--confidencethreshold',
  ],
  'antibiotic-resistance-crisis': [
    'mechanic--feedback-loop--feedback-loop',
    'mechanic--tragedy-of-common--tragedy-of-commons',
    'mechanic--cascade--epistomological-collapse-cascade',
    'mechanic--threshold--confidencethreshold',
  ],
  'autonomous-weapons-proliferation': [
    'mechanic--asymmetric-arms-race--asymmetric-arms-race',
    'mechanic--governance-vacuum--governance-vacuum',
    'mechanic--dual-use-dilemma--dual-use-dilemma',
    'mechanic--first-strike-advantage--first-strike-advantage',
  ],
  'atlantic-overturning-collapse-risk-amoc': [
    'mechanic--tipping-point--tipping-point',
    'mechanic--cascade--epistomological-collapse-cascade',
    'mechanic--feedback-loop--feedback-loop',
    'mechanic--threshold--confidencethreshold',
  ],
  'democratic-backsliding': [
    'mechanic--feedback-loop--feedback-loop',
    'mechanic--regulatory-capture--regulatory-capture-by-incumbents',
    'mechanic--norm-erosion-dynamic--norm-erosion-dynamics',
    'mechanic--path-dependency--path-dependency-lock-in',
  ],
  'gerrymandering-extremism': [
    'mechanic--regulatory-capture--regulatory-capture-by-incumbents',
    'mechanic--feedback-loop--feedback-loop',
    'mechanic--lock-in-effect--lock-in-effect',
  ],
  'gig-economy-serfdom': [
    'mechanic--labor-exploitation--labor-exploitation',
    'mechanic--information-asymmetry--information-asymmetry',
    'mechanic--moral-hazard--moral-hazard-from-coverage',
    'mechanic--regulatory-arbitrage--regulatory-arbitrage',
    'mechanic--network-effect--network-effects',
  ],
  'housing-affordability-crisis': [
    'mechanic--feedback-loop--feedback-loop',
    'mechanic--economic-lock-in--economic-lock-in',
    'mechanic--disparate-impact--disparate-impact',
    'mechanic--regulatory-capture--regulatory-capture-by-incumbents',
  ],
  'nuclear-escalation-spiral': [
    'mechanic--cascade--epistomological-collapse-cascade',
    'mechanic--first-strike-advantage--first-strike-advantage',
    'mechanic--threshold--confidencethreshold',
    'mechanic--tipping-point--tipping-point',
    'mechanic--feedback-loop--feedback-loop',
  ],
  'permafrost-methane-release': [
    'mechanic--tipping-point--tipping-point',
    'mechanic--feedback-loop--feedback-loop',
    'mechanic--cascade--epistomological-collapse-cascade',
    'mechanic--irreversible--water-extraction-irreversibility',
  ],
  'taiwan-invasion-crisis': [
    'mechanic--tipping-point--tipping-point',
    'mechanic--threshold--confidencethreshold',
    'mechanic--first-strike-advantage--first-strike-advantage',
    'mechanic--prisoners-dilemma--prisoners-dilemma',
    'mechanic--nash-equilibrium--nash-equilibrium',
    'mechanic--cascade--epistomological-collapse-cascade',
    'mechanic--chokepoint-concentration--chokepoint-concentration',
  ],
};

function matchMechanics(content: string): string[] {
  const contentLower = content.toLowerCase();
  const matched = new Set<string>();

  for (const [mechanicId, patterns] of Object.entries(MECHANICS_PATTERNS)) {
    for (const pattern of patterns) {
      if (contentLower.includes(pattern)) {
        matched.add(mechanicId);
        break;
      }
    }
  }

  return Array.from(matched).sort();
}

function processIssue(filepath: string): { slug: string; mechanics: string[]; wasUpdated: boolean } {
  const slug = path.basename(filepath, '.md');
  const content = fs.readFileSync(filepath, 'utf-8');

  // Check if already has mechanics
  if (!content.match(/^mechanics:\s*\[\]/m)) {
    return { slug, mechanics: [], wasUpdated: false };
  }

  // Get mechanics - use override if available, otherwise match from content
  let mechanics: string[];
  if (ISSUE_MECHANICS[slug]) {
    mechanics = ISSUE_MECHANICS[slug];
  } else {
    mechanics = matchMechanics(content);
  }

  if (mechanics.length === 0) {
    return { slug, mechanics: [], wasUpdated: false };
  }

  // Format mechanics as YAML list
  const mechanicsYaml = 'mechanics:\n' + mechanics.map(m => `  - ${m}`).join('\n');

  // Replace mechanics: [] with the list
  const newContent = content.replace(/^mechanics:\s*\[\]/m, mechanicsYaml);

  fs.writeFileSync(filepath, newContent, 'utf-8');

  return { slug, mechanics, wasUpdated: true };
}

function main() {
  if (!fs.existsSync(ISSUES_DIR)) {
    console.error(`Error: ${ISSUES_DIR} not found. Run from shadow-workipedia root.`);
    process.exit(1);
  }

  let updated = 0;
  let total = 0;
  const issuesByMechanic: Record<string, number> = {};

  const files = fs.readdirSync(ISSUES_DIR).filter(f => f.endsWith('.md')).sort();

  for (const filename of files) {
    const filepath = path.join(ISSUES_DIR, filename);
    const { slug, mechanics, wasUpdated } = processIssue(filepath);
    total++;

    if (wasUpdated) {
      updated++;
      console.log(`✓ ${slug}: ${mechanics.length} mechanics`);
      for (const m of mechanics) {
        issuesByMechanic[m] = (issuesByMechanic[m] || 0) + 1;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total issues: ${total}`);
  console.log(`Updated: ${updated}`);
  console.log(`\nMechanics usage (top 15):`);
  const sortedMechanics = Object.entries(issuesByMechanic).sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [m, count] of sortedMechanics) {
    console.log(`  ${m}: ${count}`);
  }
}

main();

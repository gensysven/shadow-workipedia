#!/usr/bin/env python3
"""
Batch apply mechanics tags to issue wiki pages.
Run from shadow-workipedia root: python3 scripts/apply-mechanics-tags.py
"""
import os
import re
import sys

# Valid mechanics and their patterns (lowercase keywords to match)
MECHANICS_PATTERNS = {
    # Core causal patterns
    "mechanic--feedback-loop--feedback-loop": [
        "feedback", "reinforcing", "spiral", "worsens", "amplifies", "compounds",
        "cyclical", "vicious cycle", "self-perpetuating", "accelerate"
    ],
    "mechanic--cascade--epistomological-collapse-cascade": [
        "cascade", "chain reaction", "domino", "ripple", "spillover", "contagion",
        "spreading", "trigger", "knock-on"
    ],
    "mechanic--threshold--confidencethreshold": [
        "threshold", "tipping", "critical mass", "breaking point", "crosses",
        "reaches", "point of no return"
    ],
    "mechanic--tipping-point--tipping-point": [
        "irreversible", "tipping point", "point of no return", "permanent",
        "catastrophic", "cannot be undone"
    ],
    "mechanic--network-effect--network-effects": [
        "network effect", "platform", "adoption", "winner-take-all", "scale",
        "monopoly", "dominant", "ecosystem lock"
    ],
    "mechanic--path-dependency--path-dependency-lock-in": [
        "path dependency", "lock-in", "legacy", "historical", "past decisions",
        "inherited", "entrenched", "structural"
    ],
    "mechanic--lock-in-effect--lock-in-effect": [
        "lock-in", "switching cost", "sunk cost", "trapped", "cannot switch"
    ],
    "mechanic--economic-lock-in--economic-lock-in": [
        "debt", "mortgage", "loan", "financial trap", "cannot afford"
    ],

    # Market failures
    "mechanic--information-asymmetry--information-asymmetry": [
        "asymmetry", "hidden", "opaque", "fraud", "deception", "manipulation",
        "insider", "lack of transparency", "unknown"
    ],
    "mechanic--moral-hazard--moral-hazard-from-coverage": [
        "moral hazard", "risk-taking", "insured", "bailout", "protected from",
        "too big to fail", "socialize losses"
    ],
    "mechanic--adverse-selection--adverse-selection-in-cyber-insurance": [
        "adverse selection", "high-risk", "selection bias"
    ],
    "mechanic--externality--externality-pricing": [
        "externality", "external cost", "pollution", "unpriced", "socialized",
        "burden on", "third party", "commons"
    ],
    "mechanic--market-failure--geographic-market-failure": [
        "market failure", "geographic", "regional", "local monopoly", "access"
    ],
    "mechanic--tragedy-of-common--tragedy-of-commons": [
        "commons", "overuse", "overfishing", "overgrazing", "depletion",
        "shared resource", "collective action"
    ],

    # Game theory
    "mechanic--prisoners-dilemma--prisoners-dilemma": [
        "prisoner", "defect", "cooperation failure", "race to bottom",
        "collective action problem", "mutual distrust"
    ],
    "mechanic--nash-equilibrium--nash-equilibrium": [
        "equilibrium", "stable but suboptimal", "stuck", "no incentive to change"
    ],
    "mechanic--first-strike-advantage--first-strike-advantage": [
        "first strike", "preemptive", "offense dominance", "attack first",
        "surprise", "initiative"
    ],
    "mechanic--asymmetric-arms-race--asymmetric-arms-race": [
        "arms race", "escalation", "buildup", "military", "weapons"
    ],

    # Governance/regulatory
    "mechanic--regulatory-capture--regulatory-capture-by-incumbents": [
        "regulatory capture", "lobbying", "industry influence", "revolving door",
        "incumbent", "powerful interest"
    ],
    "mechanic--regulatory-arbitrage--regulatory-arbitrage": [
        "arbitrage", "jurisdiction", "offshore", "loophole", "haven",
        "shopping", "weakest link"
    ],
    "mechanic--regulatory-fragmentation--regulatory-fragmentation": [
        "patchwork", "inconsistent", "fragmented", "state-by-state",
        "varies by", "different rules"
    ],
    "mechanic--governance-vacuum--governance-vacuum": [
        "governance vacuum", "no authority", "ungoverned", "lawless",
        "no treaty", "unregulated", "gap"
    ],
    "mechanic--enforcement-paradox--enforcement-paradox": [
        "enforcement", "compliance", "violation", "weak enforcement"
    ],
    "mechanic--lobbying--lobbying-intensity-response": [
        "lobby", "political", "campaign", "donation", "influence", "PAC"
    ],
    "mechanic--norm-erosion-dynamic--norm-erosion-dynamics": [
        "norm", "standard", "erosion", "decay", "degradation", "weakening"
    ],

    # Supply chain/infrastructure
    "mechanic--just-in-time-fragility--just-in-time-fragility": [
        "just-in-time", "inventory", "buffer", "stockpile", "shortage",
        "supply chain", "disruption"
    ],
    "mechanic--chokepoint-concentration--chokepoint-concentration": [
        "chokepoint", "bottleneck", "concentrated", "single point",
        "strait", "canal", "critical infrastructure"
    ],
    "mechanic--geographic-concentration--geographic-concentration": [
        "concentrated", "geographic", "region", "localized", "cluster"
    ],

    # Social dynamics
    "mechanic--demographic-momentum--demographic-momentum": [
        "demographic", "population", "aging", "birth rate", "fertility",
        "generation", "cohort"
    ],
    "mechanic--age-selective-mobility--age-selective-mobility": [
        "brain drain", "emigration", "exodus", "talent", "workforce", "leaving"
    ],
    "mechanic--labor-exploitation--labor-exploitation": [
        "exploitation", "wage", "worker", "gig", "precarious", "contractor"
    ],
    "mechanic--disparate-impact--disparate-impact": [
        "disparate", "disproportionate", "unequal", "affected group",
        "vulnerable", "marginalized"
    ],
    "mechanic--civildisobedience--civildisobedience": [
        "protest", "civil disobedience", "resistance", "uprising", "revolt"
    ],

    # Financial
    "mechanic--financial-death-spiral--financial-death-spiral": [
        "death spiral", "bankruptcy", "insolvency", "collapse", "funding crisis"
    ],
    "mechanic--private-equity-extraction--private-equity-extraction": [
        "private equity", "leveraged buyout", "asset stripping", "extraction"
    ],

    # Technical
    "mechanic--dual-use-dilemma--dual-use-dilemma": [
        "dual-use", "dual use", "beneficial and harmful", "weapon", "misuse"
    ],
    "mechanic--algorithmic-amplification--algorithmic-amplification": [
        "algorithm", "amplification", "recommendation", "viral", "engagement"
    ],
    "mechanic--multi-factor-vulnerability--multi-factor-vulnerability": [
        "multiple", "compounding", "intersecting", "overlapping"
    ],
    "mechanic--paranoia-equilibrium--paranoia-equilibrium": [
        "paranoia", "distrust", "suspicion", "zero trust"
    ],
    "mechanic--black-market-emergence--black-market-emergence": [
        "black market", "illegal", "underground", "smuggling", "trafficking"
    ],

    # Hydrological
    "mechanic--ghyben-herzberg-amplification--ghyben-herzberg-amplification": [
        "saltwater intrusion", "aquifer", "groundwater", "salt"
    ],
    "mechanic--irreversible--water-extraction-irreversibility": [
        "irreversible", "permanent", "cannot recover", "depletion"
    ],

    # Other
    "mechanic--bidirectional-feedback--bidirectional-feedback": [
        "bidirectional", "two-way", "mutual"
    ],
    "mechanic--substitution-elasticity--substitution-elasticity": [
        "substitute", "alternative", "replacement", "elasticity"
    ],
}

# Issue-specific overrides (for accuracy)
ISSUE_MECHANICS = {
    # Political/governance issues
    "abortion-access-crisis": [
        "mechanic--regulatory-fragmentation--regulatory-fragmentation",
        "mechanic--disparate-impact--disparate-impact",
        "mechanic--feedback-loop--feedback-loop",
    ],
    "democratic-backsliding": [
        "mechanic--feedback-loop--feedback-loop",
        "mechanic--regulatory-capture--regulatory-capture-by-incumbents",
        "mechanic--norm-erosion-dynamic--norm-erosion-dynamics",
        "mechanic--path-dependency--path-dependency-lock-in",
    ],
    "gerrymandering-extremism": [
        "mechanic--regulatory-capture--regulatory-capture-by-incumbents",
        "mechanic--feedback-loop--feedback-loop",
        "mechanic--lock-in-effect--lock-in-effect",
    ],

    # AI/Tech issues
    "ai-alignment-crisis": [
        "mechanic--threshold--confidencethreshold",
        "mechanic--feedback-loop--feedback-loop",
        "mechanic--path-dependency--path-dependency-lock-in",
        "mechanic--dual-use-dilemma--dual-use-dilemma",
    ],
    "ai-job-displacement-tsunami": [
        "mechanic--cascade--epistomological-collapse-cascade",
        "mechanic--feedback-loop--feedback-loop",
        "mechanic--threshold--confidencethreshold",
        "mechanic--economic-lock-in--economic-lock-in",
    ],
    "autonomous-weapons-proliferation": [
        "mechanic--asymmetric-arms-race--asymmetric-arms-race",
        "mechanic--governance-vacuum--governance-vacuum",
        "mechanic--dual-use-dilemma--dual-use-dilemma",
        "mechanic--first-strike-advantage--first-strike-advantage",
    ],

    # Climate issues
    "atlantic-overturning-collapse-risk-amoc": [
        "mechanic--tipping-point--tipping-point",
        "mechanic--cascade--epistomological-collapse-cascade",
        "mechanic--feedback-loop--feedback-loop",
        "mechanic--threshold--confidencethreshold",
    ],
    "arctic-blue-ocean-event-and-jet-stream-breakdown": [
        "mechanic--tipping-point--tipping-point",
        "mechanic--feedback-loop--feedback-loop",
        "mechanic--cascade--epistomological-collapse-cascade",
    ],
    "permafrost-methane-release": [
        "mechanic--tipping-point--tipping-point",
        "mechanic--feedback-loop--feedback-loop",
        "mechanic--cascade--epistomological-collapse-cascade",
        "mechanic--irreversible--water-extraction-irreversibility",
    ],

    # Security issues
    "taiwan-invasion-crisis": [
        "mechanic--tipping-point--tipping-point",
        "mechanic--threshold--confidencethreshold",
        "mechanic--first-strike-advantage--first-strike-advantage",
        "mechanic--prisoners-dilemma--prisoners-dilemma",
        "mechanic--nash-equilibrium--nash-equilibrium",
        "mechanic--cascade--epistomological-collapse-cascade",
        "mechanic--chokepoint-concentration--chokepoint-concentration",
    ],
    "nuclear-escalation-spiral": [
        "mechanic--cascade--epistomological-collapse-cascade",
        "mechanic--first-strike-advantage--first-strike-advantage",
        "mechanic--threshold--confidencethreshold",
        "mechanic--tipping-point--tipping-point",
        "mechanic--feedback-loop--feedback-loop",
    ],

    # Economic issues
    "housing-affordability-crisis": [
        "mechanic--feedback-loop--feedback-loop",
        "mechanic--economic-lock-in--economic-lock-in",
        "mechanic--disparate-impact--disparate-impact",
        "mechanic--regulatory-capture--regulatory-capture-by-incumbents",
    ],
    "gig-economy-serfdom": [
        "mechanic--labor-exploitation--labor-exploitation",
        "mechanic--information-asymmetry--information-asymmetry",
        "mechanic--moral-hazard--moral-hazard-from-coverage",
        "mechanic--regulatory-arbitrage--regulatory-arbitrage",
        "mechanic--network-effect--network-effects",
    ],
}

def match_mechanics(content: str) -> list[str]:
    """Find mechanics that match content patterns."""
    content_lower = content.lower()
    matched = set()

    for mechanic_id, patterns in MECHANICS_PATTERNS.items():
        for pattern in patterns:
            if pattern in content_lower:
                matched.add(mechanic_id)
                break

    return sorted(matched)

def process_issue(filepath: str) -> tuple[str, list[str], bool]:
    """Process a single issue file. Returns (slug, mechanics, was_updated)."""
    slug = os.path.basename(filepath).replace('.md', '')

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already has mechanics
    if not re.search(r'^mechanics:\s*\[\]', content, re.MULTILINE):
        return slug, [], False

    # Get mechanics - use override if available, otherwise match from content
    if slug in ISSUE_MECHANICS:
        mechanics = ISSUE_MECHANICS[slug]
    else:
        mechanics = match_mechanics(content)

    if not mechanics:
        return slug, [], False

    # Format mechanics as YAML list
    mechanics_yaml = "mechanics:\n" + "\n".join(f"  - {m}" for m in mechanics)

    # Replace mechanics: [] with the list
    new_content = re.sub(r'^mechanics:\s*\[\]', mechanics_yaml, content, count=1, flags=re.MULTILINE)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return slug, mechanics, True

def main():
    issues_dir = "wiki/issues"
    if not os.path.exists(issues_dir):
        print(f"Error: {issues_dir} not found. Run from shadow-workipedia root.")
        sys.exit(1)

    updated = 0
    total = 0
    issues_by_mechanic: dict[str, int] = {}

    for filename in sorted(os.listdir(issues_dir)):
        if not filename.endswith('.md'):
            continue

        filepath = os.path.join(issues_dir, filename)
        slug, mechanics, was_updated = process_issue(filepath)
        total += 1

        if was_updated:
            updated += 1
            print(f"✓ {slug}: {len(mechanics)} mechanics")
            for m in mechanics:
                issues_by_mechanic[m] = issues_by_mechanic.get(m, 0) + 1
        elif mechanics:
            print(f"- {slug}: already tagged")

    print(f"\n=== Summary ===")
    print(f"Total issues: {total}")
    print(f"Updated: {updated}")
    print(f"\nMechanics usage:")
    for m, count in sorted(issues_by_mechanic.items(), key=lambda x: -x[1])[:15]:
        print(f"  {m}: {count}")

if __name__ == "__main__":
    main()

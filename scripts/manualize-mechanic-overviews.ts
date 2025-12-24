import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

type OverviewMap = Record<string, string>;

const MECHANIC_OVERVIEWS: OverviewMap = {
  'mechanic--adverse-selection--adverse-selection': [
    'Adverse selection happens when risk is hard to observe or price: the actors most likely to suffer losses are the most motivated to buy in, while lower-risk actors opt out as terms worsen.',
    'That shifts the pool toward higher average risk, which forces premiums, collateral, or restrictions to tighten further—often turning into a self-reinforcing market unraveling.',
  ].join('\n\n'),
  'mechanic--age-selective-mobility--age-selective-mobility': [
    'Migration is rarely “population-neutral”: it is disproportionately carried by young and working-age cohorts who can move, take risks, and chase opportunity.',
    'That concentrates labor and fertility in destination regions while leaving origin regions with higher dependency ratios, shrinking tax bases, and accelerating service collapse (schools, healthcare, local government).',
  ].join('\n\n'),
  'mechanic--algorithmic-amplification--algorithmic-amplification': [
    'Algorithmic amplification describes engagement-optimized ranking systems that systematically over-expose emotionally charged, polarizing, or sensational content.',
    'Because attention is a scarce resource, amplification reshapes what “seems normal,” accelerates belief cascades, and makes coordination (or harassment) easier—often faster than institutions can respond.',
  ].join('\n\n'),
  'mechanic--asymmetric-arms-race--asymmetric-arms-race': [
    'An asymmetric arms race occurs when the offense–defense balance is uneven: attackers can choose timing and surface area, while defenders must cover everything all the time.',
    'Small offensive gains compound into persistent advantage, driving defenders into cost spirals or desperate doctrine shifts (preemption, automation, escalation).',
  ].join('\n\n'),
  'mechanic--black-market-emergence--black-market-emergence': [
    'Black markets form when demand persists but legal supply is restricted, risky, or too slow—shifting exchange into informal networks that can price risk and evade oversight.',
    'Over time, illicit markets erode legitimacy, corrupt enforcement, and can become a parallel governance layer (violence, protection rackets, counterfeit goods, unsafe substitutes).',
  ].join('\n\n'),
  'mechanic--cascade--cascade': [
    'A cascade is a chain reaction where one failure increases the likelihood or severity of subsequent failures across connected systems.',
    'Cascades are driven by tight coupling and missing buffers: what looks like a local incident becomes systemic when dependencies share chokepoints or synchronized timing.',
  ].join('\n\n'),
  'mechanic--civildisobedience--civildisobedience': [
    'Civil disobedience is coordinated, visible noncompliance used to contest legitimacy, raise the costs of enforcement, and force negotiation or concessions.',
    'Its power comes from collective action and narrative: the same act can be treated as lawful protest or subversion depending on public sympathy and state capacity.',
  ].join('\n\n'),
  'mechanic--concentration--concentration': [
    'Concentration is the accumulation of economic, informational, or political power into fewer hands—firms, platforms, families, agencies, or blocs.',
    'As concentration rises, competition and accountability weaken, dependence increases, and the system becomes both more extractive and more brittle (single points of failure, capture, rent-seeking).',
  ].join('\n\n'),
  'mechanic--demographic-momentum--demographic-momentum': [
    'Demographic momentum is the inertia of age structure: today’s population pyramid locks in decades of future births, deaths, and dependency ratios even if policies change immediately.',
    'It turns fast political cycles into slow-motion inevitabilities—pensions, labor markets, and care systems can be forecast to strain long before decision-makers feel pressure to act.',
  ].join('\n\n'),
  'mechanic--disparate-impact--disparate-impact': [
    'Disparate impact is when a “neutral” rule or technology produces systematically unequal outcomes across groups due to baseline differences in exposure, access, or vulnerability.',
    'It often triggers legitimacy crises: harm can be real even without intent, and mitigation requires either redesign (changing the rule) or compensation (changing who bears the cost).',
  ].join('\n\n'),
  'mechanic--dual-use-dilemma--dual-use-dilemma': [
    'The dual-use dilemma is the governance problem of capabilities that are valuable for benign goals but also lower the barrier to harm when misused.',
    'It produces recurring tradeoffs between openness and control, speed and safety, and innovation and security—especially when diffusion outpaces regulation and enforcement.',
  ].join('\n\n'),
  'mechanic--enforcement-paradox--enforcement-paradox': [
    'The enforcement paradox is when tightening rules without credible capacity backfires: selective enforcement, evasion, and politicization can increase both harm and resentment.',
    'It shows up when compliance is expensive, penalties are uneven, or enforcement institutions are captured—creating incentives to shift activity into harder-to-monitor channels.',
  ].join('\n\n'),
  'mechanic--externality--externality': [
    'An externality occurs when decision-makers don’t bear the full costs (or capture the full benefits) of their actions, so private incentives diverge from collective welfare.',
    'Externalities accumulate as hidden debt—pollution, burnout, fragility—until they surface as crises that markets alone cannot price or repair.',
  ].join('\n\n'),
  'mechanic--feedback-loop--feedback-loop': [
    'Feedback loops are circular causal structures: outputs feed back into inputs, either reinforcing change (runaway growth/decline) or balancing it (stabilization).',
    'They explain why systems can look stable and then suddenly accelerate—especially when delays hide the loop until it overshoots into crisis.',
  ].join('\n\n'),
  'mechanic--financial-death-spiral--financial-death-spiral': [
    'A financial death spiral is a self-reinforcing deterioration where falling revenue and rising risk premiums force cuts that further reduce performance and trust.',
    'Once refinancing becomes expensive or impossible, the spiral compresses time: what was manageable debt becomes imminent default, and second-order failures spread to dependents.',
  ].join('\n\n'),
  'mechanic--first-strike-advantage--first-strike-advantage': [
    'First-strike advantage is the strategic instability created when acting first can disable an opponent’s ability to respond—especially in fast, ambiguous domains like cyber, drones, hypersonics, or bio attribution.',
    'When timelines are compressed and signals are noisy, “use-it-or-lose-it” logic can turn defensive posture into perceived threat and push actors toward preemption.',
  ].join('\n\n'),
  'mechanic--ghyben-herzberg-amplification--ghyben-herzberg-amplification': [
    'The Ghyben–Herzberg effect describes the fragile balance of coastal freshwater lenses floating on seawater; small changes in sea level or pumping can drive disproportionate saltwater intrusion.',
    'It’s an amplifier because salinization reduces usable water, which often increases pumping and land subsidence, worsening intrusion further and making recovery slow or impossible.',
  ].join('\n\n'),
  'mechanic--governance-vacuum--governance-vacuum': [
    'A governance vacuum forms when the state cannot reliably provide security, services, or adjudication—leaving a gap that other actors fill.',
    'The replacement “governance” may be informal, coercive, or fragmented (militias, cartels, corporate provision, NGOs), often trading stability for rights and long-term capacity.',
  ].join('\n\n'),
  'mechanic--information-asymmetry--information-asymmetry': [
    'Information asymmetry is a persistent mismatch in what different parties know, can verify, or can prove—creating distorted incentives.',
    'It fuels fraud, adverse selection, and capture: when trust can’t be cheaply established, markets and institutions shift toward exclusion, surveillance, or breakdown.',
  ].join('\n\n'),
  'mechanic--irreversibility--irreversibility': [
    'Irreversibility describes damage or regime shifts that cannot be undone on relevant timescales, even if the original cause is removed.',
    'It raises the stakes of early action: once thresholds are crossed—ecological loss, trust collapse, infrastructure decay—policy becomes triage rather than prevention.',
  ].join('\n\n'),
  'mechanic--just-in-time-fragility--just-in-time-fragility': [
    'Just-in-time fragility is the tradeoff where efficiency is purchased by removing slack—inventory, redundancy, staffing buffers, or spare capacity.',
    'When shocks arrive, the absence of buffers turns minor disruptions into cascading outages, rationing, and panic responses that are hard to coordinate in real time.',
  ].join('\n\n'),
  'mechanic--labor-exploitation--labor-exploitation': [
    'Labor exploitation is the systematic transfer of risk and cost onto workers through precarity, asymmetric bargaining power, and weak enforcement of standards.',
    'It can “work” financially in the short run, but it degrades capacity via burnout, turnover, skill loss, and backlash—eventually becoming an operational and political liability.',
  ].join('\n\n'),
  'mechanic--lobbying--lobbying': [
    'Lobbying is the conversion of concentrated economic resources into policy influence—shaping rules, enforcement, and public narratives in ways that often diverge from broad public interest.',
    'Because the benefits are concentrated and costs are diffuse, lobbying can dominate agenda-setting, slow reform, and normalize capture even without overt corruption.',
  ].join('\n\n'),
  'mechanic--lock-in--lock-in': [
    'Lock-in occurs when switching away from a technology, policy, or institution becomes prohibitively costly due to infrastructure, contracts, standards, or cultural habits.',
    'Once locked in, “better alternatives” struggle to win; change requires coordinated transitions, subsidies, or shocks that justify paying the switching costs.',
  ].join('\n\n'),
  'mechanic--market-failure--market-failure': [
    'Market failure is when decentralized exchange produces persistently harmful or inefficient outcomes—because prices can’t reflect real constraints, power is uneven, or information is missing.',
    'In Shadow Work terms, it’s the moment when “let the market handle it” becomes a generator of fragility, requiring governance, public provision, or constraint to restore stability.',
  ].join('\n\n'),
  'mechanic--moral-hazard--moral-hazard': [
    'Moral hazard arises when protection against losses (insurance, bailouts, guarantees) changes behavior, making risky actions privately attractive and collectively costly.',
    'It’s especially destabilizing when the downside is socialized but the upside remains private—encouraging leverage, corner-cutting, and fragile equilibria.',
  ].join('\n\n'),
  'mechanic--multi-factor-vulnerability--multi-factor-vulnerability': [
    'Multi-factor vulnerability is when failures rarely have a single cause: multiple moderate stresses align and overwhelm capacity at once.',
    'It explains “surprising” collapses—systems can tolerate each stressor individually, but correlations and timing turn manageable problems into synchronized breakdown.',
  ].join('\n\n'),
  'mechanic--nash-equilibrium--nash-equilibrium': [
    'A Nash equilibrium is a stable outcome where no actor can improve their position by unilaterally changing strategy—given what others are doing.',
    'Stability isn’t the same as desirability: many crises are locked into equilibria that are rational locally but disastrous globally until coordination mechanisms shift incentives.',
  ].join('\n\n'),
  'mechanic--network-effect--network-effects': [
    'Network effects mean the value of a platform, protocol, or ecosystem rises with the number of participants, pushing markets toward winner-take-most dynamics.',
    'That creates durable lock-in: once a network becomes dominant, switching requires coordination (interoperability, portability, standards) rather than a merely “better product.”',
  ].join('\n\n'),
  'mechanic--norm-erosion-dynamic--norm-erosion-dynamics': [
    'Norm erosion is the gradual breakdown of informal rules—truthfulness, restraint, fair process—through repeated boundary violations that go unpunished.',
    'As expectations shift, enforcement becomes harder: each tolerated breach raises the next acceptable breach, until institutions face a legitimacy cliff or a hard crackdown.',
  ].join('\n\n'),
  'mechanic--paranoia-equilibrium--paranoia-equilibrium': [
    'A paranoia equilibrium is a self-sustaining security dilemma: because actors expect betrayal, they interpret defensive moves as offensive and escalate accordingly.',
    'Once fear dominates interpretation, trust signals stop working, and the system drifts toward preemption, surveillance, and brittle “stability” maintained by coercion.',
  ].join('\n\n'),
  'mechanic--prisoners-dilemma--prisoners-dilemma': [
    'The prisoner’s dilemma is the coordination trap where individually rational choices (defecting) produce collectively worse outcomes than cooperation.',
    'It persists when trust is low and enforcement is weak; durable cooperation requires repeated interaction, credible commitments, monitoring, and penalties for defection.',
  ].join('\n\n'),
  'mechanic--private-equity-extraction--private-equity-extraction': [
    'Private equity extraction is the pattern where leveraged ownership pulls value forward through debt loading, fees, and cost-cutting that outlasts the holding period.',
    'It can improve efficiency in some cases, but in essential services it often converts resilience into payouts—leaving workers, customers, and communities holding the downside when failures arrive.',
  ].join('\n\n'),
  'mechanic--regulatory-arbitrage--regulatory-arbitrage': [
    'Regulatory arbitrage is the practice of routing activity through the least restrictive jurisdiction, category, or interpretation to reduce costs or constraints.',
    'It turns fragmented governance into a competitive race to the bottom unless rules are harmonized or enforcement follows the activity rather than the paperwork.',
  ].join('\n\n'),
  'mechanic--regulatory-capture--regulatory-capture': [
    'Regulatory capture occurs when regulators come to serve the interests of the regulated—through lobbying, revolving doors, dependency on industry expertise, or political pressure.',
    'Captured systems preserve the appearance of oversight while weakening enforcement, delaying reforms, and protecting incumbents as harms accumulate.',
  ].join('\n\n'),
  'mechanic--regulatory-fragmentation--regulatory-fragmentation': [
    'Regulatory fragmentation is a patchwork of inconsistent rules across jurisdictions that creates loopholes, enforcement gaps, and compliance chaos.',
    'It empowers actors who can shop venues or relocate (capital, platforms) and weakens actors who can’t (workers, local governments), pushing problems into the seams between authorities.',
  ].join('\n\n'),
  'mechanic--substitution-elasticity--substitution-elasticity': [
    'Substitution elasticity is how easily people, firms, or states can switch away from a constrained input when prices rise or supply is disrupted.',
    'Low elasticity creates leverage and vulnerability (few alternatives, high switching costs); high elasticity absorbs shocks and blunts coercion by making exit feasible.',
  ].join('\n\n'),
  'mechanic--threshold--threshold': [
    'Threshold dynamics describe nonlinear triggers: once a variable crosses a critical value, behavior changes discontinuously and the system can shift regimes.',
    'Thresholds matter because incremental pressure can look safe until it isn’t—after which recovery may require far more effort than prevention (or may be impossible).',
    '',
    'This mechanic consolidates: threshold, tipping-point.',
  ].join('\n'),
  'mechanic--tragedy-of-common--tragedy-of-commons': [
    'The tragedy of the commons is the overuse of a shared resource when individual benefits are private but depletion costs are shared.',
    'Without governance—rules, monitoring, pricing, or exclusion—each actor has an incentive to extract “before others do,” producing collective ruin and late-stage conflict over scarcity.',
  ].join('\n\n'),
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function replaceOverview(content: string, newOverview: string): string {
  const re = /(## Overview\n)([\s\S]*?)(\n## How it works\n)/;
  if (!re.test(content)) {
    throw new Error('Could not find Overview → How it works section boundary');
  }
  return content.replace(re, `$1${newOverview.trim()}\n\n$3`);
}

function main() {
  const repoRoot = process.cwd();
  const mechanicsDir = join(repoRoot, 'wiki', 'mechanics');
  if (!existsSync(mechanicsDir)) throw new Error(`Missing dir: ${mechanicsDir}`);

  const files = readdirSync(mechanicsDir)
    .filter(f => f.endsWith('.md') && f !== '_TEMPLATE.md')
    .sort();

  const missing: string[] = [];
  let updated = 0;

  for (const file of files) {
    const filePath = join(mechanicsDir, file);
    const raw = readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, any>;
    const id = typeof fm.id === 'string' ? fm.id.trim() : file.replace(/\.md$/, '');
    const overview = MECHANIC_OVERVIEWS[id];
    if (!overview) {
      missing.push(id);
      continue;
    }

    const nextContent = replaceOverview(parsed.content, overview);
    const nextFrontmatter = { ...fm, lastUpdated: today() };
    const nextRaw = matter.stringify(nextContent, nextFrontmatter);
    if (nextRaw !== raw) {
      writeFileSync(filePath, nextRaw, 'utf8');
      updated++;
    }
  }

  if (missing.length > 0) {
    console.warn(`⚠️  Missing manual overviews for ${missing.length} mechanic pages:`);
    for (const id of missing) console.warn(`- ${id}`);
  }

  console.log(`✅ Updated ${updated} mechanic pages`);
}

main();

---
id: institutions-policing
title: Internal Security & Intelligence
domain: Simulation
relatedSystems: [institutions, politics, agents]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Internal Security & Intelligence

## Overview

This system covers two coupled pillars in the emergence layer: **Internal Security** (D6.3 — police capacity, surveillance, repression, terrorism risk) and **Intelligence** (D6.2 — espionage, covert influence, cyber operations, counterintelligence). Both are per-country daily signals, feeding each other and both reading from governance, public opinion, information, and the shared pressure system. Both are explicitly scaffold implementations: real mechanics, deliberately minimal.

## What It Simulates

- **Police capacity & restraint**: Structural coercive capacity drifts toward a seeded baseline modulated by governance enforcement capacity and counterintelligence capability. Restraint (checks on police power) tracks a target built from rule-of-law, rights protection, and institutional trust — high restraint means constrained security forces.
- **Repression as an emergent product**: Repression level is not directly tuned; it's driven each tick by `police_capacity * (1 - restraint)`, plus small contributions from social-unrest and political-instability pressure. High capacity paired with low restraint produces high repression.
- **Surveillance intensity**: Drifts toward a country's surveillance baseline, reduced as restraint rises — less restraint means more surveillance.
- **Terrorism risk (inverted-U)**: Terrorism risk responds to repression non-monotonically. Below the midpoint, rising repression acts as deterrence (a negative pull on risk); above the midpoint, it produces blowback (a positive pull), so both very low and very high repression carry more risk than a moderate middle. Foreign intelligence presence adds a further positive push (destabilization).
- **Corruption load**: Grows when police capacity is high but restraint is low — power without accountability — on top of a seeded baseline.
- **Intelligence capability, covert action, and cyber**: Intelligence capability degrades under imperial-overstretch pressure; covert action capacity rises under political-instability pressure (crisis creates covert opportunity); cyber capability and counterintelligence drift toward seeded baselines, with counterintelligence additionally scaled up by governance enforcement capacity.
- **Covert vs. transparent decision surface**: Each covert operation type (Espionage, CovertInfluence, Sabotage, CyberAttack, RegimeChange) has a paired transparent alternative (e.g., Diplomatic Inquiry, Public Diplomacy, Sanctions) and a base detection risk. A country's `transparency_choice_index` drifts based on its recent exposure rate and rights protection — getting caught pushes future behavior toward transparency, moderated by strong inertia.
- **Detection risk composition**: Actual detection risk for an operation combines its base risk with target-country press freedom and epistemic authority (both raise exposure), foreign intelligence presence in the target (raises exposure), and the acting country's own counterintelligence (lowers exposure, since counterintelligence here represents operational shielding).

## How It Affects Gameplay

**Player Levers:**
- Governance choices that move rule-of-law, rights protection, and enforcement capacity indirectly steer restraint, police capacity, and counterintelligence — there is no direct "repression slider."
- Running covert operations (espionage, sabotage, cyber, covert influence, regime change) versus their transparent alternatives is the core intelligence decision surface; op type sets both effectiveness and base detectability.
- Sustaining many simultaneous covert operations degrades intelligence capability further via the imperial-overstretch feedback and risks an overstretch pressure penalty once the active-ops count exceeds a small-portfolio threshold.

**Warning Indicators:**
- Rising repression alongside falling restraint signals a coercion buildup with legitimacy costs.
- Low-to-moderate repression suppresses terrorism risk (deterrence); pushing repression past its midpoint flips the effect to blowback, so terrorism risk climbs again at the high end.
- A high covert-exposure rate combined with low rights protection signals both eroding transparency and a legitimacy-crisis pressure channel opening up.
- Heavy surveillance stacked with a large "hypernormal gap" (public outward compliance vs. private distrust, read from public opinion) is a specific combination that tips toward open unrest.

**Win/Loss Conditions:**
- Internal Security feeds pressure deltas: sustained repression above a threshold pushes LegitimacyCrisis; the surveillance + hypernormal-gap combination pushes SocialUnrest; corruption above a threshold pushes EliteFracture.
- Intelligence feeds pressure deltas: high exposure rate pushes LegitimacyCrisis; active CyberAttack/Sabotage operations push MilitaryTension in the target; active RegimeChange operations push PoliticalInstability in the target; CovertInfluence operations push IdeologicalPolarization in the target; an oversized covert portfolio pushes ImperialOverstretch in the acting country. Each channel is capped per tick, so these are gradual drivers, not instant collapse triggers.

## System Interactions

### Feeds Into
- **[Institutions](institutions.md)** — police capacity, restraint, and corruption load describe the coercive/enforcement face of state institutions.
- **[Politics](politics.md)** — LegitimacyCrisis, SocialUnrest, EliteFracture, PoliticalInstability, MilitaryTension, and IdeologicalPolarization pressure deltas emitted by both pillars flow into the shared pressure store that political dynamics read from.
- **[Agents](agents.md)** — covert operations and their transparent alternatives constitute a decision surface actors/agents choose between.

### Receives From
- **Governance** — rule-of-law index, rights protection, enforcement capacity, and treaty compliance shape restraint, police-capacity targets, counterintelligence, and exposure penalties.
- **Public Opinion** — institutional trust feeds the restraint target; the hypernormal gap gates the surveillance-driven unrest pressure.
- **Information** — press freedom and epistemic authority raise detection risk for covert operations.
- **Pressures** — social-unrest and political-instability pressures feed into repression; imperial-overstretch and political-instability pressures feed into intelligence capability and covert action capacity.
- **Country archetypes** — both pillars seed their baselines (police capacity, surveillance, repression, terrorism, restraint, corruption for Internal Security; capability, covert action capacity, cyber capability, counterintelligence, foreign intelligence presence, covert preference bias, legal accountability for Intelligence) from each country's archetype record (GDP per capita, WGI composite, Fragile States Index, democracy index, HDI, military spending, internet penetration, press freedom score).

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/institutions-policing.md)

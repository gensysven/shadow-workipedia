---
id: media
title: Information & Public Opinion
domain: Simulation
relatedSystems: [politics, culture, pressures]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Information & Public Opinion

## Overview

This system pairs two emergence pillars modeling a country's epistemic
environment and how its population feels about it. **Information & Narrative**
(D4) tracks media, education, propaganda/disinformation, science, and culture,
converging on a keystone `narrative_coherence` signal — alignment between
actual conditions, institutional messaging, and public understanding.
**Public Opinion & Social Fabric** (D5.2) consumes that signal alongside
governance data to track institutional/interpersonal trust, social cohesion,
polarization, and a "hypernormal gap" between performed and actual trust. Both
run daily and feed the shared pressure pool that can destabilize a country.

## What It Simulates

- **Media ecosystem**: press freedom, ownership concentration, social media
  penetration, algorithmic amplification, filter-bubble intensity, trust in
  media — independent per-country channels.
- **Education**: enrollment, quality index, critical-thinking capacity, and
  brain drain, which feed the population's defenses against propaganda.
- **Propaganda & disinformation**: state media control, disinformation
  volume, censorship intensity, foreign influence exposure, and the derived
  `narrative_coherence` keystone.
- **Science & culture**: research capacity, epistemic authority, public trust
  in science, soft power, identity-narrative strength, cultural resistance.
- **Public opinion**: institutional/interpersonal trust, social cohesion, a
  polarization index, satisfaction by income quintile, and an epistemic
  "regime blend" (oral / literate / broadcast / networked / secondary-oral)
  that shapes how visible inequality and trust dynamics become.

## Mechanism: Information & Narrative Pillar (D4)

Each country's channels seed from its archetype record (GDP, Gini, Fragile
States Index, press freedom, democracy index, HDI, etc.). Every tick, each
channel drifts toward a **target** via a shared drift function with a
build/destroy asymmetry — recovery toward baseline is slow, degradation
under pressure faster — "(under active calibration — B5)".

Some channels' targets are modulated by upstream signals instead of just
baseline: press freedom by governance rights-protection (discounted by
political instability); filter-bubble intensity pushed up by ideological
polarization; trust in media capped by governance rule-of-law; state media
control pushed up by legitimacy crisis and scaled by enforcement capacity;
censorship intensity floored by governance censorship feasibility; brain
drain pushed up by economic strain. Remaining channels drift to baseline.

`narrative_coherence` is recomputed fresh each tick (not drifted) as a
weighted **defense** score (press freedom, critical thinking, epistemic
authority, cultural resistance) minus a weighted **attack** score (state
media control, disinformation volume, filter-bubble intensity, foreign
influence), offset by a base-coherence constant, clamped to `[0.0, 1.0]`.
Exact weights are fixed in code but not reproduced here — "(under active
calibration — B5)".

**Feeding the pressure family** — D4 emits per-tick deltas, each individually
capped per country — "(under active calibration — B5)": filter-bubble
intensity above a threshold → `IdeologicalPolarization`; narrative coherence
below a threshold → `LegitimacyCrisis`; high disinformation with low
coherence → `SocialUnrest`; high state media control → a small suppressive
contribution to `PoliticalInstability` (short-run narrative clampdown).

## Mechanism: Public Opinion & Social Fabric Pillar (D5.2)

Seeds also derive from archetype records: trust baselines, a polarization
baseline, a hypernormal-gap baseline (nonzero for Rentier/Fragile and
Semi-Periphery/Authoritarian-Industrial archetypes), literacy rate, oral
tradition strength, community network density, an initial quintile
satisfaction shape, an initial epistemic regime blend, and a performed-trust
baseline inflated above actual trust for compliance-theater-prone archetypes.

**Epistemic regime blend** — a five-component mix (oral, literate, broadcast,
networked, secondary-oral summing to 1.0) re-derived quarterly (not every
tick) from D4 signals plus seeded literacy/community parameters. Via dot
products against fixed per-regime coefficients, the blend yields a **trust
ceiling** (max institutional trust the regime allows), a **visibility
coefficient** (how strongly quintile inequality becomes perceptually
salient, Meyrowitz-style), and a **convergence rate** (how fast performed
trust chases actual trust).

**Trust dynamics** — institutional trust updates from a raw delta combining
governance rule-of-law, D4 narrative coherence, D4 epistemic authority, a
corruption penalty (proxied as `1 - rule_of_law`), and a Gini-based
inequality penalty, with mean-reversion. The raw delta then passes through
an **asymmetric ratchet**: positive deltas are scaled down by a build-
friction constant (further halved below a "trauma threshold"); negative
deltas pass through at a larger destroy multiplier. Result is clamped to
`[0, regime trust ceiling]` — trust can never exceed what the communication
structure allows. Interpersonal trust follows an analogous but separately
tuned asymmetry, driven by community network density, inverted filter-bubble
intensity, and social-unrest pressure — "(under active calibration — B5)".

**Satisfaction by quintile** — a material layer starts from the seeded shape
and adjusts for an economic-growth proxy (inverted economic strain) and
Gini, with per-quintile coefficients. A Meyrowitz visibility layer then
computes each quintile's perceived gap to the top quintile, scaled by the
regime's visibility coefficient, and subtracts a salience-weighted portion
from material satisfaction — visible inequality suppresses satisfaction even
when material conditions hold steady.

**Polarization and cohesion** — polarization comes from filter-bubble
intensity, an identity-mobilization proxy (from ideological-polarization
pressure), the top/bottom quintile spread, and a dampening term from prior
cohesion, then blended toward gradually rather than jumped to. Social
cohesion is derived downstream from the *current* tick's institutional
trust, interpersonal trust, polarization, and mean quintile satisfaction — it
is not an independently seeded/drifted channel.

**Hypernormal gap** — performed trust (behavioral compliance) converges
toward actual institutional trust at the regime's convergence rate, with an
enforcement-sustain term keeping performed trust elevated when actual trust
is low but enforcement capacity is high (coercion instead of legitimacy).
The gap is `performed_trust - actual_trust`, clamped to `[-0.5, 0.5]`; large
positive gap means compliance without belief.

**Feeding the pressure family** — D5.2 emits its own capped deltas — "(under
active calibration — B5)": low institutional trust → `LegitimacyCrisis`; low
social cohesion → `SocialUnrest`; high satisfaction spread with a low bottom
quintile → additional `SocialUnrest`; high polarization →
`IdeologicalPolarization`; a large hypernormal gap → a continuous
`LegitimacyCrisis` contribution (a proxy for a sharper one-shot "hypernormal
burst" event, not yet implemented as a discrete trigger).

A recent calibration pass found `ideological_polarization` and
`legitimacy_crisis`/`social_unrest` were the largest single feeds into the
pressure system over long traces, and both pillars' per-tick caps were
tightened in response — exact values "(under active calibration — B5)".
Structurally, every emission path from both pillars is capped per country
per tick so no single signal dominates the shared pressure pool.

## How It Affects Gameplay

**Player Levers:**
- Governance choices (rights protection, rule of law, enforcement capacity,
  censorship feasibility) indirectly steer press freedom, state media
  control, censorship, and trust ceilings.
- Education/science investment raises critical thinking and epistemic
  authority, strengthening narrative-coherence defense and trust inputs.
- Anything moving economic strain or Gini ripples into brain drain, quintile
  satisfaction, polarization, and trust.

**Warning Indicators:**
- Falling `narrative_coherence` with rising disinformation signals an
  information-integrity collapse headed toward legitimacy/unrest pressure.
- A widening hypernormal gap signals compliance sustained by enforcement
  rather than belief — a brittle state.
- Rising filter-bubble intensity feeds `IdeologicalPolarization` pressure
  directly and the polarization index, compounding into cohesion loss.

**Win/Loss Conditions:**
- Sustained low institutional trust and cohesion drive `LegitimacyCrisis` and
  `SocialUnrest` pressures that can destabilize a country's political system.
- A regime's epistemic structure caps how high institutional trust can ever
  climb regardless of governance quality — some information environments
  have a structurally low trust ceiling.

## System Interactions

### Feeds Into
- **[Pressures](pressures.md)** — capped deltas into `IdeologicalPolarization`,
  `LegitimacyCrisis`, `SocialUnrest`, and a suppressive contribution to
  `PoliticalInstability`.
- **[Politics](politics.md)** — institutional trust, legitimacy, and
  polarization shape political stability and governance legitimacy.
- **[Culture](culture.md)** — cultural signals and the epistemic regime blend
  interact with cultural dynamics.

### Receives From
- **Governance (D3)** — rights protection, censorship feasibility,
  enforcement capacity, and rule-of-law modulate D4 drift targets and D5.2
  trust deltas.
- **[Pressures](pressures.md)** — ideological polarization, political
  instability, legitimacy crisis, economic strain, and social unrest feed
  back into both pillars, forming feedback loops.
- **Archetypes** — country archetype records seed both pillars' baselines.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/media.md)

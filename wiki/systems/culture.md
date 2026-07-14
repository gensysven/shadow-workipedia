---
id: culture
title: Culture & Ideology
domain: Simulation
relatedSystems: [media, politics, pressures]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Culture & Ideology

## Overview

Culture & Ideology covers two related but distinct pillars of the simulation. **Cultural Evolution** (D8) tracks slow-drifting per-country cultural values — tradition vs. innovation, collectivism vs. individualism, authority acceptance, risk tolerance, trust radius, violence acceptance, and other-acceptance. **Ideology** models each agent's political position on four axes (economic, social, nationalist, conviction) and how compatible two agents' positions are. Culture is national background drift measured in years; ideology is per-agent positioning used for coalition and opposition dynamics. Both feed the shared `IdeologicalPolarization` pressure, though neither is its sole source.

## What It Simulates

**Cultural Evolution (per country, `CulturalEvolutionSignals`):**
- **Core values** (very slow per-tick drift cap before inertia scaling): `tradition_vs_innovation`, `collectivism_vs_individualism`, `authority_acceptance`, `risk_tolerance`
- **Social patterns** (a slightly larger per-tick drift cap): `trust_radius`, `violence_acceptance`, `other_acceptance`
- **Cultural inertia**: a derived resistance-to-change value computed from `authority_acceptance`, `(1 - tradition_vs_innovation)`, and a fixed age-proxy placeholder (`0.5`, pending demographics integration). Higher inertia damps all drift for that country.
- Country baselines (`CulturalEvolutionCountrySeed`) are derived once from each country's archetype record — GDP per capita, democracy index, WGI governance composite, and Fragile States Index score — via fixed linear blends, then held as the target each channel drifts toward.

**Ideology (per agent, `AgentIdeology`):**
- **Economic** axis: -1.0 (redistributive/left) to 1.0 (free-market/right)
- **Social** axis: -1.0 (progressive) to 1.0 (traditional)
- **Nationalist** axis: -1.0 (internationalist) to 1.0 (nationalist)
- **Conviction**: 0.0 (pragmatist) to 1.0 (ideologue, won't compromise)
- Agent ideologies are generated deterministically from a country's `CountryPoliticalContext` (economic/social/nationalist center + a diversity score) plus an institution-type modifier (e.g. central banks lean market-oriented, labor unions lean left/progressive, opposition parties flip the sign of the ruling country's center scaled by diversity), plus a deterministic per-agent hash-based variation.

## How It Affects Gameplay

**Player Levers:**
- No direct UI lever writes into cultural values or agent ideology positions in this pillar — both are derived state driven by upstream pressures (economic strain, social unrest, demographic pressure) and information/governance signals. Players act indirectly, by shaping the pressures and policies that these two systems read.
- Institution composition (which institution types exist, and their agents) determines the population of ideological positions in a country, since ideology is generated per institution type.

**Warning Indicators:**
- `other_acceptance` falling below a coded threshold is the trigger for a rising `IdeologicalPolarization` pressure delta (scaled by how far below the threshold it is, tightly capped per tick).
- `authority_acceptance` dropping more than `0.1` below its seeded baseline triggers a `LegitimacyCrisis` pressure delta from the same source.
- `violence_acceptance` above `0.5` combined with `trust_radius` below `0.3` triggers a `SocialUnrest` pressure delta.
- High cultural inertia (near `1.0`) means a country's values and social patterns will resist change even under sustained maximum pressure — the coded test asserts drift stays tightly bounded per tick even at full pressure on every input channel.

**Win/Loss Conditions:**
- Neither pillar directly gates a win/loss condition. Cultural Evolution and Ideology are background/positioning layers that feed pressures (`IdeologicalPolarization`, `SocialUnrest`, `LegitimacyCrisis`), which in turn cascade into the pressure network that does drive crisis thresholds elsewhere in the simulation.

## System Interactions

### Feeds Into
- **[Pressures](#)** — Cultural Evolution emits small, capped per-tick deltas to `IdeologicalPolarization` (low `other_acceptance`), `SocialUnrest` (high `violence_acceptance` + low `trust_radius`), and `LegitimacyCrisis` (large `authority_acceptance` drop from baseline). `IdeologicalPolarization` itself cascades onward into `PoliticalInstability`, `SocialUnrest`, `LegitimacyCrisis`, `ResourceScarcity`, and `TechnologicalDisruption`.
- **[Politics](#)** — Ideology compatibility scores (via `AgentIdeology::compatibility`) determine coalition formation and opposition alignment between agents; political movements are one of several other sources that also feed `IdeologicalPolarization` directly (sustained-movement deltas), independent of the cultural evolution pathway.

### Receives From
- **[Media / Information](#)** — `narrative_coherence` (from `InformationNarrativeSignals`) moderates cultural drift: a more coherent shared narrative stabilizes culture and slows change (adds up to `0.15` to the inertia factor).
- **[Politics / Governance](#)** — `rule_of_law_index` (from `GovernanceSignals`) shifts the pull on `tradition_vs_innovation` toward innovation when rule of law is above `0.5`, and dampens `violence_acceptance` drift.
- **[Pressures](#)** — Cultural Evolution reads `IdeologicalPolarization` (pulls `authority_acceptance` up — security-seeking), `EconomicStrain` (pulls `collectivism_vs_individualism` toward collectivism, lowers `risk_tolerance`), `SocialUnrest` (lowers `trust_radius`, raises `violence_acceptance`), and `DemographicPressure` (lowers `other_acceptance`).
- **[Institutions](#)** — Ideology generation reads institution type to apply per-type economic/social/nationalist/conviction modifiers (`institution_ideology_modifiers`), and treats `OppositionParty` as a special case that inverts the ruling country's political center scaled by its diversity score.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/culture.md)

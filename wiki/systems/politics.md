---
id: politics
title: Politics & Legitimacy
domain: Simulation
relatedSystems: [pressures, institutions, media]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Politics & Legitimacy

## Overview

The Politics pillar (`emergence/politics/`) tracks each government's legitimacy, turns economic and food stress into protest risk, and lets sustained unrest calcify into social movements. It runs on a daily cadence, consuming signals from Food and Economy (and, via legitimacy, Public Opinion's institutional-trust reading), and feeds a set of downstream political pressures that other systems — Institutions, Media, civil-conflict mechanics — read back from.

## What It Simulates

- **Legitimacy (`Legitimacy`)**: A per-country score in `[0.0, 1.0]` built from three weighted components — food security, economic/currency stress, and an institutional baseline — plus a public-trust modifier. `overall` is a weighted blend of `food`, `economic`, and an *effective institutional* term that itself blends the country's institutional baseline with the live public-trust signal (`effective_institutional = institutional * 0.5 + institutional_trust_modifier * 0.5`, then `overall = food * 0.4 + economic * 0.35 + effective_institutional * 0.25`) — food security carries the heaviest weight in the blend, economic stress second, institutional trust last.
- **Differentiated country baselines**: Every country starts from a hand-authored 2025 baseline (`Legitimacy::for_country`) rather than one global default. `types.rs` hard-codes distinct `(economic, food, institutional)` triples per country group: stable democracies (USA, DEU, GBR, JPN, KOR) start high across the board; performance-legitimacy autocracies (CHN, RUS, SAU) trade high economic/food scores for a depressed institutional term (no electoral mandate); emerging democracies (IND, BRA, TWN) sit mixed; fragile/stressed states (VEN, IRN) start low on all three; small open economies (NLD, SGP) start high; any country not explicitly listed falls back to a moderate default triple. From that baseline, legitimacy is recalculated every tick against live Food/Economy/Public-Opinion inputs — the baseline only seeds the institutional component and the starting point for economic/food before live signals overwrite them.
- **Protest probability**: `base_prob = (1.0 - legitimacy.overall)^2` — an inverse-quadratic curve, so the lower legitimacy falls, the faster protest probability rises (a country at 0.3 legitimacy generates a much higher base rate than the quadratic's shape would suggest at first glance). This base is then boosted additively by a small share of each active driver's severity score, and the sum is clamped to `[0.0, 1.0]`.
- **Protest drivers (`ProtestDriver`)**: A fixed enum of eight grievance channels (food insecurity, economic hardship, currency collapse, cost of living, corruption, election fraud, ethnic tension, environmental damage), each carrying a static weight (food insecurity weighted highest, ethnic tension/environmental damage lowest) intended for use in scoring. Only four are actually populated from live signals in the current tick logic: `FoodInsecurity` (when food security drops below a threshold), `EconomicHardship` and `CurrencyCollapse` (both from currency stress crossing separate, higher thresholds), and `CostOfLiving` (a derived blend of food security and currency stress). Corruption, election fraud, ethnic tension, and environmental damage are defined in the enum and carry weights, but nothing in the current tick logic sets their scores — they exist as forward-declared hooks, not live mechanics.
- **Driver scoring and Top-K**: Active drivers are collected into `(driver, score)` pairs, sorted descending by score, and truncated to a Top-K list (`PILLAR_EVENT_CAP`, shared across pillars) for both reporting (`top_drivers`) and as the additional multiplicative boost to protest probability.
- **Protest events (`ProtestEvent`)**: Each tick, a per-country/day-scoped RNG stream rolls against `protest_prob * 0.1` (i.e. only one-tenth of the computed probability is realized as an actual roll per tick). On success, a new event spawns using the single highest-scoring driver, with intensity randomized in roughly `[0.3, 0.8]` and duration randomized in roughly `[2, 9]` days. Expired protests (`start_day + duration_days <= current_day`) are pruned at the start of every tick.
- **Movements (`Movement`)**: Every successful protest spawn increments a per-country "unrest days" counter. Once that counter reaches 20 and the country doesn't already have a movement, a new movement is created — named `"{country} Reform Movement"`, inheriting the top current driver as its cause, with support randomized in roughly `[0.2, 0.5]`. At most one movement per country is tracked.
- **Elections**: Countries can have an election scheduled for a specific day (`schedule_election`); the tick simply reports whether an election is pending that day via `election_pending` — no vote outcome, incumbent-replacement, or legitimacy-reset logic exists yet.
- **Stability index**: `legitimacy.overall * 0.6 + (1.0 - protest_prob) * 0.4` — a composite blending legitimacy and inverted protest probability, used both as a reported signal and as an input to the pressure-generation thresholds described below.
- **Determinism**: All randomness is drawn from a `ScopedRng` scoped by pillar name, country, day, and purpose string (e.g. `"politics"`/country/day/`"protests"`), so identical seeds reproduce identical legitimacy, protest, and movement trajectories tick-for-tick.

## Elite Dynamics

There is no elite-actor model in this pillar — no factions, elite classes, coup mechanics, or elite-cohesion state are represented in `types.rs`. The `elite_fracture` pressure family exists in the broader Pressures system and is reachable from politics only indirectly: `SocialUnrest` is defined (in the pressures cascade graph) to cascade into `EliteFracture`, so sustained protest-driven unrest can eventually manifest as elite fracture elsewhere in the simulation, but the Politics pillar itself never writes to `EliteFracture` directly.

## How Political Stress Becomes Pressure

Each tick, `PoliticsPillar::collect_pressure_deltas` converts the signals above into deltas against four (of the pressure system's) political pressure types, gated by thresholds and capped per country per tick (`POLITICS_PRESSURE_CAP_PER_TICK`, scaled again by the scheduler's daily-tick multiplier):

- **`social_unrest`**: Two contributions. First, protest probability above a floor (~0.2) contributes proportionally. Second, the sum of active protest events' intensity in that country (capped at 1.0) contributes an additional, smaller share. So both the *risk* of protest and *actually ongoing* protests push this pressure independently.
- **`legitimacy_crisis`**: Triggered when `legitimacy.overall` drops below a floor (~0.5); the deficit below that floor scales the delta.
- **`political_instability`**: Requires *both* legitimacy and stability to be simultaneously below their floors (~0.4 each); the delta scales with the product of both deficits, so this only fires when the country is failing on both fronts at once, not either alone.
- **`military_tension`**: Same double-gated shape as instability (low stability *and* low legitimacy, both below ~0.4) but attributed to a different pressure family — modeling the idea that a state cornered on both legitimacy and stability may reach for military posturing, coup risk, or external distraction.
- **`ideological_polarization`**: Driven by formed movements — the sum of active movements' `support` in a country (capped at 1.0), above a small floor (~0.1), contributes proportionally. This is the only pressure channel fed by movements rather than by protests/legitimacy directly.

All specific thresholds, weights, and caps mentioned above are placeholders pending tuning — **(under active calibration — B5)**.

### Pressures Context

Politics writes directly into 4 of the wider Pressures system's 12 tracked pressure types — `social_unrest`, `legitimacy_crisis`, `political_instability`, and `military_tension` — plus `ideological_polarization` via movements, for 5 write channels total; `elite_fracture` is reached only indirectly, via cascade from `social_unrest`. Each pressure type in the store also has its own independent monthly decay rate distinct from anything in the Politics pillar itself — e.g. `social_unrest` sheds fastest while `legitimacy_crisis` and `elite_fracture` linger far longer (rates under active calibration — B5) — so a country can keep sliding toward crisis even if Politics stops actively pushing new deltas, simply because the pressure isn't shedding as fast as it's accumulating. Decay and cascade mechanics live entirely in the Pressures store, not in this pillar.

## Feedback Loop

The pillar's own doc comments describe the intended loop explicitly: Economy emits `economic_strain` → cascades (elsewhere in the pressure graph) into `social_unrest` / `political_instability` → Politics reads worsened economy/food signals, lowers legitimacy and raises protest probability → Politics emits `social_unrest` and `legitimacy_crisis` back into the pressure store → those cascade back toward `political_instability` (and, per the cascade graph, `elite_fracture`) → which can in turn depress economic activity again. Politics is a relay in this loop, not its origin: it only ever reads Food/Economy/Public-Opinion signals and writes pressure deltas: it does not read pressures directly.

## Verified Behavior

The pillar's test suite (`tests.rs`) locks in the following observable behaviors, useful for understanding what's actually guaranteed versus incidental:

- **Protest probability responds to legitimacy, not just noise**: a country with food security at 0.2 and currency stress at 0.9 (both severe) is asserted to produce a strictly positive protest probability — confirming the low-legitimacy → elevated-protest-risk path is live, not dormant.
- **Bad conditions strictly lower legitimacy relative to good conditions**: the same country compared under good (food security 0.9, currency stress 0.1) versus bad (food security 0.3, currency stress 0.8) inputs produces `legitimacy.overall` that is strictly lower in the bad case — a direct behavioral confirmation of the food/economy → legitimacy wiring, not just a static assertion on ranges.
- **Top-K driver lists never exceed the shared cap**: regardless of how many drivers are scored, `top_drivers` is asserted to never exceed `PILLAR_EVENT_CAP`.
- **All emitted signals stay within `[0.0, 1.0]`**: legitimacy, protest probability, and stability index are each asserted clamped, so downstream consumers can rely on bounded inputs.
- **Same seed, same outcome**: running two pillars from identical `MasterSeed` values over identical country/day/signal inputs produces identical legitimacy trajectories — the determinism guarantee is test-enforced, not just documented.
- Protest-event generation and movement formation are exercised over 10–30 simulated days but only asserted as non-negative counts (`>= 0`) — the tests confirm the mechanisms run without panicking under sustained bad conditions, not specific spawn/formation rates, since both are probabilistic.

## How It Affects Gameplay

**Player Levers:**
- Anything that improves food security or reduces currency/economic stress (Food and Economy pillar levers) indirectly raises legitimacy and suppresses protest probability, since those are the only two live signal inputs to legitimacy besides institutional trust.
- Institutional-trust-improving actions (via Public Opinion) raise the effective-institutional component of legitimacy, which is blended 50/50 with the country's static institutional baseline.
- Scheduling/monitoring elections is currently a signal-only lever (`election_pending`) — no election-driven legitimacy or leadership change exists yet to leverage strategically.

**Warning Indicators:**
- Legitimacy trending below ~0.5 and stability trending below ~0.4 together are the compound trigger for the pillar's most severe pressure emissions (`political_instability`, `military_tension`).
- A rising count or intensity of active protest events, tracked in `active_events`, is a direct, visible precursor to `social_unrest` growth even before legitimacy fully collapses.
- Twenty or more accumulated unrest-days in a country signals an impending movement formation, after which `ideological_polarization` gains a new, sustained contributor.

**Win/Loss Conditions:**
- Because `political_instability` and `military_tension` both require simultaneous legitimacy *and* stability collapse, a country that stays weak on only one axis avoids the pillar's worst-case pressure contributions — the double-gate is the de facto tipping point to watch for state-failure-adjacent trajectories.

## System Interactions

### Feeds Into
- **[Pressures](pressures.md)** — emits `social_unrest`, `legitimacy_crisis`, `political_instability`, `military_tension`, and `ideological_polarization` deltas every tick; these cascade further within the pressure graph (including onward to `elite_fracture`).
- **[Institutions](institutions.md)** — the module header documents `PoliticsSignals` as feeding the Institutions pillar downstream.
- **[Media](media.md)** — protest activity, movements, and legitimacy shifts are the kind of political-stress signal that media/information systems narrate and amplify (structural relation via the pressure graph and shared country signals, not a direct function call within this module).

### Receives From
- **Food** — `food_security` per country sets the `food` legitimacy component and is checked directly for the `FoodInsecurity` protest driver.
- **Economy** — `currency_stress` per country sets the (inverted) `economic` legitimacy component and drives the `EconomicHardship` and `CurrencyCollapse` protest drivers.
- **Public Opinion** — `institutional_trust(country)` supplies the `institutional_trust_modifier` that blends into legitimacy's effective institutional component.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/politics.md)

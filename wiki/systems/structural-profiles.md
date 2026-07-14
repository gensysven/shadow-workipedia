---
id: structural-profiles
title: Country Structural Profiles
domain: Simulation
relatedSystems: [pressures, population, cascades]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Country Structural Profiles

## Overview

Every country in Shadow Work carries a `StructuralProfile` — three multipliers (`exposure`, `sensitivity`, `adaptive_capacity`) derived once, deterministically, from World Bank demographic indicators. The profile answers a narrow question: given a country's population size and demographic shape, how much structural pressure does it generate, how exposed is it to contagion from other countries, and how fast does it recover? It replaces an earlier scheme where only 8 of 221 countries had a hand-authored modifier and the other 213 were structurally identical — this derivation makes every country at least a little different from every other, without inventing structure the data doesn't support.

## What It Simulates

The derivation (`derive_profiles` in `structural_profile.rs`) computes three z-scores per country from `DemographicsStore`, then maps them onto the three profile axes:

- **Scale (`scale_z`)** — log10 of population in millions, centered so a 10M-population country scores 0, ~0.1M scores −1, and ~1000M scores +1. Captures "bigger systems behave differently" independent of demographic composition.
- **Demographic stress (`stress_z`)** — an average of three World Bank indicators, each centered on a rough world-typical anchor: youth share (youth bulge above ~25%), population growth rate (above ~1.5%/yr), and unemployment rate (above ~8%). Rising values on any of these push stress upward; the three are averaged, not summed, so no single indicator dominates.
- **Coping structure (`capacity_z`)** — labor-force participation (above ~60%) and urbanization (above ~55%) push this up; elderly population share (above ~12%) pulls it down, treating an aging burden as a drag on coping capacity rather than a stress source in its own right.

Each z-score is clamped into a bounded range before use (stress and scale to [-1, 1], capacity to [-3, 3] before a final /3 normalization) so no single country's raw data can send a multiplier off the rails.

## Derivation Mechanics

### From z-scores to multipliers

The three z-scores combine into the profile's three axes with different weights and different signs, reflecting the module's stated rationale ("larger systems generate more complex pressure but buffer external contagion; demographic stress raises both generation and susceptibility; coping structure speeds recovery"):

- **`exposure`** (pressure generation multiplier) rises with demographic stress (the larger contributor) and, to a lesser degree, with population scale. A demographically stressed, large country generates more intrinsic pressure than a calm, small one.
- **`sensitivity`** (incoming cascade multiplier, receiving side) moves in the *opposite* direction from scale — larger systems are treated as more insulated from external contagion — while demographic stress still nudges it up. So scale cuts exposure's and sensitivity's dependencies in opposite directions: bigger countries generate somewhat more but absorb somewhat less external shock.
- **`adaptive_capacity`** (decay-rate multiplier) depends only on the coping-structure z-score: countries with strong labor participation and urbanization relative to their elderly burden recover pressure faster.

All specific weight values are under active calibration — B5; only the direction and relative magnitude (stress dominates exposure and sensitivity more than scale does; capacity is driven solely by the coping z-score) should be treated as stable.

### Clamping ranges

Each axis is clamped to a deliberately narrow band before being stored, so structure "modulates the calibrated feeds" rather than becoming a new dose knob:

- `exposure`: **0.75–1.35**
- `sensitivity`: **0.70–1.30**
- `adaptive_capacity`: **0.80–1.20**

These bounds are constants in the module (`EXPOSURE_RANGE`, `SENSITIVITY_RANGE`, `CAPACITY_RANGE`) and are asserted directly in tests — no country's derived profile can leave this range regardless of how extreme its underlying demographics are.

### Provenance and uncertainty

Every profile records `provenance` (a string tag identifying which inputs fed the derivation, e.g. `v1:demographics(pop,youth,elderly,growth,unemp,urban,lfp)`) and `uncertainty` (0.0 = fully data-driven). A country with no usable demographic data does not get an invented structure — it degrades to `StructuralProfile::neutral()`: all three multipliers at 1.0, `uncertainty: 1.0`, provenance tagged `imputed`. The derivation is pure and deterministic — identical inputs always produce identical profiles, and there is no RNG in the path — which the test suite enforces directly (`derivation_is_deterministic_and_data_driven`).

### The evolving axis: scarring and recovery

`adaptive_capacity` is the one axis that changes after derivation. Each simulated month, `update_scarring` checks how many pressure types a country holds at Crisis level or above. If a country holds **3 or more** pressures at Crisis simultaneously, its capacity erodes by a fixed per-month amount, floored at `CAPACITY_SCAR_FLOOR` (0.75) times its derived baseline — sustained multi-pressure crisis can roughly halve a country's recovery rate, but never zero it out. Below that threshold, capacity recovers back toward its derived `baseline_adaptive_capacity` at a smaller fixed per-month rate, capped at the baseline (recovery never overshoots). This capacity axis multiplies pressure *decay* only; it has no effect on cascade inflow, which is capacity-independent by design (verified in `capacity_multiplies_decay_only_not_cascades`).

## Known Limitation: Governance Indicators Are Present but Unused

`data/country-archetypes.json` carries a rich set of governance and fragility indicators per country — `fsi_score` (Fragile States Index), `wgi_composite` (Worldwide Governance Indicators), `democracy_index`, `press_freedom_score`, plus economic fields like `gdp_per_capita`, `hdi`, `gini`, `external_debt_to_gdp`, `resource_rents_pct`, and an `archetype` label (e.g. `semi_periphery`, `fragile`, `rentier`). **None of these feed the structural-profile derivation.** `derive_profiles` reads only from `DemographicsStore` (population, youth/elderly share, growth rate, unemployment, labor-force participation, urbanization) — it does not touch `country-archetypes.json` at all. A country with a high FSI score or a low democracy index gets no additional exposure, sensitivity, or reduced adaptive capacity from that fact under the current derivation; its profile is governed purely by World Bank demographic shape. This is a known gap under active review — not an oversight to route around, but a deliberate v1 scope boundary that a future derivation version may close.

## How It Affects Gameplay

**Player Levers:**
- Players cannot directly edit a country's structural profile — it is derived, not authored — but policies that shift demographics over time (labor participation, urbanization, unemployment) will shift the *next* derivation if profiles are ever re-derived from updated demographics.
- Players can indirectly protect `adaptive_capacity` by preventing a country from sustaining 3+ simultaneous Crisis-level pressures, since that is the only in-run event that changes a profile after initial derivation.

**Warning Indicators:**
- A country sitting near the top of the `exposure` range (close to 1.35) is a demographically stressed and/or large system generating outsized intrinsic pressure — watch it as a source, not just a recipient, of instability.
- A country near the bottom of the `adaptive_capacity` range, or trending toward its `CAPACITY_SCAR_FLOOR`, is losing its ability to shed pressure — multi-pressure Crisis stacking is the leading indicator.

**Win/Loss Conditions:**
- Structural profiles don't define win/loss thresholds themselves; they modulate how fast pressures identified elsewhere (see [Pressures](#)) build and decay, and how strongly cascades from other countries land (see [Cascades](#)).

## System Interactions

### Feeds Into
- **[Pressures](#)** — `exposure` multiplies intrinsic pressure generation; `adaptive_capacity` multiplies pressure decay every tick.
- **[Cascades](#)** — `sensitivity` multiplies how strongly incoming cross-country cascade contagion lands on the receiving country.

### Receives From
- **[Population](#)** — `DemographicsStore` (population, youth/elderly share, growth rate, unemployment, urbanization, labor-force participation) is the sole input to the derivation.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/structural-profiles.md)

---
id: pressures
title: Pressure Systems
domain: Simulation
relatedSystems: [cascades, shocks-and-forcing, issues-detection, jackpot]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Pressure Systems

## Overview

Pressures are the simulation's core stress state: for every country, thirteen numeric values (0.0–1.0) track how strained different aspects of that country's economy, society, and institutions are. Pressures rise from world events, agent actions, cross-country contagion, and their own slow structural drift, and they decay naturally over time. When a pressure sits high for long enough, it becomes the raw material the issue-detection system uses to spawn concrete, named crises. Pressures are the substrate; issues are what grows out of them.

## What It Simulates

- **Thirteen pressure families**: each represents a different axis of national stress, from economic strain to military tension. Every family is wired to a handful of others, so a spike in one area doesn't stay contained — it leaks into related domains.
- **Per-country accumulation**: every country tracks its own independent set of thirteen values, plus bookkeeping like peak-ever levels, months since the family was last in crisis, and a running log of what caused recent changes.
- **Decay vs. growth**: pressures don't just accumulate — they also relax over time. Whether a pressure trends up or down in any given month is the net of intrinsic growth, external inflows (shocks, forcing, cascades), and decay.
- **Country modifiers**: no two countries experience the same inputs the same way. A country's underlying structural profile (derived from demographics) shifts how much pressure it generates internally and how fast it can recover.

## The Thirteen Pressure Families

Defined in `PressureType` (`emergence/pressures/types.rs`), in canonical order:

1. **Economic Strain** — GDP decline, unemployment, inflation.
2. **Social Unrest** — civil unrest, protests, strikes.
3. **Political Instability** — government instability, policy gridlock.
4. **Demographic Pressure** — population aging, migration, urbanization stress.
5. **Resource Scarcity** — oil, gas, and mineral shortages.
6. **Technological Disruption** — automation displacement and related disruption.
7. **Legitimacy Crisis** — loss of government/institutional trust.
8. **Elite Fracture** — ruling-class divisions, succession crises.
9. **Environmental Stress** — climate events, pollution, disasters.
10. **Ideological Polarization** — political polarization, foreign influence.
11. **Imperial Overstretch** — military overextension, occupation costs.
12. **Military Tension** — arms races, border incidents, war risk.
13. **Compute Supply Stress** — semiconductor supply chain stress: fab concentration, export controls, chip scarcity.

A code comment notes this family list connects each pressure to 2–4 others; a test enforces that every family feeds into at least two more (see Cascades, below). The in-repo `AGENTS.md` documentation for this module is stale — it still describes 12 families and omits Compute Supply Stress, which the code and its own tests confirm is the 13th.

## Per-Country Pressure State

Each country's pressure state (`CountryPressures`) holds, per family:

- **Observed value** — the 0.0–1.0 number every other system reads (cascades, issue detection, UI, chronicle logging).
- **Peak** — the highest observed value the country has ever reached for that family.
- **Months since crisis** — how long it's been since the family last sat at Crisis level or above; this resets to zero whenever the family is in Crisis or Catastrophe.
- **Attribution** — a per-source ledger of how much each contributor (decay, a named cascade, an external shock, "intrinsic" drift, a named forcing curve, cross-country contagion, etc.) has added or removed this tick. This is cleared and rebuilt every tick and exists for debugging/tracing, not for gameplay logic.

Two different underlying representations exist beneath the single observed value, and which one applies depends on the family:

**Most families ("non-spine")** use a straightforward latent-total model: pressure mass can be pushed above the 1.0 observation ceiling and it isn't discarded — it's retained as "latent excess" (bounded by a cap) so that a country driven far past saturation doesn't look instantly recovered the moment inflows stop. The observed value stays pinned at 1.0 until the hidden excess drains away. This produces a hysteresis effect: overshoot leaves a lingering scar even after the visible number caps out.

**Three "spine" families — Economic Strain, Social Unrest, and Legitimacy Crisis** — use a different, load-over-capacity model instead. Each carries a "load" (accumulated strain) and a "capacity" (how much strain the country can currently absorb); the observed value is computed as load divided by (load + capacity), which approaches 1.0 asymptotically but mathematically never clamps. Load is shed each tick at a rate proportional to the country's structural adaptive capacity; capacity itself is not fixed — it erodes ("wears") when the observed pressure sits above a strain floor, and slowly regenerates during calm periods, bounded within a fixed range. This gives these three families persistent, scarring memory: a country that has been under sustained strain becomes structurally worse at recovering from strain, and that scar only heals slowly.

## Level Thresholds

`PressureLevel` maps a pressure's numeric value into four bands: **Normal**, **Warning**, **Crisis**, and **Catastrophe**, with boundaries rising through the 0–1 range (Normal at the low end, Catastrophe as the top band) (under active calibration — B5). Level is a pure function of the current observed value — it's recomputed from scratch each time it's queried, not tracked as separate state.

Each level also carries a "cascade multiplier": a scaling factor applied when a pressure at that level pushes strain into other families. The multiplier increases monotonically with level, so a pressure sitting in Catastrophe cascades much harder than the same pressure sitting in Warning (under active calibration — B5).

## Decay vs. Intrinsic Growth

**Decay** happens every tick for every family. It is progressive/quadratic rather than a flat percentage: the reduction is the current value times a per-family decay rate, plus a smaller term proportional to the square of the current value. At low pressure the decay is gentle (nearly linear); at high pressure the quadratic term dominates, so decay accelerates the closer a pressure gets to full saturation. This acts as a soft ceiling — amplification effects (cascades, shocks) find it progressively harder to push a pressure all the way to the top because decay fights back harder there. Decay rates differ by family — some families ("fast decay") relax quickly, others ("slow decay," described in the source as debt/deficit-like structural problems) are much stickier — but this document intentionally does not state the exact per-family rates (under active calibration — B5). For the three spine families, decay is replaced entirely by the load-shedding/capacity-wear dynamic described above; the general decay-rate table simply does not apply to them.

**Intrinsic growth** is a separate, smaller mechanism (implemented outside the pressures module proper, in the state-tick layer) that adds a small baseline drift to roughly ten of the thirteen families every day, representing the idea that certain pressures build up from systemic factors even with no shocks or player action at all. Growth for Economic Strain in particular is headroom-gated: its intrinsic growth shrinks as the value approaches an internal structural ceiling, so unconditional drift alone cannot push it into deep crisis — getting there requires cascades, shocks, or scenario forcing on top. Every other intrinsically-growing family currently applies unconditionally. A per-country-per-month random variation factor is layered on top of the base rate so that growth isn't perfectly uniform across the world or across time. The code notes explicitly that century-scale escalation is intended to come from externally-anchored scenario "forcing" curves, not from intrinsic drift alone — intrinsic growth is calibrated to produce slow, bounded drift, not runaway crisis on its own.

## Country Modifiers

Two independent mechanisms scale how a given country experiences pressure inflows:

- **Structural profile** (derived per-country from demographics, not hand-authored): an "exposure" multiplier scales how much intrinsic pressure a country generates, a "sensitivity" multiplier scales how hard incoming cross-country contagion lands, and an "adaptive capacity" multiplier scales how fast the country's decay/shedding runs. Adaptive capacity is explicitly the one axis that evolves over time — sustained multi-pressure crisis erodes it (a country holding several families at Crisis level simultaneously has its capacity scarred down toward a floor), while calm periods slowly rebuild it back toward a derived baseline. This means a country that has been through repeated crises becomes structurally slower to recover, independent of any single pressure's own value.
- **Explicit config override**: a country can additionally carry a named modifier in configuration that multiplies on top of the derived structural exposure. By default this override table is empty for every country — the derived structural profile is what actually varies country-to-country out of the box.

Only the decay/shedding side of the system is scaled by adaptive capacity; cascade propagation amounts are not adjusted by the sending country's capacity (though, see below, cascades are still mediated by the *receiving* pressure's headroom).

## Capacity Mediation

Nearly every pathway that pushes pressure into a country — cascades between families within a country, cross-country contagion between neighbors, external pressure injected by other simulation systems, and scenario forcing curves — is "capacity-mediated": the amount that actually lands is scaled by how much headroom the target still has (roughly, one minus its current observed value). This means pressure inflows taper off as a target approaches saturation rather than piling on indefinitely; relief (negative/reducing amounts) is generally applied without this mediation. The source code frames this consistently as an anti-"pile-on" design choice — without it, already-saturated pressures could still absorb unlimited additional inflow with no visible effect until they suddenly cascade, which produced runaway synchronized collapses in earlier tuning passes.

## Cascades

Within a country, each pressure family is wired to "feed into" several others — for example Economic Strain feeds into Social Unrest, Political Instability, and several more families; every family feeds into at least two others by design (enforced by a test). Cascades only fire once a source pressure crosses a threshold band (Warning); only the portion of the value above that threshold cascades, scaled by the source's level-based cascade multiplier and by the receiving family's remaining headroom. Cascades are tracked with per-source attribution so their contribution is visible in the same ledger as decay, shocks, and growth.

A second, cross-country cascade mechanism propagates a country's own excess pressure (above the Crisis threshold) to a fixed set of "neighbor" countries — not strictly geographic, but representing trade, alliance, and regional-influence ties (defined in a static neighbor map covering a handful of major countries). The excess is split into a total outbound "budget" shared evenly across however many neighbors a country has, so a highly-connected country doesn't export a disproportionate amount of total pressure just because it has more neighbors. What each neighbor actually receives is then further scaled by that neighbor's own structural sensitivity and by its remaining headroom in the target family.

## How It Affects Gameplay

**Player Levers:**
- Nothing in this module itself exposes direct pressure-reduction actions to the player — pressures are read and written by other systems (agents, policies, shocks, issues). This module is the ledger and the physics, not the interface.
- Because capacity mediation and decay both work against already-high pressures, sustained relief (from whatever external system applies it) compounds — bringing a pressure down even partway restores headroom that makes further inflows land harder and decay bite faster.

**Warning Indicators:**
- The Normal/Warning/Crisis/Catastrophe level for any family is the primary at-a-glance signal; crossing into Crisis resets that family's "months since crisis" counter and is what other systems (like structural scarring) key off.
- Attribution entries reveal exactly which source (a named cascade, "intrinsic" drift, a shock, a forcing curve, cross-country contagion, or decay) is driving a given family's recent change — useful for tracing why a country is destabilizing.
- A country holding several families at Crisis level simultaneously is a distinct warning sign beyond any single pressure: it actively scars that country's adaptive capacity, making future recovery slower even after the individual pressures subside.

**Win/Loss Conditions:**
- This module does not itself define win/loss conditions; it only maintains pressure state. Crisis/Catastrophe-level pressures are the raw signal that the issues-detection system consumes to spawn the concrete crises that do carry consequences.

## System Interactions

### Feeds Into
- **[Issues Detection](#)** - sustained high pressure levels (Crisis/Catastrophe) are the trigger condition issue detection watches for when spawning concrete issues.
- **[Cascades](#)** - within-country and cross-country cascade propagation is implemented as part of this system, reading pressure levels to decide what leaks where.
- **[Jackpot](#)** - simultaneous multi-family crisis conditions (and the resulting structural scarring) feed the broader emergent "everything collapses at once" dynamics this system is designed to guard against via capacity mediation and thresholding.

### Receives From
- **[Shocks and Forcing](#)** - external shock events and scenario-forcing curves inject pressure directly into named families, capacity-mediated and attributed like any other source.
- **Agents and Policies** (outside this module) - agent actions and policy effects add or reduce pressure through the same attributed, capacity-mediated interface used by every other external source.
- **Structural/demographic systems** - a country's derived structural profile (exposure, sensitivity, adaptive capacity) is computed from demographic data and modulates how this country's pressures behave, without living inside the pressures module itself.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/pressures.md)

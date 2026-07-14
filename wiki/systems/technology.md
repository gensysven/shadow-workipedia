---
id: technology
title: Technology & Compute
domain: Simulation
relatedSystems: [economy, pressures, shocks-and-forcing]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Technology & Compute

## Overview

The simulation does not model "technology" as a single dial. It models **compute infrastructure** — a semiconductor-supply-chain simulation (`ComputePillar`) that derives per-country AI, military, and economic compute capability from fabs, GPUs, and export controls — and a separate **`TechnologicalDisruption` pressure** that represents the social/economic disruption side of technological change (automation, R&D shocks, brain drain) inside the 13-pressure cascade graph. A scenario-level **tech-acceleration forcing curve** can additionally inject an externally-anchored disruption trend independent of the compute model. These three pieces are only loosely coupled today.

## What It Simulates

- **Semiconductor supply chain (`ComputePillar`, daily cadence)**: Named corporations (TSMC, Samsung Foundry, Intel, ASML, Nvidia, SMIC, Tokyo Electron, an OSAT composite) hold facilities and equipment inventories. A directed `SupplyChainGraph` moves goods (`EuvEquipment`, `FabEquipment`, `LeadingChips`/`AdvancedChips`/`MatureChips`/`LegacyChips`, `OsatServices`, `SiliconWafers`, `ChipDesigns`) between countries, gated bilaterally by an `ExportControlGraph` (`Unrestricted` / `Licensed` / `Denied`). Per-country state tracks fab capacity by `NodeTier` (Leading/Advanced/Mature/Legacy), GPU stockpile with depreciation, a three-way GPU allocation (military / civilian AI / scientific), data-center capacity (GW), chip-design index, and OSAT (packaging/testing) throughput. The pillar seeds a 2025 real-world baseline (e.g. TWN ~92% leading-node fab share, USA export controls denying leading chips and EUV equipment to CHN/RUS) and evolves it via fab construction completions and GPU depreciation each tick.
- **Derived compute signals**: Each tick, `ComputePillar` computes a country's *chip access* (share of incoming supply-chain flow not blocked by export controls, plus domestic fab capacity, normalized 0–1) and from it three output signals — `ai_capability_index`, `military_compute_pct`, `economic_compute_index` — consumed by downstream pillars/pressures.
- **`TechnologicalDisruption` pressure**: One of the 13 pressures in the core cascade graph (`PressureType::TechnologicalDisruption`, short id `tech_disruption`). It represents automation displacement, R&D/VC disruption, brain drain, and related shocks, and both feeds and is fed by most of the other pressures.
- **Tech-acceleration forcing curve**: An externally-anchored, scenario-selectable additive input to `tech_disruption`, separate from both the compute model and the organic cascade — see below.

## Compute/AI Capability Modeling (as coded)

`ComputePillar::tick()` runs in three phases per country per tick:

1. **State update** — complete any fab-construction projects whose `completion_tick` has arrived (added capacity moves from `fab_under_construction` into `fab_capacity` by node tier), then apply GPU depreciation (`gpu_stockpile *= 1.0 - gpu_depreciation_rate`).
2. **Supply chain sync** — recompute each `SupplyChainEdge.blocked` flag from the current `ExportControlGraph` (an edge is blocked only if the tier is `Denied`; `Licensed` does not block flow in this calculation).
3. **Signal calculation**, per country:
   - `chip_access` = (sum of unblocked incoming edge flow fractions + domestic fab capacity) / (sum of all incoming edge flow fractions + domestic fab capacity), clamped 0–1; defaults to 0.5 if a country has no supply-chain data at all.
   - `ai_capability_index` = weighted sum of chip-design index, chip access, and GPU stockpile × civilian-AI allocation share (weights: design 0.3, access 0.3, GPU 0.4), then **growth-rate capped**: it cannot rise or fall by more than `AI_CAPABILITY_MAX_MONTHLY_GROWTH` per month relative to the previous tick's value, specifically to prevent runaway compounding once a future TechnologyPillar closes the feedback loop back into compute.
   - `military_compute_pct` = GPU stockpile × military allocation share, clamped 0–1.
   - `economic_compute_index` = weighted sum of normalized data-center capacity, chip access, and OSAT capacity (weights 0.4 / 0.3 / 0.3), clamped 0–1.

The pillar also emits pressure deltas via `collect_pressure_deltas()`, separate from the signal outputs:
- **`ComputeSupplyStress`**: proportional to (normalized data-center demand − chip access), i.e. countries whose compute appetite outstrips their supply-chain access accrue stress; capped per tick.
- **`EconomicStrain`** (export-control self-harm): a country that itself imposes `Denied`-tier export controls pays a small per-tick `EconomicStrain` cost proportional to its number of active denial rules.

As of this writing there is no standalone "TechnologyPillar" consuming these signals yet — the doc comments in the compute module explicitly flag `ai_capability_index` as consumed by `TechnologicalDisruption` pressure "initially" and by a `TechnologyPillar` "when built."

## TechnologicalDisruption Pressure and Its Cascade Role

`TechnologicalDisruption` is one of 13 `PressureType` variants tracked per country. Per the pressure graph (`feeds_into()`):

- **Feeds into**: `EconomicStrain`, `DemographicPressure`, `IdeologicalPolarization` (social media/AI misinformation, filter bubbles), `MilitaryTension` (arms races, cyber weapons, autonomous warfare), `LegitimacyCrisis` (deepfakes, algorithmic governance erosion), `EnvironmentalStress` (e-waste, energy demand, industrial pollution).
- **Fed by**: nearly every other pressure feeds disruption back in, each with a distinct causal story in the code comments — `EconomicStrain` (VC dries up, R&D budgets slashed, brain drain), `SocialUnrest` (infrastructure destruction, talent flight), `PoliticalInstability` (brain drain, regulatory chaos), `DemographicPressure` (workforce shortages slow innovation), `LegitimacyCrisis` (institutional collapse disrupts R&D/education/regulation), `EnvironmentalStress` (climate forces green-tech disruption cycles), `IdeologicalPolarization` (anti-science movements, tech regulation gridlock), `MilitaryTension` (sanctions, export controls, supply-chain weaponization), and `ComputeSupplyStress` (the compute pillar's own supply-chain stress signal cascades directly into `TechnologicalDisruption`, alongside `EconomicStrain` and `MilitaryTension`).
- **Decay**: `TechnologicalDisruption` decays at a slow, structural rate per month (under active calibration — B5), consistent with the other "structural pressure" family (demographic pressure, elite fracture, ideological polarization, imperial overstretch) rather than the "fast decay" family (social unrest, military tension) or the "spine" family (economic strain, legitimacy crisis) that instead sheds via stocks.
- **Cascade strength** scales with the source pressure's severity band (Normal/Warning/Crisis/Catastrophe), each band applying a progressively larger cascade multiplier — so a country already in a `TechnologicalDisruption` crisis or catastrophe band pushes harder into `EconomicStrain`, `MilitaryTension`, etc. than one in the normal band.
- Policy actions can also move `TechnologicalDisruption` directly (magnitude and duration under active calibration — B5), and automation-displacement/technology-gap issue types map onto this same pressure.

## The Tech-Acceleration Forcing Curve

Separate from both the compute pillar and the organic cascade, the simulation supports scenario-level **forcing curves** — externally-anchored, monthly additive inputs to a named pressure that ramp linearly from a start month over a configured ramp length, then hold at a peak value. Forcing curves are empty by default (a "null block" arm for paired-scenario comparison) and are selected explicitly per process via an environment variable, making them part of scenario identity rather than hidden seed noise.

The named default scenario set includes a `"tech-acceleration"` curve targeting `tech_disruption`, alongside sibling curves for climate stress, resource tightening, and a demographic wave — all four represent externally-anchored real-world trajectory shapes (under active calibration — B5) rather than emergent outputs of the simulation itself. When active, the curve's magnitude is applied daily as an attributed external feed (`forcing:tech-acceleration`), and — like all external feeds — it is **capacity-mediated**: the amount added to a country's `TechnologicalDisruption` pressure shrinks as that pressure approaches its 0–1 ceiling, rather than adding a flat amount regardless of current level.

## System Interactions

### Feeds Into
- **[Economy](#)** — `economic_compute_index` and `military_compute_pct` signals; `TechnologicalDisruption` cascades into `EconomicStrain`; export-control self-harm cost also lands on `EconomicStrain`.
- **[Pressures](#)** — `TechnologicalDisruption` cascades into `IdeologicalPolarization`, `MilitaryTension`, `LegitimacyCrisis`, `EnvironmentalStress`, and `DemographicPressure`.
- **[Shocks & Forcing](#)** — the tech-acceleration forcing curve is one of the named century-scale forcing curves alongside climate, resource, and demographic ramps.

### Receives From
- **[Economy](#)** — economic conditions (via `EconomicStrain`) feed back into `TechnologicalDisruption` (VC/R&D disruption, brain drain).
- **[Pressures](#)** — nearly every other pressure type (`SocialUnrest`, `PoliticalInstability`, `DemographicPressure`, `LegitimacyCrisis`, `EnvironmentalStress`, `IdeologicalPolarization`, `MilitaryTension`) feeds into `TechnologicalDisruption`; `ComputeSupplyStress` from the compute pillar itself feeds back in directly.
- **[Shocks & Forcing](#)** — the tech-acceleration curve injects an externally-anchored trend independent of organic cascade dynamics.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/technology.md)

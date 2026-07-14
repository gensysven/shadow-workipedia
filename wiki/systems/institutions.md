---
id: institutions
title: Institutions & Governance
domain: Simulation
relatedSystems: [politics, pressures, agents]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Institutions & Governance

## Overview

The Institutions system models the formal power centers inside each country — central banks, treasuries, executives, corporations, unions, energy companies, and ruling/opposition parties — as entities with their own budgets, effectiveness, and legitimacy. The companion Governance module tracks the regulatory substrate underneath them (rule of law, rights protection, court independence, enforcement capacity) that determines how much state capacity is available to make any of it matter. Together they translate abstract political pressure into concrete institutional health, leadership turnover, and mandate shifts.

## What It Simulates

- **Institution types and budgets**: Each country gets exactly one instance of 8 institution types (`InstitutionType::ALL`): Central Bank, Treasury, Executive, Corporation, Labor Union, Energy Company, Ruling Party, Opposition Party. Each type carries a **budget fraction** of monthly GDP — conceptually a government/economic-actor split (central bank and party budgets are small operational slices; treasury and corporations claim the largest shares). Exact fractions are under active calibration — B5.
- **Country overrides**: `InstitutionConfig` supports per-country budget overrides layered on top of type defaults — `get_budget()` checks `country_overrides[country_id][type_id]` first and falls back to `default_budgets[type_id]` only if no override exists. This lets specific countries diverge from the global institutional-budget template.
- **Effectiveness and legitimacy**: Every `Institution` carries `effectiveness` and `legitimacy` scores (0.0–1.0), both seeded at a starting value on creation. These combine with security conditions to produce an institution's **health**.
- **Governance capacity**: The Governance shim tracks six regulatory channels per country — rule of law, rights protection, constitutional constraints, court independence, enforcement capacity, and treaty compliance — plus a derived **state capacity** composite that multiplies policy-output effectiveness economy-wide.
- **Leadership and mandate change**: Institutions periodically check whether accumulated political pressure is severe enough to trigger a leadership change or a shift in institutional mandate (expand/contract/refocus).
- **Per-institution identity**: each `Institution` has a stable ID of the form `{country_id}-{institution_type.short_id()}` (e.g. `usa-central_bank`), a `controlled` flag for player-controlled institutions, and a `cooldown_months` field gating how often actions are available on it.

## How Pressure Becomes Institutional Health

The Institutions pillar (`InstitutionsPillar::tick`) is the executor that runs this logic once per country per tick, iterating institutions in O(N+E) time (N institutions, E upstream events from the Politics pillar). It is event-driven — it runs off political pressure changes rather than a fixed daily cadence — and returns an `InstitutionsSignals` bundle (health, leadership pressure, mandate-pending flags, and aggregate country capacity) consumed by downstream systems.

For each country, the pillar reads upstream `PoliticsSignals` (legitimacy, protest probability, stability index) and `InternalSecuritySignals` (repression, corruption). For every institution in that country:

- **Health** = `effectiveness * 0.5 + legitimacy * 0.5 − security_health_penalty`, clamped to [0, 1], where `security_health_penalty = repression * 0.15 + corruption * 0.15`. High repression and corruption directly erode institutional health regardless of the institution's own effectiveness/legitimacy scores.
- **Leadership pressure** = `protest_probability * 0.4 + (1 − legitimacy) * 0.3 + (1 − stability) * 0.3`. This blends unrest, illegitimacy, and instability into a single per-institution pressure score.
- **Country capacity** is the mean institution health across all institutions in the country — the aggregate signal downstream systems consume as "how functional is this country's institutional layer."

**Leadership changes** are checked on a monthly cadence per institution (at least 30 days since the last check). If leadership pressure exceeds 0.6, there is a `leadership_pressure * 0.3` chance of a leadership change (reason: `PoliticalPressure`), recorded with the triggering day.

**Mandate shifts** are flagged as pending whenever leadership pressure exceeds 0.7. When pending, there is a 10% chance per check of an actual mandate change, and the direction depends on national stability: below 0.3 stability produces `Contract`, above 0.7 produces `Expand`, otherwise `Refocus`.

## Governance: The Regulatory Substrate

The Governance shim runs daily, after the Politics pillar, and provides the minimum regulatory surface other systems (information/narrative, intelligence) need to operate against. Per country, it maintains six channels seeded from country archetype records (World Bank Governance Indicators, democracy index, Fragile States Index, resource rents, GDP per capita) and lets them drift:

- **Degradation pressure** = `(1 − legitimacy) * 0.5 + (1 − stability) * 0.5`, read from upstream `PoliticsSignals` each tick.
- Each channel drifts toward a target of `baseline * (1 − degradation * MAX_DEGRADATION_FACTOR)`. When the current value is above target, it degrades; when below, it recovers.
- **Build/destroy asymmetry**: degradation moves at `DEGRADATION_RATE`, recovery at `RECOVERY_RATE` — recovery is deliberately much slower than decay, so governance quality is easy to lose and slow to rebuild. Exact rate constants are under active calibration — B5.
- **State capacity** is a derived composite (`enforcement_capacity * 0.5 + rule_of_law * 0.3 + court_independence * 0.2`) that itself drifts toward its target with the same asymmetric degrade/recover behavior (degradation capped 5× faster than recovery in the state-capacity channel specifically). This value multiplies all policy-output effectiveness downstream and is cached back onto the `InstitutionStore` after each governance tick.
- Two derived helpers expose composite signals to consumers: `accountability_strength` (`rule_of_law × court_independence × enforcement_capacity`, used by the Intelligence domain to gauge exposure consequences) and `censorship_feasibility` (`1 − constitutional_constraints × rights_protection`, used by the Information/Narrative domain).

## Institutional Capacity and Budget Multipliers

`InstitutionStore` caches a **budget multiplier** per institution, recomputed whenever budgets change: `(1 + ln(budget_in_billions.max(0.1)) * 0.5)`, clamped to [0.3, 3.0]. This normalizes an institution's raw monthly budget (in millions USD, derived from `monthly_gdp * budget_fraction`) into a multiplier centered around a $1B/month reference point, consumed elsewhere as an effectiveness scalar. The store also caches `state_capacity` per country, populated from the Governance pillar's tick output, with a fallback of 1.0 (full effectiveness) if governance hasn't populated it yet.

## Decay and Feedback Into Pressure

Both pillars feed the shared pressure system rather than decaying in isolation:

- **EliteFracture**: emitted when a country's average leadership pressure (across institutions whose IDs share that country's prefix) exceeds 0.5; the delta scales with `(avg_pressure − 0.5)`.
- **LegitimacyCrisis**: emitted two ways — from Institutions, when aggregate country capacity drops below 0.5 (delta scales with the shortfall); from Governance, when rule-of-law has degraded more than 0.1 below its seeded baseline (delta scales with the degradation amount).
- **ImperialOverstretch**: emitted when one or more mandate expansions have occurred for a country while its capacity is still below 0.6 — institutions trying to do more with less overextends the state, and the delta scales with both the capacity shortfall and the count of recent expansions.

All three pressure types are capped per tick (`PRESSURE_CAP_PER_TICK` for institutions, a separate governance-side cap for its own LegitimacyCrisis contribution) to prevent cascade overload — exact cap values are under active calibration — B5.

## System Interactions

### Feeds Into
- **[Pressures](#)** — EliteFracture, LegitimacyCrisis, and ImperialOverstretch deltas computed from institutional health, leadership pressure, and mandate expansions.
- **[Politics](#)** — country institutional capacity and governance state capacity inform downstream political legitimacy and stability calculations.
- **[Agents](#)** — budget multipliers and institutional control state shape what agent actions are effective/available.

### Receives From
- **[Politics](#)** — legitimacy, stability index, and protest probability drive institutional health, leadership pressure, and governance degradation.
- **Internal Security** — repression and corruption signals degrade institutional health directly via the security health penalty.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/institutions.md)

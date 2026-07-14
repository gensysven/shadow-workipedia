---
id: politics-policy
title: Policy
domain: Simulation
relatedSystems: [politics, institutions, agents]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Policy

## Overview

The Policy system is the mechanism by which pressures on a country are answered — either by the player directly, or by autonomous agents acting on standing player-set stances. It has two coupled layers implemented as separate Rust modules: `emergence/policies/` (the 32 concrete `PolicyType` instruments, their pressure and economic effects, and the `PolicyStore` that tracks what's been applied) and `emergence/policy_mode/` (the higher-level stance/card/auto-deploy layer that decides *which* policies get applied, by whom, and how).

## What It Simulates

- **Policy instruments (`PolicyType`)**: 32 enumerated policies (31 concrete + `DoNothing`) grouped into 6 `PolicyCategory` values — Economic, Social, Political, Resource, Technology, Security. Each policy carries a fixed `cost()` (fraction of GDP, `AusterityMeasures` is the one negative-cost/savings policy) and a fixed set of `PressureEffect`s.
- **Issue-gated availability**: `PolicyType::available_for_issue(IssueType)` maps each of the 19 `IssueType` variants to a curated subset of policies (typically 4-5) that are contextually valid responses. Every issue type's list always includes `DoNothing`.
- **Policy stances (`PolicyStance`) and domains (`PolicyDomain`)**: a second, coarser-grained layer of 5 `PolicyDomain`s (Energy, Labor, Governance, Technology, Security) crossed with 15 `PolicyStance` values (e.g. Stabilize/Liberalize/Nationalize/Extract for Energy; Protect/Deregulate/Mediate for Labor). Each domain accepts only its own valid stance subset, enforced by `PolicyStance::for_domain`.
- **Stance → PolicyType filter table**: `policies_for_stance(domain, stance)` maps each valid (domain, stance) pair to 2-3 concrete `PolicyType`s whose effects apply at an ambient rate while the stance is active. The mapping is exhaustively enumerated (no wildcard arm), so the compiler forces a decision for every new domain/stance addition. Several `PolicyType`s (FiscalStimulus, AusterityMeasures, Bailout, DebtRestructuring, ImmigrationExpansion, ImmigrationRestriction, RenewableInvestment) have no stance home yet and are reachable only through direct issue-card responses, not through the stance/auto-deploy path.
- **Worldview axes**: player stance choices are folded into a `WorldviewProfile` across 5 axes (Collective↔Market, Precaution↔Transformation, Universalism↔Particularism, Continuity↔Disruption, Legibility↔Opacity) via an exponential moving average (`record_choice`). Each `PolicyStance` has a fixed position on all 5 axes (`stance_axis_position`). The profile only "has signal" after a minimum number of choices and is used to mark worldview-aligned card options, not to gate anything mechanically.

## How It Affects Gameplay

**Player Levers:**
- Respond to policy cards (`CardGenerator`/`CardData`) generated from emerged issues — each card offers 2-4 `CardOption`s tied to a `PolicyStance` for the issue's domain; picking one writes a `PolicyDirective` into the `StanceStore` for that country+domain.
- Set/replace a domain's active stance per country at any time via a directive; `StanceStore::apply_directive` validates the stance is legal for the domain and records `set_at_month` and the triggering issue for audit.
- Toggle automation granularity per stance slot via `AutoToggles` (four independent booleans: agent, method, posture, budget — all default Auto). Flipping any one to Manual causes future auto-deploy cycles for that stance to pause and surface a `ManualDeployPrompt` instead of deploying automatically.
- Apply a concrete `PolicyType` directly to a country through `PolicyStore::apply_policy`, independent of the stance/card layer, producing immediate pressure effects plus a queue of delayed `PendingEffect`s.

**Warning Indicators:**
- `PolicyOption.backfire_risk` (currently a flat placeholder, see effects.rs) and `backfire_effects` represent the chance a chosen policy makes things worse — not yet differentiated per policy (under active calibration — B5).
- Delayed effects (`PendingEffect`, `delay_months`) mean a policy's true cost or benefit can surface months after being applied — the store processes them by `apply_month` each tick.
- `StanceStore::total_monthly_cost()` sums `base_cost()` across all active stances; the `CardGenerator` tracks consecutive overspend weeks and raises a resource-pressure card once a threshold is crossed.
- Cards that go unanswered escalate (cost increases, options narrow) after a minimum age, and `CardGenerator` autopauses the simulation when a manual auto-deploy prompt is pending.

**Win/Loss Conditions:**
- Policy effects feed directly into the pressure system (see `calculate_policy_effects`) — e.g. `PoliticalCrackdown` cuts `PoliticalInstability` and `SocialUnrest` immediately but adds delayed increases to both plus `LegitimacyCrisis`, trading a short-term fix for a larger deferred cost. Persistent mismanagement of these trade-offs across enough countries is what drives systemic collapse conditions tracked elsewhere in the simulation.

## The Auto-Deploy Policy Engine

`emergence/policy_mode/auto_deploy.rs` implements a monthly engine (`EmergenceState::generate_auto_deployments`, invoked from `apply_monthly_emergence_effects` in the tick loop) that converts standing player stances into concrete agent deployments — this is the primary way policy stances translate into simulated action between card responses.

**Two-stage selection per country:**
1. **Stage 1 — Ideology fit (WHAT)**: For each recruited, available agent (not already on an active deployment, and cleared by `can_deploy` stress gating) and each `PolicyType` enabled by the country's active stances (via `policies_for_stance`), the engine finds the highest-severity active issue that the policy is a valid response to (`PolicyType::available_for_issue`), computes the agent's ideology compatibility against that issue's ideal ideology, and clamps it to 0.0-1.0. If no matching active issue exists, fit is 0 and the pairing is discarded — **the engine will not auto-deploy into a country with no matching active issue**, even if a stance is set.
2. **Stage 2 — Personality/posture (HOW)**: Agent/policy pairs clearing `MIN_IDEOLOGY_FIT` are scored as `ideology_fit * (1.0 + personality_modifier)`, where the personality modifier comes from the agent's category-specific facet fit (`personality_modifier`). Pairs are sorted by score descending; each agent can be selected for at most one deployment per cycle (agent-limited).

**Auto vs. manual dispatch:** For each selected (agent, policy) pair, the engine checks that stance slot's `AutoToggles::is_fully_auto()`. If all four toggles are Auto, it derives a `PostureType` (Aggressive/Subtle/Methodical/Chaotic) from the agent's personality facets via `derive_posture` (summed facet triples, explicit tie-break order Methodical > Subtle > Aggressive > Chaotic), builds a flavored narration string from the agent's personality archetype, and emits an `AutoDeployRequest` that the tick loop turns into a pending `DeploymentSummary` tagged `auto-deploy`. If any toggle is Manual, no deployment is created — instead a `ManualDeployPrompt` is queued (with the auto-suggested agent/posture as defaults) and the simulation autopauses for player input.

**Distinction from direct/player-driven deployment:** Auto-deploy only ever acts on `PolicyType`s reachable through the stance filter table and only when a matching active issue exists; it is agent-limited (one deployment per agent per cycle) and stance-gated by `AutoToggles`. Direct policy application via `PolicyStore::apply_policy` (used for issue-card responses) bypasses agents, stances, and toggles entirely — it applies pressure effects to a country immediately/on a schedule with no agent, posture, or ideology check at all. The two paths share only the underlying `PolicyType` effect tables and, for a handful of policy types, the `build_policy_economic_effects` bridge into the economy simulation (tariffs, rationing, strategic reserves, R&D/tech investment, fossil fuel expansion), which applies age-gated multipliers computed from each `AppliedPolicy`'s `applied_month`.

## System Interactions

### Feeds Into
- **[Politics](politics.md)** - Political policies (AntiCorruption, EarlyElections, ConstitutionalReform, PoliticalCrackdown, PoliticalAmnesty, StateOfEmergency) directly move `PoliticalInstability`, `LegitimacyCrisis`, and `EliteFracture` pressures, both immediately and via delayed effects.
- **[Institutions](institutions.md)** - Agents dispatched by the auto-deploy engine act through their `institution_type` (e.g. central bank, treasury, MFA); institution identity is threaded into deployment records and narration but does not itself gate which policies are available.
- **[Agents](agents.md)** - The auto-deploy engine consumes recruited agents' ideology, personality facets, and stress state to select who deploys, at what posture, and with what expected effectiveness; deployed agents are excluded from re-selection until their deployment resolves.

### Receives From
- **Issues** - `PolicyType::available_for_issue` and the auto-deploy engine's ideology-fit stage both require an active `Issue` of a matching type before a policy becomes selectable, whether by player card response or by the auto-deploy engine.
- **Pressures** - Policy effect magnitudes are expressed as deltas against the pressure system's `PressureType` values; existing pressure levels are what issues (and therefore policy availability) are derived from upstream.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/politics-policy.md)

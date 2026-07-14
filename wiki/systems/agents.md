---
id: agents
title: Agents & Deployments
domain: Simulation
relatedSystems: [pressures, jackpot, recruitment]
editedBy: Shadow Work Team
lastUpdated: 2026-07-14
---

# Agents & Deployments

## Overview

Agents are the player's operatives inside foreign institutions — the player does not act on a country directly, only through people recruited to work inside it. Each `Agent` (`crates/shadowbench-core/src/emergence/agents/`) controls one institution (central bank, treasury, executive, corporation, labor union, and similar `InstitutionType`s), carries a 31-facet personality, ideology, memory, and a relationship history with other agents, and can be **deployed** against a country's active issues. Agents are the mechanism by which the player's choices become a distinct, attributable causal channel in the simulation, separate from country-level policy and shocks — a distinction the engine enforces well enough to be ablation-tested (see below).

## What It Simulates

- **Institutional operatives**: Every `Agent` is bound to an `institution_type` (`InstitutionType`) and a `country_id`, with goals (`GoalType`: MaintainPower, IncreaseResources, MaintainStability, PursueReform, ResistThreats, ExpandInfluence, ProtectConstituents), a small set of condition→action behavior rules, and a bounded FIFO memory (`Agent::MAX_MEMORY = 20` entries) of past events that colors future decisions.
- **Recruitment lifecycle**: Agents move through `RecruitmentState`: `Uncontacted → Negotiating → Recruited` or `Refused`. Candidates are either static institutional leads or event-driven leads spawned in response to a specific country crisis, and expire if not recruited in time.
- **Personality and stress**: A 31-facet `AgentPersonality` (Dwarf-Fortress-inspired) drives what an agent will and won't do, how effective they are, how they age under pressure, and how the player perceives them (visibility is itself partial and must be earned).
- **Relationships and coalitions**: Agents build trust or conflict with each other through shared deployments, can form ad-hoc or formal coalitions that amplify effectiveness, oppose each other's actions, and can betray or mentor one another.
- **Deployments**: The player assigns a recruited agent against a country/issue target for a fixed duration; on resolution the deployment reduces the issue's pressure and can apply secondary institutional side effects, all tagged with an attributable source.

## Agents

An `Agent` (`emergence/agents/agent/mod.rs`) holds:

- **Identity**: `id`, `name` (deterministically generated), `country_id`, `institution_type`, plus runtime-only stable numeric IDs (`numeric_id`, `country_numeric_id`) used for fast lookups in the agent store.
- **Ideology**: an `AgentIdeology` profile with a `conviction` strength, used for ideological-compatibility checks in recruitment, deployment fit, coalitions, and opposition.
- **Goals and rules**: a small vector of weighted `Goal`s and 3+ `BehaviorRule`s (condition → action), evaluated on a per-agent action frequency (`ActionFrequency::Hourly/Daily/Weekly` — reactive statements happen hourly, operational decisions daily, strategic moves like reform or economic-policy shifts weekly).
- **Memory**: a bounded deque of `MemoryEntry` (event description, month, valence, salience, action category, success), oldest entries dropped once `MAX_MEMORY` is exceeded.
- **Personality state**: the 31-facet `AgentPersonality`, lifetime `FacetEvolution` tracking, transient (not saved) `AgentStress`, and a `PersonalityVisibility` map controlling what the player can currently see.
- **Influence**: an `agent_influence` score (0–100, default 50) derived from deployment success rate, with a previous-value field for threshold-event hysteresis.
- **Recruitment metadata**: `recruitment_state`, an optional `expires_at_ms` (event-driven leads expire; static institutional leads do not), and an optional `source_event` string recording why the lead exists (e.g. "Recession in USA").

Agents act by evaluating their behavior rules against current world state (`AgentStore`, `emergence/agents/store/`), producing an `Action` — one of `AdjustEconomicPolicy`, `LaunchReform`, `ResistChange`, `MobilizeResources`, `PublicStatement`, `Strike`, `Invest`, `CutProduction`, or `DoNothing`. Actions carry a notion of covertness (`is_covert`, e.g. hostile public statements or any `Invest`) and ruthlessness (`is_ruthless`, e.g. deep production cuts or intense strikes), which feed personality gates and event detection rather than being flagged by the player.

## Recruitment

The `RecruitmentSystem` (`emergence/recruitment/mod.rs`) tracks candidate `leads` (full `Agent` instances with generated personalities), a resolution `queue`, hired `staff`, per-candidate cooldowns, and a transparent vetting queue.

- **Candidate sourcing**: Static leads are generated per country from a fixed institution pool (central bank, treasury, executive, corporation, labor union, energy company, ruling party, opposition party) with randomized names, for personality variety. Event-driven candidates (`event_candidates.rs`) are instead spawned in response to a specific emerged issue — the issue type maps to 2–3 relevant institution types (e.g. a sovereign debt crisis surfaces central-bank and treasury leads), and each candidate's `source_event` and expiry are set so unrecruited event leads eventually disappear.
- **Costs and bands**: Leads and institutional-agent candidates each fall into a Low/Medium/High cost band, and separately into an alignment band (Aligned/Adjacent/Opposed) describing ideological fit with the player.
- **Success chance**: `success::compute_success_chance` starts from a base chance and adjusts for the alignment band (aligned candidates are easier to recruit, opposed candidates harder) and a fixed set of personality-facet modifiers — e.g. high Trust and high Pragmatism make a candidate easier to turn, high Loyalty and high Integrity make them harder. Critically, this is computed twice: once using **all** facets (the real chance that determines the outcome) and once using only the facets currently **visible** to the player (the estimated chance shown in the UI) — so a candidate's true recruitability can be better or worse than what the player can currently see, until intel narrows the gap.
- **Intel and vetting**: Covert intel actions reveal one hidden personality facet at a time, chosen by a deterministic weighted pick that favors facets far from neutral and facets in the candidate's institutional "domain," with escalating exposure risk per action taken and a cooldown if exposed. A separate, slower and non-covert **vetting** path (`enqueue_vetting`) reveals a targeted facet after a fixed duration (7/10/14 days by cost band) at a cost multiple of intel cost, but applies a flat success-chance penalty to vetted candidates.
- **Resolution**: Queued recruitment attempts resolve deterministically once their end time passes — the candidate ID is hashed and compared against the stored success chance; success recruits the agent, failure applies a cooldown before the candidate can be approached again.
- **Institutional agents** (already-serving officials, as opposed to fresh leads) go through the same candidate/success-chance machinery but at higher cost, wider exposure-risk range, and a longer recruitment duration than leads.

## Personality

Every agent carries a 31-facet `AgentPersonality` (`emergence/personality/types.rs`), each facet a 0–100 value, grouped by function:

- **Decision-making** (method selection): Boldness, Decisiveness, Improvisation, Thoroughness, Patience
- **Social** (inter-agent dynamics): Empathy, Trust, Persuasion, Gregariousness, Dominance
- **Stress/resilience** (breakdown thresholds): StressTolerance, EmotionalStability, AngerThreshold, Optimism, Resilience
- **Ethical** (moral boundaries): Honesty, Compassion, Ruthlessness, Integrity, Pragmatism
- **Institutional** (authority/process): Ambition, Loyalty, Conformity, Diligence, Accountability, Territorial
- **Cognitive** (learning/adaptation): Curiosity, AnalyticalThinking, Creativity, Adaptability, Memory

**Archetypes**: rather than being stored, a `PersonalityArchetype` is derived on demand (`archetype.rs`) as a weighted combination of specific facets — ByTheBook, Ambitious, Compassionate, Pragmatic, and Ideologue are each scored (Ideologue additionally folding in ideological conviction), and the highest-scoring archetype becomes `primary`; if the top two scores are close, a `secondary` (blended) archetype is also reported. Archetypes carry narration flavor used to color how deployments and events are described.

**Gates** (`gates.rs`): personality facets can outright block or discount actions. **Hard gates** trigger at extreme facet values and refuse the action entirely (e.g. very high Integrity refuses harsh production cuts or hostile statements; very low Trust refuses strong public statements; a compound "won't compromise" gate refuses reform launches for agents who are both highly principled and inflexible). **Soft gates** trigger at more moderate extreme values and instead apply a percentage effectiveness modifier without blocking the action (e.g. boldness shifts effectiveness on high-intensity actions; conformity penalizes reform or resistance depending on direction). Distressed agents have their anger threshold effectively lowered before gates are evaluated, making them more likely to hard-refuse.

**Stress** (`stress.rs`): agents accumulate stress from deployment outcomes (scaled by issue severity, reduced on success) and decay it while not deployed, at a rate shaped by their Resilience facet; StressTolerance and EmotionalStability narrow the variance. Stress resolves into a `StressState` — Nominal, Strained, Distressed, or Broken — and each state applies a fixed effectiveness penalty that is applied only *after* a deployment's success/failure has already been determined, so a stressed agent can still succeed, just less effectively (an explicit design choice to avoid a stress-causes-failure-causes-more-stress spiral). Broken agents cannot be deployed at all until a resilience-scaled recovery timer expires, at which point stress resets fully rather than partially.

**Evolution** (`evolution.rs`): facets are not static. A defined set of personality-relevant events (deployment success/failure, betrayal by an ally, coalition success, ordering an ethical violation, exposure during a covert operation, mentoring another agent, and more) each shift a small number of specific facets when they occur — usually within tuned ranges rather than fixed amounts, and often bifurcating: the same event can push different agents in different directions depending on an existing facet (e.g. witnessing collateral damage makes already-empathetic agents more compassionate but makes others more ruthless). Every shift is bounded by a lifetime cap per facet, and an agent's most extreme ("anchor") facets shift at half the normal rate, so personalities drift with experience but don't swing wildly or reset.

**Visibility**: `PersonalityVisibility` tracks, per facet, whether it is currently hidden from or visible to the player — independent of whether it affects the simulation. Hidden facets still act on recruitment success, gates, and deployment effectiveness; only intel/investigation/vetting reveal them to the player. This is a deliberate information-asymmetry mechanic: the player's read on a candidate or agent's personality can lag or misrepresent the mechanically "real" personality until spent on discovery.

## Relationships

Agents accumulate a `RelationshipState` with each other (`emergence/relationships/types.rs`): a trust value from active-enemy to trusted-ally, cooperation/conflict counters, a co-deployment count, and a `bond_formed` flag once agents have worked together enough times. Trust moves up on cooperative interaction and down (more sharply) on conflict, and drifts back toward neutral if a pair has no interaction for a long stretch, eventually pruning near-zero relationships from storage.

**Coalitions** (`coalitions.rs`) come in two forms. *Ad-hoc coalitions* are detected fresh each time agents propose actions on the same country, pressure, and direction: if the average ideological compatibility (plus a small bonus for existing trust) between the proposing agents clears a threshold, they form a temporary coalition with an effectiveness bonus that scales with member count and compatibility. *Formal coalitions* are persistent, named groups with an explicit membership list and a cohesion requirement (an ideology-compatibility gate) for joining, offering a larger effectiveness bonus. Separately, *implicit coalition bonds* accrue purely from repeated co-deployment — after enough joint deployments a bond forms, after which the pair's trust responds specifically to joint success or failure, decays slowly if untouched, and becomes immune to inter-agent-conflict escalation ("allies don't fight"). Bonded allies can still be detected betraying one another if one's deployment side effects actively worsen a pressure the other is working on, which resets trust and fires a betrayal event.

**Opposition** (`opposition.rs`) is the negative mirror of coalitions: agents proposing actions on the same pressure in opposing directions, who are also ideologically incompatible, generate opposition strength against each other — strengthened by low or negative relationship trust and weighted by the opposing institution's blocking power (ruling parties and executives block harder than labor unions, for instance). Opposition reduces the acting agent's effectiveness with diminishing returns, and can fully block an action outright if enough incompatible opposers stack up.

## Deployments and Field Effects on Country Pressures

A deployment assigns one recruited agent against a specific issue in a target country for a fixed duration, moving through `Pending → Active → Resolved`. On resolution (`state/simulation_loop/runner_tick/deployments.rs`, `deployment_effectiveness.rs`), the engine composes an effectiveness score from several independently inspectable layers before deciding success:

- **Ideology fit** between the agent and the issue's "ideal" institutional response.
- **Pressure context** — deployments against an already-severe pressure are harder, and a multi-crisis penalty applies when several pressures are simultaneously in the warning band.
- **Agent disposition** — bonus or penalty from the agent's own goal alignment with the issue, relevant memory of past success or failure, and an optimism-driven risk bias, scaled by ideological conviction.
- **Personality fit and active interactions** — the personality-modifier and interaction layers described above.
- **Specialization** — an experience-based bonus or penalty from the agent's history of actions in that category.
- **Political capital cost** — deployments cost political capital to authorize (discounted by leverage and crisis urgency); an unaffordable deployment is penalized rather than blocked outright.
- **Success threshold** — the composed effectiveness must clear a fixed bar to count as a success.
- **Stress penalty** — applied only after the success check, so a stressed agent's deployment can still succeed, just less effectively; a Broken agent cannot be deployed.
- **Institutional side effects** — on success, the agent's institution type applies its own fixed set of secondary pressure nudges (for example a labor-union deployment that relieves social unrest but adds economic strain), on top of the primary pressure reduction.

The primary effect of a successful deployment is a reduction to the target issue's primary pressure, scaled by the composed effectiveness. Both this primary reduction and any institutional side effects are applied through the country pressure store's attributed-modifier path, tagged with a `"deployment"` source — distinguishing deployment-caused pressure movement from ordinary agent-action effects (tagged per agent and action) and from other pressure sources elsewhere in the sim. This tagging is what lets the pressure system (and the ablation harness below) attribute a given pressure change back to a specific deployment rather than treating it as an undifferentiated drift.

Deployments also feed the relationship layer: agents co-deployed to the same country and issue can form or strengthen coalition bonds, trigger inter-agent conflict or anger escalation, surface betrayal by an ally, or produce a mentoring outcome — and update the deployed agent's stress, memory, influence, and specialization history regardless of the pressure outcome.

A distinct deployment kind, "investigate," takes a separate resolution path that does not touch country pressures at all: it resolves against a recruitment candidate rather than a country issue, revealing hidden personality facets (weighted toward the candidate's most extreme and institution-relevant facets, with the exact revealed values subject to noise unless the investigating agent is highly thorough) and, if run covertly, rolling exposure risk that can cost the investigating agent stress and burn a cooldown on the target.

## The Agent-Effects Ablation Harness

Because deployments and agent actions are the player's only channel into a country, the design treats "does the agent layer actually cause anything, separately from policy and shocks?" as a claim that must be testable, not assumed. `crates/shadowbench-core/src/ablation.rs` provides an environment-variable-gated kill switch (`SHADOWBENCH_DISABLE_AGENT_EFFECTS`) that is checked at every point where an agent-computed effect would otherwise be written into the world: pressure-effect application from action results, the periodic bench-deployment stabilization pass, and the weekly emergence economic-effects cache. When the flag is set, agents still exist, still decide, and still consume the same random draws as before — only the *application* of their computed effects to pressures and the economy is suppressed, so the rest of the simulation's RNG stream stays comparable draw-for-draw between an ablated and non-ablated run.

Crucially, policy-driven economic levers are deliberately **not** gated by this flag — the design treats any pressure or economic signal that still moves under agent-effects ablation as proof that the signal is coming from something other than agents (policy, exogenous shocks, or structural forcing), rather than from the agent-mediated channel. This makes the two channels empirically separable: running the simulation once with agent effects live and once with them severed and comparing outcomes (for example, how many months earlier or later a country's pressures cross a crisis threshold) isolates exactly the causal contribution the agent/deployment layer is adding on top of everything else in the sim. A companion flag (`SHADOWBENCH_DISABLE_SHOCKS`) exists to test the opposite direction — confirming that a collapse without exogenous shocks is driven by the sim's own internal dynamics rather than scripted forcing. Both flags default off and are built to leave the event stream byte-identical to unflagged behavior when unset, so the ablation harness itself introduces no side effects unless deliberately invoked.

## System Interactions

### Feeds Into
- **[Pressures](./pressures.md)** — successful deployments reduce a country's targeted pressure and can apply institutional side-effect pressure nudges, both attributed to a `"deployment"` source distinct from ordinary agent-action pressure effects.
- **[Jackpot](./jackpot.md)** — the agent-effects ablation harness is used to separate agent/deployment-driven pressure movement from policy- and shock-driven movement when analyzing what pushes a country toward (or away from) a jackpot/crisis threshold.

### Receives From
- **[Recruitment](#recruitment)** — the recruitment lifecycle (leads, intel, vetting) is the only way an agent becomes available for deployment; recruitment success itself depends on the candidate's personality and how much of it is currently visible.
- **[Pressures](./pressures.md)** — a deployment's effectiveness is partly determined by existing pressure context (harder against already-severe or multi-crisis situations), so pressure state feeds back into how well agents can act on it.

---

*Connected issues and related systems are automatically populated from the graph.*

**Contributors**: Shadow Work Team
**Last Updated**: 2026-07-14
**Edit on GitHub**: [Suggest changes](https://github.com/mistakeknot/shadow-workipedia/edit/main/wiki/systems/agents.md)

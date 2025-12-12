---
id: policy-contagion
title: Policy Contagion
type: primitive
pattern: "neighbor adoption → legitimacy → local adoption → spread"
usage_count: 21
related_primitives: [contagion-propagation, legitimacy-dynamics, feedback-loop]
---

# Policy Contagion

## Pattern

Policies spread geographically through a combination of ideological alignment, neighbor adoption, and crisis pressure. When neighbors adopt a policy successfully, it becomes more legitimate and likely to spread.

```
         ┌─────────────────────────────────┐
         │     Policy Adoption Spread      │
         │                                 │
         │    ○ ─── ● ─── ● ─── ○         │
         │    │     │     │     │         │
         │    ○ ─── ● ─── ○ ─── ○         │
         │    │     │     │     │         │
         │    ○ ─── ○ ─── ○ ─── ○         │
         │                                 │
         │  ● = adopted  ○ = not adopted  │
         └─────────────────────────────────┘
```

## Key Mechanics

- **Ideology alignment**: How well policy fits local political ideology (0.0-1.0)
- **Neighbor effect**: Probability boost from each neighbor who adopted
- **Crisis pressure**: Urgency increases adoption probability
- **Political cost**: Some policies are costly to adopt regardless of merit

## Adoption Formula

```
adoption_probability =
    ideology_alignment × 0.40 +
    neighbor_adoption_rate × 0.30 +
    crisis_pressure × 0.30
```

## Policy Options Example (Homelessness)

| Policy | Ideology | Effectiveness | Political Cost |
|--------|----------|---------------|----------------|
| Criminalization | Right | 0.2 | Low |
| Housing First | Left | 0.7 | High |
| Treatment First | Center | 0.5 | Medium |

Conservative regions adopt criminalization despite lower effectiveness.
Progressive regions adopt housing first despite higher political cost.

## Examples

### Democratic Backsliding Spread
Hungary adopts authoritarian policies → Poland follows → regional legitimacy for illiberalism → spreads to other EU members

### Cannabis Legalization Wave
Colorado legalizes → tax revenue demonstrated → neighbors adopt → federal pressure reduces → cascade legalization

### Austerity Contagion
Greece crisis → EU imposes austerity → spreads to Portugal, Spain, Ireland → becomes standard crisis response

### Sanctuary City Policies
California cities adopt → network effect → neighboring cities follow → becomes regional norm

## Warning Signs

- Ideologically misaligned policies spreading via crisis pressure
- Effective policies blocked by political cost
- Regional policy divergence creating conflicts
- Policy adoption without capacity to implement

## Issues Using This Primitive

- [[democratic-backsliding-spread]]
- [[drug-policy-reform-cascade]]
- [[immigration-policy-divergence]]
- [[climate-policy-adoption]]
- [[homelessness-policy-variation]]

## Related Primitives

- [[contagion-propagation]] - Geographic spread mechanism
- [[legitimacy-dynamics]] - Neighbor success builds legitimacy
- [[feedback-loop]] - Success breeds adoption breeds success
- [[resistance-backlash]] - Policy adoption triggers backlash

---

*This primitive appears in 21 ARCHITECTURE files, modeling policy diffusion.*

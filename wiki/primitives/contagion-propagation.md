---
id: contagion-propagation
title: Contagion Propagation
type: primitive
pattern: "initial infection → channel spread → correlation amplification → systemic crisis"
usage_count: 61
related_primitives: [threshold-cascade, trust-erosion, feedback-loop]
---

# Contagion Propagation

## Pattern

Crises spread through multiple interconnected channels, with correlation between channels amplifying the total impact. A banking crisis doesn't just affect banks—it cascades through trade, currency, and capital markets simultaneously.

```
       Banking ────────┐
          │            │
          ▼            │
       Trade ──────────┼──► Systemic
          │            │    Crisis
          ▼            │
      Currency ────────┤
          │            │
          ▼            │
   Capital Flight ─────┘
```

## Key Mechanics

- **Multi-channel spread**: Crisis propagates through 4+ channels simultaneously
- **Channel correlation**: Channels affect each other, amplifying total damage
- **Firebreaks**: Barriers that can stop contagion (capital controls, circuit breakers)
- **Infection tracking**: Each channel has its own infection level (0.0-1.0)

## Default Channels (Financial Crisis)

| Channel | Trigger | Spread Rate | Peak Impact |
|---------|---------|-------------|-------------|
| Banking | NPL >15% | 0.15/tick | Credit freeze |
| Trade | Import crisis | 0.10/tick | Supply disruption |
| Currency | Depreciation >20% | 0.20/tick | Import costs +40% |
| Capital | Flight >$10B/week | 0.25/tick | Investment collapse |

## Contagion Formula

```
total_impact = Σ(channel_infection × channel_weight) × (1 + correlation × active_channels)
```

With correlation = 0.3 and 4 active channels:
- Impact multiplier = 1 + 0.3 × 4 = 2.2×

## Examples

### Asian Financial Crisis (1997)
Thailand currency collapse → regional currency contagion → banking crises → trade credit freeze → capital flight → GDP -10-15% across region

### 2008 Global Financial Crisis
US subprime → shadow banking freeze → repo market collapse → trade finance freeze → global credit crunch → GDP -5% globally

### COVID Economic Contagion
Service sector shutdown → supply chain disruption → financial stress → unemployment cascade → consumption collapse

## Firebreak Mechanisms

- **Capital controls**: Stop capital flight channel
- **Currency intervention**: Slow currency channel
- **Deposit insurance**: Limit banking channel
- **Trade finance guarantees**: Protect trade channel

## Warning Signs

- Multiple channels showing early infection
- Correlation between channels increasing
- Firebreaks being tested
- Contagion from neighboring systems

## Issues Using This Primitive

- [[financial-crisis-contagion]]
- [[pandemic-economic-cascade]]
- [[supply-chain-disruption]]
- [[currency-crisis-spread]]
- [[banking-crisis-cascade]]

## Related Primitives

- [[threshold-cascade]] - Thresholds trigger contagion
- [[trust-erosion]] - Trust loss spreads via contagion
- [[feedback-loop]] - Channels create feedback loops
- [[policy-contagion]] - Policy responses also spread

---

*This primitive appears in 61 ARCHITECTURE files, essential for modeling systemic crises.*

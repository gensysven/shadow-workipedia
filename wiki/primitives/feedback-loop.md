---
id: feedback-loop
title: Feedback Loop
type: primitive
pattern: "A affects B → B affects A → amplification or stabilization"
usage_count: 151
related_primitives: [death-spiral, threshold-cascade, capacity-stress]
---

# Feedback Loop

## Pattern

Circular causation where outputs become inputs. **Reinforcing loops** amplify changes (virtuous or vicious cycles). **Balancing loops** resist change and seek equilibrium.

```
Reinforcing Loop:          Balancing Loop:
    ┌──────┐                   ┌──────┐
    │  A+  │                   │  A+  │
    │   ↓  │                   │   ↓  │
    │  B+  │                   │  B-  │
    │   ↓  │                   │   ↓  │
    └──A+──┘                   └──A───┘
   (amplifies)               (stabilizes)
```

## Key Mechanics

- **Loop type**: Reinforcing (amplifies) vs Balancing (stabilizes)
- **Loop strength**: How much change propagates per cycle
- **Delay**: Time lag between cause and effect
- **Saturation**: Limits on how far loops can push values
- **Runaway detection**: When reinforcing loops exceed safe bounds

## Loop Types

| Type | Behavior | Example |
|------|----------|---------|
| Reinforcing (+) | Amplifies change | Arms race, confidence spiral |
| Balancing (-) | Resists change | Price stabilization, thermostat |
| Delayed | Effect lags cause | Policy → outcome delay |
| Conditional | Only active under conditions | Panic only when trust <30% |

## Common Presets

### Arms Race (Reinforcing)
Country A arms → Country B feels threatened → B arms → A feels threatened → A arms more

### Confidence Spiral (Reinforcing)
Investment → growth → confidence → more investment (or reverse: fear → withdrawal → decline → more fear)

### Price Stabilization (Balancing)
Price rises → demand falls → price falls → demand rises → equilibrium

### Bank Run (Reinforcing)
Withdrawals → liquidity stress → more withdrawals → insolvency

## Examples

### Economic Confidence Loop
Strong economy → consumer confidence → spending → stronger economy (virtuous)
OR: Weak economy → fear → saving → weaker economy (vicious)

### Climate Feedback
Warming → ice melt → lower albedo → more warming (reinforcing)
Warming → more clouds → higher albedo → less warming (balancing)

### Social Media Engagement
Outrage content → engagement → algorithm promotes → more outrage (reinforcing)

## Warning Signs

- Reinforcing loop approaching saturation limits
- Multiple reinforcing loops activating simultaneously
- Balancing loops being overwhelmed
- Delay causing oscillation or overshoot

## Issues Using This Primitive

- [[economic-confidence-cycles]]
- [[climate-feedback-loops]]
- [[arms-race-dynamics]]
- [[social-media-amplification]]
- [[market-bubble-formation]]
- [[political-polarization]]

## Related Primitives

- [[death-spiral]] - Runaway reinforcing loops
- [[threshold-cascade]] - Loops can trigger cascades
- [[capacity-stress]] - Overload creates negative loops
- [[trust-erosion]] - Trust loops with legitimacy

---

*This primitive appears in 151 ARCHITECTURE files—tied for most commonly used.*

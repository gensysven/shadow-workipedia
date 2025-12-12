---
id: resistance-backlash
title: Resistance & Backlash
type: primitive
pattern: "grievance → mobilization → response → outcome → cycle repeat"
usage_count: 55
related_primitives: [feedback-loop, legitimacy-dynamics, threshold-cascade]
---

# Resistance & Backlash

## Pattern

Social movements follow a **cyclic pattern**: grievances accumulate, mobilization occurs, authorities respond, outcomes shape future cycles. Movements can be co-opted, repressed, or succeed—but rarely disappear permanently.

```
     Dormant → Rising → Active → Climax → Declining → Latent
         │                                              │
         └──────────────── Cycle Repeats ───────────────┘
```

## Key Mechanics

- **Cycle stages**: Dormant → Rising → Active → Climax → Declining → Latent → repeat
- **Grievance accumulation**: Background buildup of discontent
- **Mobilization threshold**: When grievances trigger collective action
- **Response types**: Concession, Ignore, Co-optation, Repression, Mixed
- **Radicalization**: Repression can push movements toward more extreme tactics

## Cycle Stages

| Stage | Intensity | Characteristics |
|-------|-----------|-----------------|
| Dormant | 0.0-0.1 | Latent grievances |
| Rising | 0.1-0.3 | Early organization |
| Active | 0.3-0.6 | Visible protests |
| Climax | 0.6-0.9 | Peak confrontation |
| Declining | 0.3-0.6 | Fatigue/victory |
| Latent | 0.1-0.2 | Waiting to revive |

## Response Type Effects

| Response | Short-term | Long-term |
|----------|------------|-----------|
| Concession | Movement demobilizes | May prevent radicalization |
| Ignore | Movement escalates | Grievances compound |
| Co-optation | Movement fractures | Some absorbed, some radicalize |
| Repression | Movement suppressed | Grievances intensify, future cycle more radical |

## Examples

### Labor Movement Cycles
1930s organizing → gains → 1980s decline → latent → 2020s revival

### Health Freedom Backlash
Mandates → resistance movement → some concessions → movement institutionalizes → permanent political force

### Indigenous Resistance
Historical grievances → periodic mobilization → mixed response → cycles over decades/centuries

### Tech Worker Organizing
AI ethics concerns → walkouts → some co-optation → layoffs → movement adapts

## Radicalization Dynamics

```
if (response == Repression) {
    future_cycle_intensity += 0.3
    radicalization_probability += 0.2
}
```

## Warning Signs

- Grievances crossing mobilization threshold
- Prior cycle ended in repression (predicts more radical next cycle)
- Multiple movements synchronizing
- State capacity for repression declining

## Issues Using This Primitive

- [[labor-movement-cycles]]
- [[health-freedom-backlash]]
- [[indigenous-rights-movements]]
- [[tech-worker-organizing]]
- [[climate-activism-escalation]]
- [[anti-surveillance-movement]]

## Related Primitives

- [[feedback-loop]] - Repression-radicalization feedback
- [[legitimacy-dynamics]] - Movements challenge legitimacy
- [[threshold-cascade]] - Mobilization thresholds
- [[exodus-migration]] - Repression can trigger exodus

---

*This primitive appears in ~55 ARCHITECTURE files, modeling social movement dynamics.*

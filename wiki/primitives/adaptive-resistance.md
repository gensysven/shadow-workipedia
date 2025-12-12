---
id: adaptive-resistance
title: Adaptive Resistance
type: primitive
pattern: "intervention → selection pressure → resistant variants → intervention fails"
usage_count: 35
related_primitives: [feedback-loop, threshold-cascade, resource-depletion]
---

# Adaptive Resistance

## Pattern

Unlike social resistance (backlash), adaptive resistance is **evolutionary**: interventions create selection pressure that favors resistant variants. Each intervention's effectiveness decays as resistance spreads, eventually requiring new interventions.

```
Effectiveness
    │
1.0 ├──╮
    │   ╲ Intervention A
0.5 ├────╲────────╮
    │     ╲        ╲ Intervention B
0.2 ├──────╲────────╲────────╮
    │       ╲        ╲        ╲ Intervention C
    └────────┴────────┴────────┴──► Time
           Resistance  Resistance
           emerges     spreads
```

## Key Mechanics

- **Resistance stages**: Susceptible → Emerging → Spreading → Dominant → Complete
- **Selection pressure**: Intervention use accelerates resistance evolution
- **Cross-resistance**: Resistance to one intervention can confer resistance to related ones
- **Pipeline depletion**: New interventions take years to develop
- **Crisis mode**: No effective interventions available

## Resistance Stages

| Stage | Prevalence | Effectiveness |
|-------|------------|---------------|
| Susceptible | <1% | ~100% |
| Emerging | 1-10% | 80-95% |
| Spreading | 10-30% | 50-80% |
| Dominant | 30-70% | 20-50% |
| Complete | >70% | <20% |

## Examples

### Antibiotic Resistance
Penicillin → MRSA emerges → vancomycin → VRE emerges → last-line drugs → pan-resistant bacteria → post-antibiotic era

### Insecticide Resistance
DDT → resistance spreads → pyrethroids → resistance spreads → neonicotinoids → pollinators harmed → pest resurge with resistance

### Artemisinin Resistance (Malaria)
Artemisinin introduced → SE Asia resistance → spreading to Africa → no replacement pipeline → millions at risk

### Regulatory Arbitrage
Regulation A → industry moves to jurisdiction B → Regulation B → synthetic products created → always one step ahead

### Synthetic Opioid Evolution
Fentanyl scheduling → analogs created → analog scheduling → new analogs → enforcement can't keep pace

## Pipeline Dynamics

```
if (pipeline_years > years_until_dominant_resistance) {
    crisis_mode = true  // No effective interventions coming
}
```

Typical pipeline times:
- Antibiotics: 10-15 years
- Insecticides: 5-8 years
- Regulatory: 3-5 years (but whack-a-mole)

## Warning Signs

- Resistance entering "Spreading" stage
- Pipeline empty or >10 years
- Cross-resistance appearing
- Intervention overuse accelerating

## Crisis Thresholds

| Domain | Crisis Trigger |
|--------|----------------|
| Antibiotics | <2 effective classes |
| Pesticides | <3 effective modes of action |
| Antivirals | 0 effective treatments |

## Issues Using This Primitive

- [[antibiotic-resistance-crisis]]
- [[insecticide-resistance-collapse]]
- [[malaria-artemisinin-resistance]]
- [[regulatory-arbitrage-cascade]]
- [[synthetic-opioid-evolution]]

## Related Primitives

- [[feedback-loop]] - Use-resistance-more use feedback
- [[threshold-cascade]] - Resistance crossing thresholds
- [[resource-depletion]] - Effectiveness as depleting resource
- [[death-spiral]] - Crisis mode can trigger system collapse

---

*This primitive appears in ~35 ARCHITECTURE files, modeling evolutionary arms races.*

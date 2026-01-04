import type { ConflictStyle, GradeBand, Latents, PressureResponse } from './types';

type PressureWeightsInput = {
  roleSeedTags: string[];
  gradeBand: GradeBand;
  conflictStyle: ConflictStyle;
  latents: Latents;
};

export function buildPressureWeights({
  roleSeedTags,
  gradeBand,
  conflictStyle,
  latents,
}: PressureWeightsInput): Array<{ item: PressureResponse; weight: number }> {
  const responses: PressureResponse[] = ['freezes', 'deliberates', 'delegates', 'rushes', 'thrives', 'avoids'];
  const risk01 = latents.riskAppetite / 1000;
  const stress01 = latents.stressReactivity / 1000;
  const impulse01 = latents.impulseControl / 1000;

  return responses.map(p => {
    let w = 1;

    if (p === 'thrives' && roleSeedTags.includes('operative')) w += 3;
    if (p === 'deliberates' && roleSeedTags.includes('analyst')) w += 3;
    if (p === 'freezes' && latents.stressReactivity > 700) w += 3;
    if (p === 'rushes' && latents.impulseControl < 400) w += 2;
    if (p === 'delegates' && (gradeBand === 'senior' || gradeBand === 'executive')) w += 2;
    if (p === 'avoids' && conflictStyle === 'avoidant') w += 2;

    // Correlate: Risk appetite ↔ pressure response
    if (p === 'rushes' || p === 'thrives') w += 1.6 * risk01;
    if (p === 'freezes' || p === 'avoids') w += 1.4 * (1 - risk01);
    if (p === 'deliberates') w += 0.8 * (1 - Math.abs(risk01 - 0.5) * 2);

    // Stress reactivity makes freezing/avoidance more likely, thriving less so
    if (p === 'freezes') w += 1.4 * stress01;
    if (p === 'avoids') w += 0.6 * stress01;
    if (p === 'thrives') w += 0.6 * (1 - stress01);

    // Impulse control nudges rushing vs deliberation
    if (p === 'rushes') w += 0.6 * (1 - impulse01);
    if (p === 'deliberates') w += 0.5 * impulse01;

    // HARD CONSTRAINTS: extreme risk appetite bands
    if (risk01 <= 0.2 && p === 'rushes') return { item: p, weight: 0 };
    if (risk01 >= 0.85 && p === 'freezes') return { item: p, weight: 0 };

    return { item: p, weight: Math.max(0, w) };
  });
}

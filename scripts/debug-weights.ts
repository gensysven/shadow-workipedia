// Test the multiplier math manually
const testCases = [
  { cosmo: 0.0, frug: 0.0, label: 'low cosmo, low frug' },
  { cosmo: 1.0, frug: 0.0, label: 'high cosmo, low frug' },
  { cosmo: 0.0, frug: 1.0, label: 'low cosmo, high frug' },
  { cosmo: 1.0, frug: 1.0, label: 'high cosmo, high frug' },
  { cosmo: 0.5, frug: 0.5, label: 'medium both' },
];

console.log('=== Multiplier Analysis ===\n');

for (const tc of testCases) {
  const stableMultiplier = (0.4 + 1.6 * (1 - tc.cosmo)) * (0.5 + 1.5 * tc.frug);
  const unstableMultiplier = (0.4 + 2.6 * tc.cosmo) * (0.3 + 1.7 * (1 - tc.frug));

  console.log(`${tc.label}:`);
  console.log(`  stable multiplier: ${stableMultiplier.toFixed(2)}`);
  console.log(`  unstable multiplier: ${unstableMultiplier.toFixed(2)}`);
  console.log(`  ratio (stable/unstable): ${(stableMultiplier / unstableMultiplier).toFixed(2)}`);
  console.log('');
}

// Now simulate base weights to see final outcome
console.log('=== Simulated Final Weights (assuming base stable=6, unstable=2) ===\n');
for (const tc of testCases) {
  const stableMultiplier = (0.4 + 1.6 * (1 - tc.cosmo)) * (0.5 + 1.5 * tc.frug);
  const unstableMultiplier = (0.4 + 2.6 * tc.cosmo) * (0.3 + 1.7 * (1 - tc.frug));

  const baseStable = 8; // Assuming elite+risk+age effects
  const baseUnstable = 2;

  const finalStable = baseStable * stableMultiplier;
  const finalUnstable = baseUnstable * unstableMultiplier;

  console.log(`${tc.label}:`);
  console.log(`  final stable: ${finalStable.toFixed(1)}, final unstable: ${finalUnstable.toFixed(1)}`);
  console.log(`  prob stable: ${(finalStable / (finalStable + finalUnstable) * 100).toFixed(0)}%`);
  console.log('');
}

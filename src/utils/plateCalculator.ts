export interface PlateLoadResult {
  perSide: { weightLbs: number; count: number }[];
  totalWeight: number;
  remainder: number;
  achievable: boolean;
}

export function calculatePlates(
  targetWeight: number,
  barWeight: number,
  inventory: { weightLbs: number; count: number }[],
): PlateLoadResult {
  const weightPerSide = (targetWeight - barWeight) / 2;

  if (weightPerSide < 0) {
    return { perSide: [], totalWeight: barWeight, remainder: 0, achievable: false };
  }

  // Sort largest first so we fill with the heaviest plates possible
  const sorted = [...inventory].sort((a, b) => b.weightLbs - a.weightLbs);

  const perSide: { weightLbs: number; count: number }[] = [];
  let remaining = weightPerSide;

  for (const plate of sorted) {
    const maxPerSide = Math.floor(plate.count / 2);
    if (maxPerSide === 0 || plate.weightLbs > remaining) continue;

    const use = Math.min(maxPerSide, Math.floor(remaining / plate.weightLbs));
    if (use > 0) {
      perSide.push({ weightLbs: plate.weightLbs, count: use });
      remaining = Math.round((remaining - use * plate.weightLbs) * 1000) / 1000;
    }
  }

  const loadedPerSide = weightPerSide - remaining;
  const totalWeight = Math.round((barWeight + loadedPerSide * 2) * 1000) / 1000;

  return {
    perSide,
    totalWeight,
    remainder: Math.round(remaining * 1000) / 1000,
    achievable: remaining === 0,
  };
}

export function formatPlateList(perSide: { weightLbs: number; count: number }[]): string {
  if (perSide.length === 0) return 'Bar only';
  return perSide.map((p) => `${p.count}×${p.weightLbs}`).join(' + ');
}

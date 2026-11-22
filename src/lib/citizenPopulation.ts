import type { Stranger } from '../types/game';
import type { CitizenBuildingIndex } from './citizenBuildings';

// Round down only after summing: a fractional person cannot pledge.
export function getSovereigntyPopulationLimits(index: CitizenBuildingIndex): Map<string, number> {
  return new Map([...index.capacityByOwner].map(([owner, capacity]) => [owner, Math.floor(capacity * 14 / 10)]));
}

export function countPledgedCitizens(citizens: Stranger[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const citizen of citizens) {
    const owner = citizen.allegiance?.userId;
    if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  return counts;
}

export function hasPledgeRoom(owner: string, limits: Map<string, number>, counts: Map<string, number>): boolean {
  return (counts.get(owner) ?? 0) < (limits.get(owner) ?? 0);
}

// Reserve immediately so multiple pledges or births in the same tick cannot overfill a realm.
export function updatePledgeCounts(before: Stranger, after: Stranger, counts: Map<string, number>): void {
  const previous = before.allegiance?.userId;
  const next = after.allegiance?.userId;
  if (previous === next) return;
  if (previous) counts.set(previous, Math.max(0, (counts.get(previous) ?? 0) - 1));
  if (next) counts.set(next, (counts.get(next) ?? 0) + 1);
}

// Keep people and possessions intact when buildings disappear or territory changes.
export function reconcilePledgePopulation(citizens: Stranger[], limits: Map<string, number>): Stranger[] {
  const counts = new Map<string, number>();
  const released = new Set<string>();
  const result = citizens.map(citizen => {
    const owner = citizen.allegiance?.userId;
    if (!owner) return citizen;
    if (hasPledgeRoom(owner, limits, counts)) {
      counts.set(owner, (counts.get(owner) ?? 0) + 1);
      return citizen;
    }
    released.add(citizen.id);
    return { ...citizen, allegiance: undefined, buildingKey: undefined, partnerId: undefined };
  });
  return result.map(citizen => citizen.partnerId && released.has(citizen.partnerId)
    ? { ...citizen, partnerId: undefined } : citizen);
}
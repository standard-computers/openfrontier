import type { Stranger, WorldMap } from '../types/game';

export const CITIZEN_TAX_PERIOD_DAYS = 28;
export const normalizeTaxRate = (rate: number | undefined) => Number.isFinite(rate) ? Math.max(0, Math.min(100, rate ?? 0)) : 0;
export const getCitizenGatherEarnings = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export const getCitizenTerritoryAttraction = (totalValue: number, resourceTiles: number, tileCount: number) =>
  totalValue * (0.1 + 0.9 * resourceTiles / Math.max(1, tileCount));

// Preserve actions made while a save was in flight, while applying canonical tax deductions.
export function mergeCitizenEconomy(latest: Stranger[], sent: Stranger[], saved: Stranger[]): Stranger[] {
  const sentById = new Map(sent.map(c => [c.id, c]));
  const savedById = new Map(saved.map(c => [c.id, c]));
  return latest.map(c => {
    const before = sentById.get(c.id);
    const after = savedById.get(c.id);
    if (!before || !after) return c;
    const departed = !!before.allegiance && !after.allegiance;
    return { ...c,
      coins: Math.max(0, (c.coins ?? 0) + (after.coins ?? 0) - (before.coins ?? 0)),
      happiness: Math.max(0, Math.min(100, (c.happiness ?? 50) + (after.happiness ?? 50) - (before.happiness ?? 50))),
      lastTaxDay: after.lastTaxDay, taxMoodDay: after.taxMoodDay, taxUnhappyDays: after.taxUnhappyDays,
      lastTaxPaid: after.lastTaxPaid, taxExileUntilDay: after.taxExileUntilDay,
      taxMoraleCeiling: after.taxMoraleCeiling,
      ...(departed ? { allegiance: undefined, buildingKey: undefined, partnerId: undefined } : {}),
    };
  });
}

export function returnUnpledgedToUnclaimed(citizens: Stranger[], map: WorldMap): Stranger[] {
  const displaced = citizens.some(c => !c.allegiance && map.tiles[c.position.y]?.[c.position.x]?.claimedBy);
  if (!displaced) return citizens;
  let refuge: { x: number; y: number } | undefined;
  for (let y = 0; y < map.height && !refuge; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y]?.[x];
      if (tile?.walkable && tile.type !== 'water' && !tile.claimedBy) { refuge = { x, y }; break; }
    }
  }
  return citizens.map(c => !c.allegiance && refuge && map.tiles[c.position.y]?.[c.position.x]?.claimedBy
    ? { ...c, position: { ...refuge }, buildingKey: undefined } : c);
}
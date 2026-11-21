export type NpcAggression = 'low' | 'medium' | 'high';

const ACTION_INTERVALS: Record<NpcAggression, number> = {
  low: 2000,
  medium: 1000,
  high: 500,
};

export const normalizeNpcAggression = (value: unknown): NpcAggression =>
  value === 'medium' || value === 'high' ? value : 'low';

export const getNpcActionInterval = (value?: NpcAggression): number =>
  ACTION_INTERVALS[normalizeNpcAggression(value)];

// NPC tax rates are controlled by NPC logic (their aggression), not by players.
const NPC_TAX_RATES: Record<NpcAggression, number> = {
  low: 10,
  medium: 20,
  high: 35,
};

export const getNpcTaxRate = (value?: NpcAggression): number =>
  NPC_TAX_RATES[normalizeNpcAggression(value)];
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
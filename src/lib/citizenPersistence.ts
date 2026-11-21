import type { Stranger } from '../types/game';

export interface CitizenSnapshot {
  strangers: Stranger[] | null;
  revision: number;
  saved?: boolean;
  economyChanged?: boolean;
  treasuryChanged?: boolean;
}

export function readCitizenSnapshot(value: unknown): CitizenSnapshot {
  if (!value || typeof value !== 'object' || !('revision' in value) || !('strangers' in value)) {
    throw new Error('Invalid citizen snapshot');
  }
  if (typeof value.revision !== 'number' || (value.strangers !== null && !Array.isArray(value.strangers))) {
    throw new Error('Invalid citizen snapshot');
  }
  return value as CitizenSnapshot;
}
export const GAME_DAY_MS = 3_600_000;
export type TileRequestStatus = 'pending' | 'countered' | 'accepted' | 'rejected' | 'conflict' | 'expired' | 'cancelled';
export interface TileRequest {
  id: string;
  world_id: string;
  tile_x: number;
  tile_y: number;
  requester_id: string;
  owner_id: string;
  npc_owner_id?: string | null;
  kind: 'offer' | 'contest';
  amount: number | null;
  status: TileRequestStatus;
  created_at: string;
  deadline_game_hour: number | null;
}

export const getGameHours = (createdAt: string, now = Date.now()) =>
  Math.max(0, (now - new Date(createdAt).getTime()) / GAME_DAY_MS * 24);

export const isContestExpired = (request: Pick<TileRequest, 'kind' | 'status' | 'deadline_game_hour'>, gameHours: number) =>
  request.kind === 'contest' && request.status === 'pending' && request.deadline_game_hour !== null && gameHours >= request.deadline_game_hour;

export const isValidLandOffer = (amount: number, landValue: number) =>
  Number.isSafeInteger(amount) && amount >= landValue && amount > 0;

export const canRespondToTileRequest = (request: TileRequest, userId: string) =>
  (request.status === 'pending' && !request.npc_owner_id && request.owner_id === userId) ||
  (request.status === 'countered' && request.requester_id === userId);

// Presentation only: the server remains responsible for validating membership.
export const getTileNegotiationTarget = (ownerId: string | undefined, userId: string) => {
  if (!ownerId || ownerId === userId) return 'none';
  return ownerId.startsWith('npc-') ? 'npc' : 'player';
};
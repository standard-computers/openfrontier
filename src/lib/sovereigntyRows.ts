import type { MapTile, NPC, Position, Resource, Sovereignty, Stranger } from '@/types/game';
import { calculateTileValue } from '@/types/game';

// A sovereignty as stored for one world member.
export interface SovereigntyRecord {
  userId: string;
  username: string;
  name: string;
  flag: string;
  motto: string;
  foundedAt: number;
  color: string;
}

export interface SovereigntyRow {
  id: string;
  name: string;
  flag: string;
  motto: string;
  ruler: string;
  color: string;
  isNPC: boolean;
  tiles: number;
  value: number;
  population: number;
  home: Position | null;
}

export interface SovereigntyRowInput {
  tiles: MapTile[][];
  strangers: Stranger[];
  npcs: NPC[];
  worldSovereignties: SovereigntyRecord[];
  currentSovereignty?: Sovereignty | null;
  userId: string;
  userColor: string;
  currentUsername: string;
  resources: Resource[];
}

// One row per founded sovereignty: how much land it holds, what that land is
// worth, how many strangers pledged to it, and where its home tile is.
export const buildSovereigntyRows = (input: SovereigntyRowInput): SovereigntyRow[] => {
  const {
    tiles,
    strangers,
    npcs,
    worldSovereignties,
    currentSovereignty,
    userId,
    userColor,
    currentUsername,
    resources,
  } = input;

  const tilesByOwner: Record<string, { count: number; value: number; home: Position | null }> = {};
  tiles.forEach((row, y) => {
    row.forEach((tile, x) => {
      const owner = tile.claimedBy;
      if (!owner) return;
      const entry = tilesByOwner[owner] || { count: 0, value: 0, home: null as Position | null };
      entry.count += 1;
      entry.value += calculateTileValue(tile, resources);
      if (!entry.home) entry.home = { x, y };
      tilesByOwner[owner] = entry;
    });
  });

  const populationByOwner: Record<string, number> = {};
  strangers.forEach(stranger => {
    const owner = stranger.allegiance?.userId;
    if (owner) populationByOwner[owner] = (populationByOwner[owner] || 0) + 1;
  });

  const rows: SovereigntyRow[] = [];
  const seen: Record<string, true> = {};

  worldSovereignties.forEach(sov => {
    const stats = tilesByOwner[sov.userId];
    seen[sov.userId] = true;
    rows.push({
      id: sov.userId,
      name: sov.name,
      flag: sov.flag,
      motto: sov.motto,
      ruler: sov.username,
      color: sov.color || '#888888',
      isNPC: false,
      tiles: stats?.count || 0,
      value: stats?.value || 0,
      population: populationByOwner[sov.userId] || 0,
      home: stats?.home || null,
    });
  });

  // A sovereignty founded this session may not be saved to the server yet.
  if (currentSovereignty && !seen[userId]) {
    const stats = tilesByOwner[userId];
    rows.push({
      id: userId,
      name: currentSovereignty.name,
      flag: currentSovereignty.flag,
      motto: currentSovereignty.motto,
      ruler: currentUsername,
      color: userColor,
      isNPC: false,
      tiles: stats?.count || 0,
      value: stats?.value || 0,
      population: populationByOwner[userId] || 0,
      home: stats?.home || null,
    });
  }

  npcs.forEach(npc => {
    const stats = tilesByOwner[npc.id];
    rows.push({
      id: npc.id,
      name: npc.sovereignty?.name || npc.name,
      flag: npc.sovereignty?.flag || '🏴',
      motto: npc.sovereignty?.motto || '',
      ruler: npc.name,
      color: npc.color,
      isNPC: true,
      tiles: stats?.count || 0,
      value: stats?.value || 0,
      population: populationByOwner[npc.id] || 0,
      home: stats?.home || npc.position,
    });
  });

  return rows.sort((a, b) => b.tiles - a.tiles || b.value - a.value);
};

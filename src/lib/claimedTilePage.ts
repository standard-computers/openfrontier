import type { MapTile, TileType } from '../types/game';

export interface ClaimedTileRow {
  x: number;
  y: number;
  type: TileType;
  name?: string;
}

// Cursor pagination avoids creating an array of every owned tile.
export function getClaimedTilePage(tiles: MapTile[][], userId: string, cursor = 0, pageSize = 50) {
  const rows: ClaimedTileRow[] = [];
  const width = tiles[0]?.length ?? 0;
  if (!width) return { rows, nextCursor: null };
  const limit = Math.max(1, Math.floor(pageSize));
  for (let index = cursor; index < width * tiles.length; index += 1) {
    const y = Math.floor(index / width);
    const x = index % width;
    const tile = tiles[y]?.[x];
    if (tile?.claimedBy !== userId) continue;
    if (rows.length === limit) return { rows, nextCursor: index };
    rows.push({ x, y, type: tile.type, name: tile.name });
  }
  return { rows, nextCursor: null };
}
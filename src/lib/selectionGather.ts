import type { MapTile, Position } from '@/types/game';

export interface SelectionTileInput {
  tile: Pick<MapTile, 'claimedBy' | 'resources' | 'placedResources'>;
  position: Position;
}

export interface GatherTarget {
  x: number;
  y: number;
  resourceId: string;
}

export interface SelectionGatherPlan {
  // True when every selected tile is unclaimed or claimed by this player.
  allMineOrUnclaimed: boolean;
  // Placed resources are gatherable only on the player's own land.
  gatherable: GatherTarget[];
  // True only when the whole selection is gatherable and something remains to pick.
  canGatherAll: boolean;
}

// Decides whether a multi-tile selection may be gathered in one go.
export function getSelectionGatherPlan(
  tiles: SelectionTileInput[],
  userId: string,
  allowOwner?: (ownerId: string) => boolean
): SelectionGatherPlan {
  const gatherable: GatherTarget[] = [];
  let allMineOrUnclaimed = true;

  for (const { tile, position } of tiles) {
    if (tile.claimedBy && tile.claimedBy !== userId && !allowOwner?.(tile.claimedBy)) {
      allMineOrUnclaimed = false;
      continue;
    }
    const placed = tile.placedResources ?? [];
    for (const resourceId of new Set(tile.resources)) {
      if (placed.includes(resourceId) && tile.claimedBy !== userId) continue;
      gatherable.push({ x: position.x, y: position.y, resourceId });
    }
  }

  return {
    allMineOrUnclaimed,
    gatherable,
    canGatherAll: allMineOrUnclaimed && gatherable.length > 0,
  };
}

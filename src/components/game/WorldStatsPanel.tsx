import { X, Globe, Users, Map, Flag, Package, Coins } from 'lucide-react';
import { GameWorld, Resource, TILE_TYPES, calculateTileValue, RARITY_COLORS } from '@/types/game';

interface WorldStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  world: GameWorld;
  resources: Resource[];
}

const WorldStatsPanel = ({ isOpen, onClose, world, resources }: WorldStatsPanelProps) => {
  if (!isOpen) return null;

  const totalTiles = world.map.width * world.map.height;
  const claimedTiles = world.map.tiles.flat().filter(t => t.claimedBy).length;
  const claimedPercent = ((claimedTiles / totalTiles) * 100).toFixed(1);

  // Calculate total world value
  let totalWorldValue = 0;
  world.map.tiles.flat().forEach(tile => {
    totalWorldValue += calculateTileValue(tile, resources);
  });

  // Calculate combined resources across all tiles
  const resourceCounts: Record<string, number> = {};
  world.map.tiles.flat().forEach(tile => {
    tile.resources.forEach(resourceId => {
      resourceCounts[resourceId] = (resourceCounts[resourceId] || 0) + 1;
    });
  });

  // Get unique players (for now just the current user if they have claims)
  const uniqueClaimers = new Set(
    world.map.tiles.flat()
      .filter(t => t.claimedBy)
      .map(t => t.claimedBy)
  );

  // Tile type breakdown
  const tileTypeCounts: Record<string, number> = {};
  world.map.tiles.flat().forEach(tile => {
    tileTypeCounts[tile.type] = (tileTypeCounts[tile.type] || 0) + 1;
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{world.name}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6 overflow-auto">
          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Users className="w-3 h-3" /> Players
              </div>
              <div className="text-2xl font-bold">{uniqueClaimers.size || 1}</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Map className="w-3 h-3" /> Total Tiles
              </div>
              <div className="text-2xl font-bold">{totalTiles.toLocaleString()}</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Flag className="w-3 h-3" /> Claimed
              </div>
              <div className="text-2xl font-bold">{claimedTiles.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{claimedPercent}% of world</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Coins className="w-3 h-3" /> World Value
              </div>
              <div className="text-2xl font-bold text-amber-400">{totalWorldValue.toLocaleString()}</div>
            </div>
          </div>

          {/* Terrain Breakdown */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Map className="w-4 h-4" /> Terrain
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {TILE_TYPES.map(tileType => {
                const count = tileTypeCounts[tileType.type] || 0;
                const percent = ((count / totalTiles) * 100).toFixed(0);
                return (
                  <div key={tileType.type} className="bg-secondary/30 rounded p-2 text-center">
                    <div className={`w-4 h-4 rounded mx-auto mb-1 ${tileType.color}`} />
                    <div className="text-xs font-medium">{tileType.label}</div>
                    <div className="text-xs text-muted-foreground">{percent}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" /> Resources in World
            </h3>
            {Object.keys(resourceCounts).length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {resources
                  .filter(r => resourceCounts[r.id])
                  .sort((a, b) => (resourceCounts[b.id] || 0) - (resourceCounts[a.id] || 0))
                  .map(resource => (
                    <div key={resource.id} className="bg-secondary/30 rounded p-2 flex items-center gap-2">
                      <span className="text-lg">{resource.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{resource.name}</div>
                        <div className={`text-xs ${RARITY_COLORS[resource.rarity]}`}>{resource.rarity}</div>
                      </div>
                      <div className="text-sm font-bold">{resourceCounts[resource.id]}</div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No resources remaining in the world
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldStatsPanel;

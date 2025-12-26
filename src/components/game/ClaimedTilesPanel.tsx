import { GameWorld, TILE_TYPES } from '@/types/game';
import { X, MapPin } from 'lucide-react';

interface ClaimedTileInfo {
  x: number;
  y: number;
  type: string;
  name?: string;
}

interface ClaimedTilesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  world: GameWorld;
}

const ClaimedTilesPanel = ({ isOpen, onClose, world }: ClaimedTilesPanelProps) => {
  if (!isOpen) return null;

  // Get all tiles claimed by the current user
  const claimedTiles: ClaimedTileInfo[] = [];
  
  world.map.tiles.forEach((row, y) => {
    row.forEach((tile, x) => {
      if (tile.claimedBy === world.userId) {
        claimedTiles.push({
          x,
          y,
          type: tile.type,
          name: tile.name,
        });
      }
    });
  });

  const getTileLabel = (type: string) => {
    const tileInfo = TILE_TYPES.find(t => t.type === type);
    return tileInfo?.label || type;
  };

  const getTileColor = (type: string) => {
    const tileInfo = TILE_TYPES.find(t => t.type === type);
    return tileInfo?.color || 'bg-gray-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="game-panel w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: world.userColor }}
            />
            <h2 className="text-lg font-semibold">Claimed Tiles ({claimedTiles.length})</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {claimedTiles.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No tiles claimed yet</p>
              <p className="text-sm mt-1">Select a tile on the map and claim it!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {claimedTiles.map((tile) => (
                <div 
                  key={`${tile.x}-${tile.y}`}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  {/* Tile type color indicator */}
                  <div className={`w-8 h-8 rounded ${getTileColor(tile.type)}`} />
                  
                  {/* Tile info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {tile.name || `Tile (${tile.x}, ${tile.y})`}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{getTileLabel(tile.type)}</span>
                      <span className="text-xs">•</span>
                      <span className="text-xs font-mono">({tile.x}, {tile.y})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimedTilesPanel;

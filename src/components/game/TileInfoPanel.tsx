import { MapTile, Resource, RARITY_COLORS, TILE_TYPES } from '@/types/game';
import { X, Flag, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TileInfoPanelProps {
  tile: MapTile;
  position: { x: number; y: number };
  resources: Resource[];
  userId: string;
  userColor: string;
  onClose: () => void;
  onClaim: () => void;
  onGather: (resourceId: string) => void;
}

const TileInfoPanel = ({
  tile,
  position,
  resources,
  userId,
  userColor,
  onClose,
  onClaim,
  onGather,
}: TileInfoPanelProps) => {
  const tileInfo = TILE_TYPES.find(t => t.type === tile.type);
  const tileResources = tile.resources.map(id => resources.find(r => r.id === id)).filter(Boolean) as Resource[];
  const isClaimed = !!tile.claimedBy;
  const isOwnClaim = tile.claimedBy === userId;
  const canGather = !isClaimed || isOwnClaim;

  return (
    <div className="game-panel w-80 max-h-[400px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn('w-6 h-6 rounded', tileInfo?.color)} />
          <div>
            <h3 className="font-medium">{tileInfo?.label} Tile</h3>
            <p className="text-xs text-muted-foreground">Position: {position.x}, {position.y}</p>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-ghost p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Claim Status */}
      <div className="p-3 border-b border-border">
        {isClaimed ? (
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full border-2"
              style={{ borderColor: isOwnClaim ? userColor : '#888', backgroundColor: isOwnClaim ? userColor + '40' : '#88888840' }}
            />
            <span className="text-sm">
              {isOwnClaim ? 'You own this tile' : 'Claimed by another player'}
            </span>
          </div>
        ) : (
          <button 
            onClick={onClaim}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <Flag className="w-4 h-4" />
            Claim This Tile
          </button>
        )}
      </div>

      {/* Resources */}
      <div className="flex-1 overflow-auto p-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Available Resources</span>
        </div>
        
        {tileResources.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No resources available on this tile
          </p>
        ) : (
          <div className="space-y-2">
            {tileResources.map((resource) => (
              <div 
                key={resource.id}
                className="flex items-center justify-between p-2 bg-secondary/50 rounded"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{resource.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{resource.name}</p>
                    <p className={cn('text-xs', RARITY_COLORS[resource.rarity])}>{resource.rarity}</p>
                  </div>
                </div>
                {canGather ? (
                  <button
                    onClick={() => onGather(resource.id)}
                    className="btn btn-accent text-xs py-1 px-2"
                  >
                    Gather
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Not your tile</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!canGather && (
        <div className="p-2 bg-destructive/10 text-center">
          <p className="text-xs text-destructive">Claim this tile to gather resources</p>
        </div>
      )}
    </div>
  );
};

export default TileInfoPanel;

import { useState } from 'react';
import { MapTile, Resource, RARITY_COLORS, TILE_TYPES, calculateTileValue } from '@/types/game';
import { X, Flag, Package, Coins, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResourceIcon from './ResourceIcon';
import { WorldMember } from '@/hooks/useGameWorld';

interface TileInfoPanelProps {
  tile: MapTile;
  position: { x: number; y: number };
  playerPosition: { x: number; y: number };
  resources: Resource[];
  userId: string;
  userColor: string;
  userCoins: number;
  members: WorldMember[];
  onClose: () => void;
  onClaim: () => void;
  onGather: (resourceId: string) => void;
  onRename: (name: string) => void;
  onViewUser: (member: WorldMember) => void;
}

const CLAIM_RADIUS = 6;

const TileInfoPanel = ({
  tile,
  position,
  playerPosition,
  resources,
  userId,
  userColor,
  userCoins,
  members,
  onClose,
  onClaim,
  onGather,
  onRename,
  onViewUser,
}: TileInfoPanelProps) => {
  const tileInfo = TILE_TYPES.find(t => t.type === tile.type);
  const tileResources = tile.resources.map(id => resources.find(r => r.id === id)).filter(Boolean) as Resource[];
  const isClaimed = !!tile.claimedBy;
  const isOwnClaim = tile.claimedBy === userId;
  const canGather = !isClaimed || isOwnClaim;
  
  const tileValue = calculateTileValue(tile, resources);
  const canAfford = userCoins >= tileValue;
  
  // Calculate distance from player
  const distance = Math.max(
    Math.abs(position.x - playerPosition.x),
    Math.abs(position.y - playerPosition.y)
  );
  const isWithinClaimRange = distance <= CLAIM_RADIUS;

  const [isEditingName, setIsEditingName] = useState(false);
  const [tileName, setTileName] = useState(tile.name || '');

  const handleSaveName = () => {
    onRename(tileName);
    setIsEditingName(false);
  };

  return (
    <div className="game-panel w-80 max-h-[450px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn('w-6 h-6 rounded', tileInfo?.color)} />
          <div>
            {isOwnClaim && isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tileName}
                  onChange={(e) => setTileName(e.target.value)}
                  placeholder="Name this tile..."
                  className="bg-secondary/50 border border-border rounded px-2 py-0.5 text-sm w-32"
                  maxLength={24}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} className="btn btn-ghost p-1">
                  <Check className="w-4 h-4 text-green-500" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <h3 className="font-medium">
                  {tile.name || `${tileInfo?.label} Tile`}
                </h3>
                {isOwnClaim && (
                  <button onClick={() => setIsEditingName(true)} className="btn btn-ghost p-0.5">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Position: {position.x}, {position.y}</p>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-ghost p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Value & Claim */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Land Value</span>
          <span className="flex items-center gap-1 font-medium text-amber-400">
            <Coins className="w-4 h-4" />
            {tileValue}
          </span>
        </div>
        
        {isClaimed ? (
          <div className="flex items-center gap-2 py-2">
            <div 
              className="w-4 h-4 rounded-full border-2"
              style={{ borderColor: isOwnClaim ? userColor : '#888', backgroundColor: isOwnClaim ? userColor + '40' : '#88888840' }}
            />
            {isOwnClaim ? (
              <span className="text-sm">You own this tile</span>
            ) : (
              (() => {
                const owner = members.find(m => m.userId === tile.claimedBy);
                return owner ? (
                  <button
                    onClick={() => onViewUser(owner)}
                    className="text-sm text-primary hover:underline cursor-pointer"
                  >
                    Owned by {owner.username}
                  </button>
                ) : (
                  <span className="text-sm">Claimed by another player</span>
                );
              })()
            )}
          </div>
        ) : !isWithinClaimRange ? (
          <div className="py-2 px-3 bg-muted rounded text-center">
            <span className="text-sm text-muted-foreground">
              Not within claimable distance ({distance} tiles away, max {CLAIM_RADIUS})
            </span>
          </div>
        ) : (
          <button 
            onClick={onClaim}
            disabled={!canAfford}
            className={cn(
              "btn w-full flex items-center justify-center gap-2",
              canAfford ? "btn-primary" : "opacity-50 cursor-not-allowed"
            )}
          >
            <Flag className="w-4 h-4" />
            {canAfford ? `Claim for ${tileValue} coins` : `Need ${tileValue} coins`}
          </button>
        )}
      </div>

      {/* Resources */}
      <div className="flex-1 overflow-auto p-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {tileResources.length > 0 ? 'Available Resources' : (isClaimed ? 'Resources (collected)' : 'No Resources')}
          </span>
        </div>
        
        {tileResources.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {isClaimed ? 'All resources collected' : 'No resources on this tile'}
          </p>
        ) : (
          <div className="space-y-2">
            {tileResources.map((resource) => (
              <div 
                key={resource.id}
                className="flex items-center justify-between p-2 bg-secondary/50 rounded"
              >
                <div className="flex items-center gap-2">
                  <ResourceIcon icon={resource.icon} iconType={resource.iconType} size="lg" />
                  <div>
                    <p className="text-sm font-medium">{resource.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs', RARITY_COLORS[resource.rarity])}>{resource.rarity}</span>
                      <span className="text-xs text-amber-400 flex items-center gap-0.5">
                        <Coins className="w-3 h-3" />{resource.coinValue}
                      </span>
                    </div>
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
                  <span className="text-xs text-muted-foreground">Not yours</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!isClaimed && !canAfford && (
        <div className="p-2 bg-destructive/10 text-center">
          <p className="text-xs text-destructive">Not enough coins to claim this tile</p>
        </div>
      )}
    </div>
  );
};

export default TileInfoPanel;

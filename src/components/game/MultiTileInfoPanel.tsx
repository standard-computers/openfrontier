import { useState, useMemo } from 'react';
import { MapTile, Resource, RARITY_COLORS, TILE_TYPES, calculateTileValue, Position, AREA_COLORS } from '@/types/game';
import { X, Flag, Package, Coins, ChevronDown, ChevronRight, AlertTriangle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResourceIcon from './ResourceIcon';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface TileWithPosition {
  tile: MapTile;
  position: Position;
}

interface MultiTileInfoPanelProps {
  tiles: TileWithPosition[];
  playerPosition: Position;
  resources: Resource[];
  userId: string;
  userColor: string;
  userCoins: number;
  onClose: () => void;
  onClaimAll: () => void;
  onGather: (x: number, y: number, resourceId: string) => void;
  onCreateArea?: (name: string, color: string, tiles: Position[]) => { success: boolean; message: string };
}

const CLAIM_RADIUS = 6;

const MultiTileInfoPanel = ({
  tiles,
  playerPosition,
  resources,
  userId,
  userColor,
  userCoins,
  onClose,
  onClaimAll,
  onGather,
  onCreateArea,
}: MultiTileInfoPanelProps) => {
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [areaColor, setAreaColor] = useState(AREA_COLORS[0]);
  // Calculate totals and check for issues
  const analysis = useMemo(() => {
    let totalValue = 0;
    let claimableTiles: TileWithPosition[] = [];
    let alreadyClaimedTiles: TileWithPosition[] = [];
    let ownClaimedTiles: TileWithPosition[] = [];
    let outOfRangeTiles: TileWithPosition[] = [];
    
    for (const { tile, position } of tiles) {
      const distance = Math.max(
        Math.abs(position.x - playerPosition.x),
        Math.abs(position.y - playerPosition.y)
      );
      const isWithinRange = distance <= CLAIM_RADIUS;
      
      if (tile.claimedBy === userId) {
        ownClaimedTiles.push({ tile, position });
      } else if (tile.claimedBy) {
        alreadyClaimedTiles.push({ tile, position });
      } else if (!isWithinRange) {
        outOfRangeTiles.push({ tile, position });
      } else {
        totalValue += calculateTileValue(tile, resources);
        claimableTiles.push({ tile, position });
      }
    }
    
    // Check if all tiles are owned by user (for area creation)
    const allOwnedByUser = tiles.every(({ tile }) => tile.claimedBy === userId);
    
    return {
      totalValue,
      claimableTiles,
      alreadyClaimedTiles,
      ownClaimedTiles,
      outOfRangeTiles,
      allOwnedByUser,
      hasClaimedLand: alreadyClaimedTiles.length > 0,
      hasOutOfRange: outOfRangeTiles.length > 0,
    };
  }, [tiles, playerPosition, resources, userId]);

  const canAfford = userCoins >= analysis.totalValue;
  const canClaim = analysis.claimableTiles.length > 0 && canAfford && !analysis.hasClaimedLand;

  const getDisabledReason = () => {
    if (analysis.hasClaimedLand) {
      return `Selection includes ${analysis.alreadyClaimedTiles.length} already claimed tile(s)`;
    }
    if (!canAfford) {
      return `Not enough coins (need ${analysis.totalValue}, have ${userCoins})`;
    }
    if (analysis.claimableTiles.length === 0 && !analysis.allOwnedByUser) {
      return 'No claimable tiles in selection';
    }
    return null;
  };

  const handleCreateArea = () => {
    if (!onCreateArea || !areaName.trim()) return;
    const result = onCreateArea(areaName.trim(), areaColor, tiles.map(t => t.position));
    if (result.success) {
      setShowAreaForm(false);
      setAreaName('');
    }
  };

  return (
    <div className="game-panel w-80 max-h-[500px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div>
          <h3 className="font-medium">Multi-Tile Selection</h3>
          <p className="text-xs text-muted-foreground">{tiles.length} tiles selected</p>
        </div>
        <button onClick={onClose} className="btn btn-ghost p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Land Value</span>
          <span className="flex items-center gap-1 font-medium text-amber-400">
            <Coins className="w-4 h-4" />
            {analysis.totalValue}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-green-500/20 rounded p-2 text-center">
            <div className="font-medium text-green-400">{analysis.claimableTiles.length}</div>
            <div className="text-muted-foreground">Claimable</div>
          </div>
          <div className="bg-red-500/20 rounded p-2 text-center">
            <div className="font-medium text-red-400">{analysis.alreadyClaimedTiles.length}</div>
            <div className="text-muted-foreground">Claimed</div>
          </div>
          <div className="bg-yellow-500/20 rounded p-2 text-center">
            <div className="font-medium text-yellow-400">{analysis.outOfRangeTiles.length}</div>
            <div className="text-muted-foreground">Out of Range</div>
          </div>
        </div>

        {/* Warning messages */}
        {analysis.hasClaimedLand && (
          <div className="flex items-center gap-2 p-2 bg-destructive/20 rounded text-destructive text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Selection includes land already claimed by other players</span>
          </div>
        )}

        {/* Claim button - only show if there are claimable tiles */}
        {analysis.claimableTiles.length > 0 && (
          <button 
            onClick={onClaimAll}
            disabled={!canClaim}
            className={cn(
              "btn w-full flex items-center justify-center gap-2",
              canClaim ? "btn-primary" : "opacity-50 cursor-not-allowed"
            )}
          >
            <Flag className="w-4 h-4" />
            {canClaim 
              ? `Claim ${analysis.claimableTiles.length} tiles for ${analysis.totalValue} coins`
              : getDisabledReason()
            }
          </button>
        )}

        {/* Create Area button - show when all tiles are owned by user */}
        {analysis.allOwnedByUser && onCreateArea && (
          <>
            {!showAreaForm ? (
              <button 
                onClick={() => setShowAreaForm(true)}
                className="btn btn-secondary w-full flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Create Area ({tiles.length} tiles)
              </button>
            ) : (
              <div className="space-y-2 p-2 bg-secondary/30 rounded-lg">
                <input
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="Area name..."
                  className="input-field w-full text-sm"
                  autoFocus
                />
                <div className="flex flex-wrap gap-1">
                  {AREA_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAreaColor(color)}
                      className={cn(
                        'w-6 h-6 rounded transition-all',
                        areaColor === color && 'ring-2 ring-white ring-offset-1 ring-offset-card'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAreaForm(false)}
                    className="btn btn-ghost flex-1 text-sm py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateArea}
                    disabled={!areaName.trim()}
                    className="btn btn-primary flex-1 text-sm py-1"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tiles accordion */}
      <div className="flex-1 overflow-auto">
        <Accordion type="multiple" className="w-full">
          {tiles.map(({ tile, position }, index) => {
            const tileInfo = TILE_TYPES.find(t => t.type === tile.type);
            const tileResources = tile.resources
              .map(id => resources.find(r => r.id === id))
              .filter(Boolean) as Resource[];
            const tileValue = calculateTileValue(tile, resources);
            const isClaimed = !!tile.claimedBy;
            const isOwnClaim = tile.claimedBy === userId;
            const canGather = !isClaimed || isOwnClaim; // Can gather from unclaimed or own tiles
            const distance = Math.max(
              Math.abs(position.x - playerPosition.x),
              Math.abs(position.y - playerPosition.y)
            );
            const isWithinRange = distance <= CLAIM_RADIUS;

            return (
              <AccordionItem key={`${position.x}-${position.y}`} value={`tile-${index}`}>
                <AccordionTrigger className="px-3 py-2 hover:no-underline">
                  <div className="flex items-center gap-2 w-full">
                    <div className={cn('w-4 h-4 rounded', tileInfo?.color)} />
                    <span className="text-sm flex-1 text-left">
                      {tile.name || `${tileInfo?.label} (${position.x}, ${position.y})`}
                    </span>
                    {isClaimed && (
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        isOwnClaim ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {isOwnClaim ? 'Yours' : 'Claimed'}
                      </span>
                    )}
                    {!isClaimed && !isWithinRange && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                        Far
                      </span>
                    )}
                    <span className="text-xs text-amber-400 flex items-center gap-0.5">
                      <Coins className="w-3 h-3" />{tileValue}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-2">
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Position: {position.x}, {position.y} • Distance: {distance} tiles
                    </div>
                    
                    {tileResources.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        {isClaimed ? 'All resources collected' : 'No resources'}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {tileResources.map((resource) => (
                          <div 
                            key={resource.id}
                            className="flex items-center justify-between p-1.5 bg-secondary/50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <ResourceIcon icon={resource.icon} iconType={resource.iconType} size="sm" />
                              <span className="text-xs">{resource.name}</span>
                            </div>
                            {canGather ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onGather(position.x, position.y, resource.id);
                                }}
                                className="btn btn-accent text-xs py-0.5 px-1.5"
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
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
};

export default MultiTileInfoPanel;

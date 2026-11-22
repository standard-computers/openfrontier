import { useState } from 'react';
import { MapTile, Resource, Stranger, RARITY_COLORS, TILE_TYPES, TileType, calculateTileValue } from '@/types/game';
import { X, Flag, Package, Coins, Pencil, Check, RotateCw, Paintbrush, ChevronDown, ChevronUp, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import ResourceIcon from './ResourceIcon';
import { WorldMember } from '@/hooks/useGameWorld';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { getTileNegotiationTarget, isValidLandOffer, type TileRequest } from '@/lib/tileNegotiations';

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
  onRotate?: (resourceId: string) => void;
  onShoot?: (resourceId: string) => void;
  onToggleAutoFire?: (resourceId: string) => void;
  onViewUser: (member: WorldMember) => void;
  onConvert?: (newType: TileType) => void;
  onOffer?: (amount: number) => void;
  onContest?: () => void;
  activeRequest?: TileRequest;
  requestBusy?: boolean;
  citizens?: Stranger[];
  onViewCitizen?: (citizen: Stranger) => void;
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
  onRotate,
  onShoot,
  onToggleAutoFire,
  onViewUser,
  onConvert,
  onOffer,
  onContest,
  activeRequest,
  requestBusy,
  citizens = [],
  onViewCitizen,
}: TileInfoPanelProps) => {
  const tileInfo = TILE_TYPES.find(t => t.type === tile.type);
  const tileResources = [...new Set(tile.resources)].map(id => resources.find(r => r.id === id)).filter(Boolean) as Resource[];
  const isClaimed = !!tile.claimedBy;
  const isOwnClaim = tile.claimedBy === userId;
  const canGather = !isClaimed || isOwnClaim;
  const negotiationTarget = getTileNegotiationTarget(tile.claimedBy, userId);
  
  const tileValue = calculateTileValue(tile, resources);
  const canAfford = userCoins >= tileValue;
  
  // Calculate distance from player
  const distance = Math.max(
    Math.abs(position.x - playerPosition.x),
    Math.abs(position.y - playerPosition.y)
  );
  const isWithinClaimRange = true; // third-person: no proximity limit

  const [isEditingName, setIsEditingName] = useState(false);
  const [tileName, setTileName] = useState(tile.name || '');
  const [showConvert, setShowConvert] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState(String(tileValue));
  const [contestConfirm, setContestConfirm] = useState(false);

  const handleSaveName = () => {
    onRename(tileName);
    setIsEditingName(false);
  };

  return (
    <div className="game-panel w-80 max-w-[calc(100vw-2rem)] max-h-[min(600px,calc(100dvh-8rem))] overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
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
                  <span className="text-sm">{negotiationTarget === 'npc' ? 'Owned by an NPC' : 'Claimed by another player'}</span>
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
            {canAfford ? `Claim for ${tileValue.toLocaleString()} coins` : `Need ${tileValue.toLocaleString()} coins`}
          </button>
        )}

        {/* Convert tile type - only for owned tiles */}
        {isOwnClaim && onConvert && (
          <div className="pt-1">
            <button
              onClick={() => setShowConvert(prev => !prev)}
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Paintbrush className="w-4 h-4" />
              Convert Tile
              {showConvert ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showConvert && (
              <div className="mt-2 grid grid-cols-2 gap-1">
                {TILE_TYPES.filter(t => t.type !== tile.type).map((t) => (
                  <button
                    key={t.type}
                    onClick={() => {
                      onConvert(t.type);
                      setShowConvert(false);
                    }}
                    disabled={userCoins < t.baseValue}
                    className={cn(
                      "flex items-center gap-1.5 p-1.5 rounded bg-secondary/50 text-xs hover:bg-secondary transition-colors",
                      userCoins < t.baseValue && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn('w-3 h-3 rounded flex-shrink-0', t.color)} />
                    <span className="flex-1 text-left truncate">{t.label}</span>
                    <span className="flex items-center gap-0.5 text-amber-400">
                      <Coins className="w-3 h-3" />{t.baseValue}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resources */}
      {isClaimed && !isOwnClaim && onOffer && onContest && <div className="p-3 border-b border-border space-y-2">
        {activeRequest ? <p className="text-sm text-muted-foreground capitalize">{activeRequest.kind} · {activeRequest.status}</p> : <>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" disabled={requestBusy} onClick={() => { setOfferAmount(String(tileValue)); setOfferOpen(v => !v); setContestConfirm(false); }}><Coins />Make offer</Button>
            <Button size="sm" variant="secondary" disabled={requestBusy} onClick={() => { setContestConfirm(v => !v); setOfferOpen(false); }}><Flag />Contest</Button>
          </div>
          {offerOpen && <div className="space-y-2">
            <label htmlFor="land-offer" className="text-xs text-muted-foreground">Minimum {tileValue.toLocaleString()} coins</label>
            <Input id="land-offer" aria-label="Offer amount" type="text" inputMode="numeric" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} />
            <Button size="sm" className="w-full" disabled={requestBusy || !isValidLandOffer(Number(offerAmount), tileValue) || Number(offerAmount) > userCoins} onClick={() => onOffer(Number(offerAmount))}>Send offer</Button>
          </div>}
          {contestConfirm && <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{negotiationTarget === 'npc' ? 'This NPC will give up the tile or start a conflict based on world aggression.' : 'Response due in one game day. No response transfers this tile to you.'}</p>
            <Button size="sm" variant="destructive" className="w-full" disabled={requestBusy} onClick={onContest}>Confirm contest</Button>
          </div>}
        </>}
      </div>}
      <div className="p-3">
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
            {tileResources.map((resource) => {
              const isPlaced = tile.placedResources?.includes(resource.id);
              return (
                <div 
                  key={resource.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-2 bg-secondary/50 rounded"
                >
                  <div className="flex items-center gap-2 min-w-0 w-full">
                    <ResourceIcon icon={resource.icon} iconType={resource.iconType} size="lg" style={tile.resourceRotation?.[resource.id] ? { transform: `rotate(${tile.resourceRotation[resource.id]}deg)` } : undefined} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">{resource.name}{tile.resources.filter(id => id === resource.id).length > 1 && ` ×${tile.resources.filter(id => id === resource.id).length}`}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('text-xs', RARITY_COLORS[resource.rarity])}>{resource.rarity}</span>
                        <span className="text-xs text-amber-400 flex items-center gap-0.5">
                          <Coins className="w-3 h-3" />{resource.coinValue}
                        </span>
                        {isPlaced && (
                          <span className="text-xs text-muted-foreground">(placed)</span>
                        )}
                      </div>
                      {resource.holdsPeople && (
                        <div className="text-xs text-muted-foreground mt-1">
                          People: {citizens.filter(s => s.buildingKey === `${position.x},${position.y}:${resource.id}`).length} / {resource.peopleCapacity ?? 1}
                          {citizens.filter(s => s.buildingKey === `${position.x},${position.y}:${resource.id}`).map(s => (
                            <Button key={s.id} variant="ghost" size="sm" className="h-auto px-0 py-1 text-xs block" onClick={() => onViewCitizen?.(s)}>{s.name}</Button>
                          ))}
                        </div>
                      )}
                      {resource.canInflictDamage && resource.projectile && isOwnClaim && onToggleAutoFire && (
                        <div className="flex items-center gap-2 mt-2">
                          <Switch id={`auto-fire-${resource.id}`} aria-label={`Automatic fire ${resource.name}`} checked={tile.resourceAutoFire?.[resource.id] ?? false} onCheckedChange={() => onToggleAutoFire(resource.id)} />
                          <label htmlFor={`auto-fire-${resource.id}`} className="text-xs text-muted-foreground">Automatic fire</label>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                  {resource.canInflictDamage && resource.projectile && onShoot && isOwnClaim && (
                    <Button variant="outline" size="icon" className="h-8 w-8" title={`Fire ${resource.name}`} aria-label={`Fire ${resource.name}`} onClick={() => onShoot(resource.id)}><Crosshair className="w-4 h-4" /></Button>
                  )}
                  {resource.rotatable && onRotate && canGather && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      title={`Rotate ${resource.name}`}
                      aria-label={`Rotate ${resource.name}`}
                      onClick={() => onRotate(resource.id)}
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  )}
                  {canGather && (!isPlaced || isOwnClaim) ? (
                    <Button
                      onClick={() => onGather(resource.id)}
                      size="sm"
                      className="text-xs"
                    >
                      Gather
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">{isPlaced && !isClaimed ? 'Claim to gather' : 'Not yours'}</span>
                  )}
                  </div>
                </div>
              );
            })}
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

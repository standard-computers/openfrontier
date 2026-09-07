import { useState, useEffect, useMemo } from 'react';
import { GameWorld, Resource, MAX_HEALTH } from '@/types/game';
import { Settings, Coins, ChevronRight, Hammer, ZoomIn, ZoomOut, Crown, Clock, Heart, Sparkles, BoxSelect, Trophy, Locate, Store, Hand } from 'lucide-react';
import ResourceIcon from './ResourceIcon';
import InventoryItemModal from './InventoryItemModal';
import { cn } from '@/lib/utils';
import { WorldMember } from '@/hooks/useGameWorld';
import { getTopPlayer } from './PlayerRankingPanel';

interface GameTopBarProps {
  world: GameWorld;
  resources: Resource[];
  zoomPercent: number;
  username: string | null;
  multiSelectMode: boolean;
  panMode: boolean;
  members: WorldMember[];
  onOpenStats: () => void;
  onOpenMarketplace: () => void;
  onOpenPlayer: () => void;
  onOpenCrafting: () => void;
  onOpenConfig: () => void;
  onZoom: (delta: number) => void;
  onToggleMultiSelect: () => void;
  onTogglePanMode: () => void;
}

export const GameTopBar = ({ world, resources, zoomPercent, username, multiSelectMode, panMode, members, onOpenStats, onOpenMarketplace, onOpenPlayer, onOpenCrafting, onOpenConfig, onZoom, onToggleMultiSelect, onTogglePanMode }: GameTopBarProps) => {
  const [worldTime, setWorldTime] = useState({ days: 0, hours: 0 });
  const topPlayer = useMemo(() => getTopPlayer(world, resources, members), [world, resources, members]);

  // Calculate world time: 1 real hour = 1 game day
  useEffect(() => {
    const calculateWorldTime = () => {
      const createdAt = new Date(world.createdAt).getTime();
      const now = Date.now();
      const elapsedMs = now - createdAt;
      const totalGameHours = (elapsedMs / 3600000) * 24;
      const days = Math.floor(totalGameHours / 24);
      const hours = Math.floor(totalGameHours % 24);
      setWorldTime({ days, hours });
    };

    calculateWorldTime();
    const interval = setInterval(calculateWorldTime, 60000);
    return () => clearInterval(interval);
  }, [world.createdAt]);

  return (
    <div className="w-full bg-card border-b border-border px-2 py-1.5 flex items-center gap-1.5 flex-wrap z-50">
      {/* World button */}
      <button
        onClick={onOpenStats}
        className="px-2 py-1 rounded hover:bg-muted/60 transition-colors flex items-center gap-1.5"
      >
        <h1 className="font-semibold text-foreground text-sm">{world.name}</h1>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Population indicator */}
      {world.enableStrangers && world.strangers && world.strangers.length > 0 && (
        <div className="px-2 py-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-base">👤</span>
          <span className="font-medium text-foreground">{world.strangers.length.toLocaleString()}</span>
        </div>
      )}

      {/* Clock and position */}
      <div className="px-2 py-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Day {worldTime.days}, {worldTime.hours}:00
        </span>
        <span>Home: {world.playerPosition.x}, {world.playerPosition.y}</span>
      </div>


      {/* Market button */}
      {(world.openMarkets !== false) && world.enableMarkets && (
        <button
          onClick={onOpenMarketplace}
          className="px-2 py-1 rounded hover:bg-muted/60 transition-colors flex items-center gap-1.5"
          title="Open Marketplace"
        >
          <Store className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">Market</span>
        </button>
      )}

      {/* Spacer pushes tools to the right */}
      <div className="flex-1 min-w-[8px]" />

      {/* Tools */}
      <button
        onClick={onTogglePanMode}
        className={cn(
          "p-2 rounded transition-colors",
          panMode ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
        )}
        title={panMode ? "Pan tool ON [H]" : "Pan tool [H] (drag the map around)"}
      >
        <Hand className="w-5 h-5" />
      </button>

      <button
        onClick={onToggleMultiSelect}
        className={cn(
          "p-2 rounded transition-colors",
          multiSelectMode ? "bg-primary text-primary-foreground" : "hover:bg-muted/60"
        )}
        title={multiSelectMode ? "Multi-select ON [S]" : "Multi-select [S] (click and drag to select tiles)"}
      >
        <BoxSelect className="w-5 h-5" />
      </button>

      <button
        onClick={onOpenCrafting}
        className="p-2 rounded hover:bg-muted/60 transition-colors"
        title="Crafting"
      >
        <Hammer className="w-5 h-5" />
      </button>

      {/* Merged player + sovereignty button */}
      <button
        onClick={onOpenPlayer}
        className="p-2 rounded hover:bg-muted/60 transition-colors flex items-center gap-2"
        title={world.sovereignty ? world.sovereignty.name : (username || 'Player')}
      >
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: world.userColor }}
        />
        {world.sovereignty ? (
          <>
            <span className="text-lg">{world.sovereignty.flag}</span>
            <span className="text-sm font-medium max-w-[100px] truncate">{world.sovereignty.name}</span>
          </>
        ) : (
          <>
            <Crown className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground max-w-[80px] truncate">{username || 'Player'}</span>
          </>
        )}
        {topPlayer && (
          <span className="flex items-center gap-1 text-xs text-amber-400" title={`Leader: ${topPlayer.name}`}>
            <Trophy className="w-3 h-3" />
            {topPlayer.netWorth.toLocaleString()}
          </span>
        )}
      </button>

      <button onClick={onOpenConfig} className="p-2 rounded hover:bg-muted/60 transition-colors" title="Settings">
        <Settings className="w-5 h-5" />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onZoom(-4)}
          className="p-1.5 rounded hover:bg-muted/60 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="px-1 text-xs text-muted-foreground min-w-[44px] text-center">
          {zoomPercent}%
        </div>
        <button
          onClick={() => onZoom(4)}
          className="p-1.5 rounded hover:bg-muted/60 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface GameHUDProps {
  world: GameWorld;
  resources: Resource[];
  selectedSlot: number;
  cameraOffset: boolean;
  onSelectSlot: (slot: number) => void;
  onOpenClaimedTiles: () => void;
  onConsumeResource: (resourceId: string) => { success: boolean; message: string };
  onReturnToPlayer: () => void;
}

const GameHUD = ({ world, resources, selectedSlot, cameraOffset, onSelectSlot, onOpenClaimedTiles, onConsumeResource, onReturnToPlayer }: GameHUDProps) => {

  const getResource = (id: string | null) => resources.find(r => r.id === id);
  const [selectedItem, setSelectedItem] = useState<{ resourceId: string; quantity: number; life?: number } | null>(null);

  const claimedCount = world.map.tiles.flat().filter(t => t.claimedBy === world.userId).length;

  return (
    <>
      {/* Return to player button - shown when camera is offset */}
      {cameraOffset && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto z-50">
          <button
            onClick={onReturnToPlayer}
            className="game-panel px-4 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2 bg-primary/20 border border-primary/30"
          >
            <Locate className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Return to Player</span>
          </button>
        </div>
      )}

      {/* Inventory bar with tiles, health, xp, coins */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 game-panel p-2 pointer-events-auto z-50 overflow-visible">
        <div className="flex items-center gap-2 overflow-visible">
          {/* Claimed tiles indicator */}
          <button 
            onClick={onOpenClaimedTiles}
            className="flex items-center gap-1.5 px-3 py-1 bg-muted/50 rounded hover:bg-muted transition-colors"
            title="Claimed Tiles"
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: world.userColor }}
            />
            <span className="text-sm text-muted-foreground">{claimedCount}</span>
          </button>

          {/* Health */}
          <div className="flex items-center gap-1 px-3 py-1 bg-red-500/20 rounded">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="font-bold text-red-500 text-sm">{Math.floor(world.health)}/{MAX_HEALTH}</span>
          </div>

          {/* XP */}
          <div className="flex items-center gap-1 px-3 py-1 bg-purple-400/20 rounded">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-purple-400 text-sm">{world.xp ?? 0}</span>
            <span className="text-purple-400 text-sm">XP</span>
          </div>

          {/* Coins */}
          <div className="flex items-center gap-1 px-3 py-1 bg-amber-400/20 rounded">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-400 text-sm">{world.coins}</span>
          </div>
          
          <div className="w-px h-8 bg-border" />
          
          {/* Inventory slots */}
          <div className="flex gap-1 overflow-visible">
            {world.inventory.slice(0, 10).map((slot, i) => {
              const resource = getResource(slot.resourceId);
              const isSelected = selectedSlot === i;
              return (
                <button
                  key={i}
                  className={`w-11 h-11 rounded flex items-center justify-center relative text-lg transition-colors group ${
                    isSelected 
                      ? 'bg-primary/30 ring-2 ring-primary' 
                      : 'bg-input hover:bg-muted'
                  } ${!slot.resourceId ? 'cursor-default' : ''}`}
                  onClick={() => {
                    onSelectSlot(i);
                    if (slot.resourceId) {
                      setSelectedItem({ resourceId: slot.resourceId, quantity: slot.quantity, life: slot.life });
                    }
                  }}
                >
                  {/* Hover tooltip */}
                  {resource && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-card border border-border rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap text-xs">
                      <div className="font-medium text-foreground">{resource.name}</div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-amber-400">{resource.coinValue}g</span>
                        {(resource.useLife || resource.canInflictDamage) && slot.life !== undefined && (
                          <span className={slot.life > 50 ? 'text-blue-400' : slot.life > 25 ? 'text-amber-400' : 'text-red-400'}>
                            {slot.life}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Slot number indicator */}
                  <span className="absolute top-0 left-0.5 text-[8px] text-muted-foreground font-medium">
                    {i < 9 ? i + 1 : '0'}
                  </span>
                  {resource && (
                    <>
                      <ResourceIcon icon={resource.icon} iconType={resource.iconType} size="md" />
                      {slot.quantity > 1 && (
                        <span className="absolute bottom-0 right-0.5 text-[10px] font-medium bg-card px-0.5 rounded">
                          {slot.quantity}
                        </span>
                      )}
                      {/* Durability bar for items with useLife or damage-dealing items */}
                      {(resource.useLife || resource.canInflictDamage) && slot.life !== undefined && slot.life < 100 && (
                        <div className="absolute bottom-0 left-0.5 right-0.5 h-1 bg-muted/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              slot.life > 50 ? 'bg-blue-400' : 
                              slot.life > 25 ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${slot.life}%` }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inventory Item Modal */}
      <InventoryItemModal
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        resource={selectedItem ? getResource(selectedItem.resourceId) || null : null}
        quantity={selectedItem?.quantity || 0}
        life={selectedItem?.life}
        onConsume={onConsumeResource}
      />
    </>
  );
};

export default GameHUD;

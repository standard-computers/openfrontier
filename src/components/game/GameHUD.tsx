import { useState, useEffect, useMemo } from 'react';
import { GameWorld, Resource } from '@/types/game';
import { Settings, Coins, ChevronRight, ChevronUp, ChevronDown, Hammer, ZoomIn, ZoomOut, Crown, Clock, Sparkles, BoxSelect, Trophy, Locate, Store, Hand } from 'lucide-react';
import InventorySlots from './InventorySlots';
import InventoryItemModal from './InventoryItemModal';
import { cn } from '@/lib/utils';
import { WorldMember } from '@/hooks/useGameWorld';
import { getTopPlayer } from './PlayerRankingPanel';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

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
  onOpenRequests?: () => void;
  requestCount?: number;
}

export const GameTopBar = ({ world, resources, zoomPercent, username, multiSelectMode, panMode, members, onOpenStats, onOpenMarketplace, onOpenPlayer, onOpenCrafting, onOpenConfig, onZoom, onToggleMultiSelect, onTogglePanMode, onOpenRequests, requestCount = 0 }: GameTopBarProps) => {
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
      {onOpenRequests && <Button variant="ghost" size="sm" title="Land Requests" aria-label={`Land Requests (${requestCount})`} onClick={onOpenRequests}><Mail />{requestCount > 0 && <span>{requestCount}</span>}</Button>}
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
  onMoveSlot: (source: number, destination: number) => void;
  tileSize?: number;
  onOpenClaimedTiles: () => void;
  onConsumeResource: (resourceId: string) => { success: boolean; message: string };
  onReturnToPlayer: () => void;
}

const GameHUD = ({ world, resources, selectedSlot, cameraOffset, onSelectSlot, onMoveSlot, tileSize, onOpenClaimedTiles, onConsumeResource, onReturnToPlayer }: GameHUDProps) => {

  const getResource = (id: string | null) => resources.find(r => r.id === id);
  const [selectedItem, setSelectedItem] = useState<{ resourceId: string; quantity: number; life?: number } | null>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);

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

      {/* Inventory bar with tiles, xp, coins */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 game-panel p-2 pointer-events-auto z-50 w-max max-w-[calc(100%-16px)]">
        {inventoryOpen && (
          <section aria-label="Full inventory" className="mb-2 border-b border-border pb-3">
            <h2 className="text-sm font-semibold px-1 pb-2">Inventory</h2>
            <div className="max-h-[min(45vh,360px)] overflow-y-auto p-1">
              <InventorySlots inventory={world.inventory} resources={resources} selectedSlot={selectedSlot} expanded onSelect={onSelectSlot} onInspect={slot => slot.resourceId && setSelectedItem({ ...slot, resourceId: slot.resourceId })} onMove={onMoveSlot} tileSize={tileSize} />
            </div>
          </section>
        )}
        <div className="flex items-center gap-2 flex-wrap justify-center">
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
          
          {/* Inventory slots and full inventory toggle */}
          <div className="flex items-center gap-1 max-w-full min-w-0 p-1">
            <div className="min-w-0 overflow-x-auto p-0.5">
              <InventorySlots inventory={world.inventory} resources={resources} selectedSlot={selectedSlot} onSelect={onSelectSlot} onInspect={slot => slot.resourceId && setSelectedItem({ ...slot, resourceId: slot.resourceId })} onMove={onMoveSlot} tileSize={tileSize} />
            </div>
            <Button variant="ghost" size="icon" className="w-11 h-11 shrink-0 rounded bg-input hover:bg-muted" aria-label={inventoryOpen ? 'Close full inventory' : 'Open full inventory'} title={inventoryOpen ? 'Close full inventory' : 'Open full inventory'} aria-expanded={inventoryOpen} onClick={() => setInventoryOpen(open => !open)}>
              {inventoryOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </Button>
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

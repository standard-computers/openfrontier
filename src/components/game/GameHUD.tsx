import { useState, useEffect } from 'react';
import { GameWorld, Resource, Sovereignty, MAX_HEALTH } from '@/types/game';
import { Settings, User, Coins, ChevronRight, Hammer, ZoomIn, ZoomOut, Crown, Clock, Heart } from 'lucide-react';
import ResourceIcon from './ResourceIcon';

interface GameHUDProps {
  world: GameWorld;
  resources: Resource[];
  zoomPercent: number;
  username: string | null;
  onOpenConfig: () => void;
  onOpenAccount: () => void;
  onOpenSovereignty: () => void;
  onOpenStats: () => void;
  onOpenCrafting: () => void;
  onZoom: (delta: number) => void;
}

const GameHUD = ({ world, resources, zoomPercent, username, onOpenConfig, onOpenAccount, onOpenSovereignty, onOpenStats, onOpenCrafting, onZoom }: GameHUDProps) => {
  const getResource = (id: string | null) => resources.find(r => r.id === id);
  const [worldTime, setWorldTime] = useState({ days: 0, hours: 0 });

  // Calculate world time: 1 real hour = 1 game day
  useEffect(() => {
    const calculateWorldTime = () => {
      const createdAt = new Date(world.createdAt).getTime();
      const now = Date.now();
      const elapsedMs = now - createdAt;
      
      // 1 real hour = 1 game day = 3600000ms
      // So game days = elapsedMs / 3600000
      const totalGameHours = (elapsedMs / 3600000) * 24;
      const days = Math.floor(totalGameHours / 24);
      const hours = Math.floor(totalGameHours % 24);
      
      setWorldTime({ days, hours });
    };

    calculateWorldTime();
    // Update every real minute (= 0.4 game hours)
    const interval = setInterval(calculateWorldTime, 60000);
    return () => clearInterval(interval);
  }, [world.createdAt]);

  const claimedCount = world.map.tiles.flat().filter(t => t.claimedBy === world.userId).length;

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
        <button 
          onClick={onOpenStats}
          className="game-panel px-4 py-3 pointer-events-auto hover:bg-muted/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-foreground">{world.name}</h1>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Day {worldTime.days}, {worldTime.hours}:00
            </span>
            <span>Pos: {world.playerPosition.x}, {world.playerPosition.y}</span>
          </div>
        </button>

        {/* Empty space for balance */}
        <div></div>

        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenCrafting}
              className="game-panel p-2 hover:bg-muted transition-colors"
              title="Crafting"
            >
              <Hammer className="w-5 h-5" />
            </button>

            <button 
              onClick={onOpenAccount} 
              className="game-panel p-2 hover:bg-muted transition-colors flex items-center gap-2"
              title="Account"
            >
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: world.userColor }}
              />
              <User className="w-5 h-5" />
            </button>

            <button 
              onClick={onOpenSovereignty} 
              className="game-panel p-2 hover:bg-muted transition-colors flex items-center gap-2"
              title={world.sovereignty ? world.sovereignty.name : 'Sovereignty'}
            >
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
            </button>

            <button onClick={onOpenConfig} className="game-panel p-2 hover:bg-muted transition-colors" title="Settings">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Zoom controls - vertical */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => onZoom(4)}
              className="game-panel p-1.5 hover:bg-muted transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="game-panel px-2 py-1 text-xs text-muted-foreground min-w-[48px] text-center">
              {zoomPercent}%
            </div>
            <button
              onClick={() => onZoom(-4)}
              className="game-panel p-1.5 hover:bg-muted transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Inventory bar with coins and health */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 game-panel p-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Health */}
          <div className="flex items-center gap-1 px-3 py-1 bg-red-500/20 rounded">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="font-bold text-red-500 text-sm">{Math.floor(world.health)}/{MAX_HEALTH}</span>
          </div>

          {/* Coins */}
          <div className="flex items-center gap-1 px-3 py-1 bg-amber-400/20 rounded">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-400 text-sm">{world.coins}</span>
          </div>
          
          <div className="w-px h-8 bg-border" />
          
          {/* Inventory slots */}
          <div className="flex gap-1">
            {world.inventory.slice(0, 12).map((slot, i) => {
              const resource = getResource(slot.resourceId);
              return (
                <div
                  key={i}
                  className="w-11 h-11 bg-input rounded flex items-center justify-center relative text-lg"
                  title={resource?.name}
                >
                  {resource && (
                    <>
                      <ResourceIcon icon={resource.icon} iconType={resource.iconType} size="md" />
                      {slot.quantity > 1 && (
                        <span className="absolute bottom-0 right-0.5 text-[10px] font-medium bg-card px-0.5 rounded">
                          {slot.quantity}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Claimed tiles indicator */}
      <div className="absolute bottom-4 left-4 game-panel px-3 py-2 pointer-events-auto">
        <div className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: world.userColor }}
          />
          <span className="text-muted-foreground">{claimedCount} tiles</span>
        </div>
      </div>
    </>
  );
};

export default GameHUD;

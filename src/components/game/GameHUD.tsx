import { GameWorld, Resource } from '@/types/game';
import { Settings, User, Coins } from 'lucide-react';

interface GameHUDProps {
  world: GameWorld;
  resources: Resource[];
  onOpenConfig: () => void;
  onOpenAccount: () => void;
}

const GameHUD = ({ world, resources, onOpenConfig, onOpenAccount }: GameHUDProps) => {
  const getResource = (id: string | null) => resources.find(r => r.id === id);

  const claimedCount = world.map.tiles.flat().filter(t => t.claimedBy === world.userId).length;

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
        <div className="game-panel px-4 py-3 pointer-events-auto">
          <h1 className="font-semibold text-foreground">{world.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>Pos: {world.playerPosition.x}, {world.playerPosition.y}</span>
          </div>
        </div>

        {/* Coins display */}
        <div className="game-panel px-4 py-2 flex items-center gap-2 pointer-events-auto">
          <Coins className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-amber-400">{world.coins}</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button 
            onClick={onOpenAccount} 
            className="game-panel p-2 hover:bg-muted transition-colors flex items-center gap-2"
          >
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: world.userColor }}
            />
            <User className="w-5 h-5" />
          </button>

          <button onClick={onOpenConfig} className="game-panel p-2 hover:bg-muted transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none" style={{ marginLeft: '60px' }}>
        <div className="game-panel px-4 py-2 text-xs text-muted-foreground">
          WASD to move • Click tile to select
        </div>
      </div>

      {/* Inventory bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 game-panel p-2 pointer-events-auto">
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
                    <span>{resource.icon}</span>
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

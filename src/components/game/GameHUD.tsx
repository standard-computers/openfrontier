import { GameWorld, Resource, RARITY_COLORS, USER_COLORS } from '@/types/game';
import { Settings, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameHUDProps {
  world: GameWorld;
  resources: Resource[];
  onOpenConfig: () => void;
  onColorChange: (color: string) => void;
}

const GameHUD = ({ world, resources, onOpenConfig, onColorChange }: GameHUDProps) => {
  const getResource = (id: string | null) => resources.find(r => r.id === id);

  const filledSlots = world.inventory.filter(s => s.resourceId);
  const claimedCount = world.map.tiles.flat().filter(t => t.claimedBy === world.userId).length;

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
        <div className="game-panel px-4 py-3 pointer-events-auto">
          <h1 className="font-semibold text-foreground">{world.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>Pos: {world.playerPosition.x}, {world.playerPosition.y}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: world.userColor }} />
              {claimedCount} tiles claimed
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Color picker */}
          <div className="game-panel p-2 flex items-center gap-1">
            <Palette className="w-4 h-4 text-muted-foreground mr-1" />
            {USER_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={cn(
                  'w-5 h-5 rounded-full transition-transform hover:scale-110',
                  world.userColor === color && 'ring-2 ring-white ring-offset-1 ring-offset-card'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <button onClick={onOpenConfig} className="game-panel p-2 hover:bg-muted transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
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
    </>
  );
};

export default GameHUD;

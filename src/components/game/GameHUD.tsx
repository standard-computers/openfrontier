import { GameWorld, Resource, RARITY_COLORS } from '@/types/game';
import { Package, Settings } from 'lucide-react';

interface GameHUDProps {
  world: GameWorld;
  resources: Resource[];
  onOpenConfig: () => void;
}

const GameHUD = ({ world, resources, onOpenConfig }: GameHUDProps) => {
  const currentTile = world.map.tiles[world.playerPosition.y]?.[world.playerPosition.x];
  const currentResource = currentTile?.resource ? resources.find(r => r.id === currentTile.resource) : null;

  const getResource = (id: string | null) => resources.find(r => r.id === id);

  const filledSlots = world.inventory.filter(s => s.resourceId).slice(0, 10);

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none">
        <div className="game-panel px-4 py-2 pointer-events-auto">
          <h1 className="font-semibold text-foreground">{world.name}</h1>
          <p className="text-xs text-muted-foreground">
            Position: {world.playerPosition.x}, {world.playerPosition.y}
          </p>
        </div>

        <button onClick={onOpenConfig} className="game-panel p-2 pointer-events-auto hover:bg-muted transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Resource tooltip */}
      {currentResource && (
        <div className="absolute top-1/2 left-4 -translate-y-1/2 game-panel px-4 py-3 max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{currentResource.icon}</span>
            <div>
              <p className="font-medium">{currentResource.name}</p>
              <p className={`text-xs ${RARITY_COLORS[currentResource.rarity]}`}>{currentResource.rarity}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{currentResource.description}</p>
          <p className="text-xs text-primary mt-2">Press E to gather</p>
        </div>
      )}

      {/* Inventory bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 game-panel p-2">
        <div className="flex gap-1">
          {world.inventory.slice(0, 10).map((slot, i) => {
            const resource = getResource(slot.resourceId);
            return (
              <div
                key={i}
                className="w-12 h-12 bg-input rounded flex items-center justify-center relative text-lg"
              >
                {resource && (
                  <>
                    <span>{resource.icon}</span>
                    {slot.quantity > 1 && (
                      <span className="absolute bottom-0.5 right-1 text-[10px] font-medium">
                        {slot.quantity}
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">WASD to move • E to gather</p>
      </div>
    </>
  );
};

export default GameHUD;

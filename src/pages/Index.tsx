import { useState } from 'react';
import { useGameWorld } from '@/hooks/useGameWorld';
import GameMap from '@/components/game/GameMap';
import GameHUD from '@/components/game/GameHUD';
import WorldConfig from '@/components/game/WorldConfig';
import { toast } from 'sonner';

const Index = () => {
  const [configOpen, setConfigOpen] = useState(false);
  const {
    world,
    movePlayer,
    gatherResource,
    addResource,
    updateResource,
    deleteResource,
    regenerateWorld,
    respawnResources,
    updateWorldName,
  } = useGameWorld();

  const handleGather = () => {
    const tile = world.map.tiles[world.playerPosition.y][world.playerPosition.x];
    if (tile.resource) {
      const resource = world.resources.find(r => r.id === tile.resource);
      gatherResource();
      if (resource) {
        toast.success(`Gathered ${resource.icon} ${resource.name}`);
      }
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <div className="flex-1 relative">
        <GameMap
          map={world.map}
          playerPosition={world.playerPosition}
          resources={world.resources}
          onMove={movePlayer}
          onGather={handleGather}
        />
        
        <GameHUD
          world={world}
          resources={world.resources}
          onOpenConfig={() => setConfigOpen(true)}
        />
      </div>

      <WorldConfig
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        worldName={world.name}
        resources={world.resources}
        onUpdateWorldName={updateWorldName}
        onAddResource={addResource}
        onUpdateResource={updateResource}
        onDeleteResource={deleteResource}
        onRegenerateWorld={regenerateWorld}
        onRespawnResources={respawnResources}
      />
    </div>
  );
};

export default Index;

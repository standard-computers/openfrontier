import { useState } from 'react';
import { useGameWorld } from '@/hooks/useGameWorld';
import Sidebar from '@/components/game/Sidebar';
import GameMap from '@/components/game/GameMap';
import MapEditor from '@/components/game/MapEditor';
import ResourceManager from '@/components/game/ResourceManager';
import GameSettings from '@/components/game/GameSettings';
import { toast } from 'sonner';

const Index = () => {
  const [activeTab, setActiveTab] = useState('play');
  const {
    world,
    currentMap,
    movePlayer,
    gatherResource,
    updateTile,
    addMap,
    switchMap,
    updateWorldName,
    updateMapName,
    deleteMap,
    addResource,
    updateResource,
    deleteResource,
    resetWorld,
  } = useGameWorld();

  const handleGather = () => {
    const tile = currentMap.tiles[world.playerPosition.y][world.playerPosition.x];
    if (tile.resource) {
      const resource = world.resources.find(r => r.id === tile.resource);
      gatherResource();
      if (resource) {
        toast.success(`Gathered ${resource.icon} ${resource.name}!`);
      }
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar
        world={world}
        resources={world.resources}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 p-6 overflow-auto">
        {activeTab === 'play' && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <GameMap
              map={currentMap}
              playerPosition={world.playerPosition}
              resources={world.resources}
              onMove={movePlayer}
              onGather={handleGather}
            />
            
            {/* Current tile info */}
            {(() => {
              const tile = currentMap.tiles[world.playerPosition.y]?.[world.playerPosition.x];
              const resource = tile?.resource ? world.resources.find(r => r.id === tile.resource) : null;
              return resource ? (
                <div className="pixel-panel p-3 text-center">
                  <p className="text-[10px] font-pixel text-accent">
                    {resource.icon} {resource.name}
                  </p>
                  <p className="text-[8px] font-pixel text-muted-foreground">
                    Press E to gather
                  </p>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {activeTab === 'edit' && (
          <MapEditor
            maps={world.maps}
            currentMapId={world.currentMapId}
            resources={world.resources}
            playerPosition={world.playerPosition}
            onTileUpdate={updateTile}
            onAddMap={addMap}
            onSwitchMap={switchMap}
            onUpdateMapName={updateMapName}
            onDeleteMap={deleteMap}
          />
        )}

        {activeTab === 'resources' && (
          <ResourceManager
            resources={world.resources}
            onAddResource={addResource}
            onUpdateResource={updateResource}
            onDeleteResource={deleteResource}
          />
        )}

        {activeTab === 'settings' && (
          <GameSettings
            world={world}
            onUpdateName={updateWorldName}
            onReset={resetWorld}
          />
        )}
      </main>
    </div>
  );
};

export default Index;

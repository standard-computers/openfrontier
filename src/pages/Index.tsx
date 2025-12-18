import { useState } from 'react';
import { useGameWorld } from '@/hooks/useGameWorld';
import GameMap from '@/components/game/GameMap';
import GameHUD from '@/components/game/GameHUD';
import TileInfoPanel from '@/components/game/TileInfoPanel';
import WorldConfig from '@/components/game/WorldConfig';
import AccountPanel from '@/components/game/AccountPanel';
import { toast } from 'sonner';

const Index = () => {
  const [configOpen, setConfigOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  
  const {
    world,
    selectedTile,
    movePlayer,
    selectTile,
    claimTile,
    gatherFromTile,
    addResource,
    updateResource,
    deleteResource,
    regenerateWorld,
    respawnResources,
    updateWorldName,
    setUserColor,
  } = useGameWorld();

  const selectedTileData = selectedTile 
    ? world.map.tiles[selectedTile.y]?.[selectedTile.x] 
    : null;

  const handleClaim = () => {
    if (selectedTile) {
      const result = claimTile(selectedTile.x, selectedTile.y);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    }
  };

  const handleGather = (resourceId: string) => {
    if (selectedTile) {
      const resource = world.resources.find(r => r.id === resourceId);
      gatherFromTile(selectedTile.x, selectedTile.y, resourceId);
      if (resource) {
        toast.success(`Gathered ${resource.icon} ${resource.name}`);
      }
    }
  };

  const claimedCount = world.map.tiles.flat().filter(t => t.claimedBy === world.userId).length;

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">
      {/* Main map area */}
      <div className="flex-1 relative">
        <GameMap
          map={world.map}
          playerPosition={world.playerPosition}
          resources={world.resources}
          selectedTile={selectedTile}
          userColor={world.userColor}
          userId={world.userId}
          onMove={movePlayer}
          onTileSelect={selectTile}
        />
        
        <GameHUD
          world={world}
          resources={world.resources}
          onOpenConfig={() => setConfigOpen(true)}
          onOpenAccount={() => setAccountOpen(true)}
        />
      </div>

      {/* Tile info panel */}
      {selectedTile && selectedTileData && (
        <div className="absolute right-4 top-20 z-20">
          <TileInfoPanel
            tile={selectedTileData}
            position={selectedTile}
            resources={world.resources}
            userId={world.userId}
            userColor={world.userColor}
            userCoins={world.coins}
            onClose={() => selectTile(selectedTile.x, selectedTile.y)}
            onClaim={handleClaim}
            onGather={handleGather}
          />
        </div>
      )}

      <AccountPanel
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        userColor={world.userColor}
        coins={world.coins}
        claimedTiles={claimedCount}
        onColorChange={setUserColor}
      />

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

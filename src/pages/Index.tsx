import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameWorld, WorldMember } from '@/hooks/useGameWorld';
import { useAuth } from '@/hooks/useAuth';
import { useTouchDevice } from '@/hooks/useTouchDevice';
import GameMap from '@/components/game/GameMap';
import GameHUD from '@/components/game/GameHUD';
import TileInfoPanel from '@/components/game/TileInfoPanel';
import WorldConfig from '@/components/game/WorldConfig';
import AccountPanel from '@/components/game/AccountPanel';
import SovereigntyPanel from '@/components/game/SovereigntyPanel';
import TouchControls from '@/components/game/TouchControls';
import WorldStatsPanel from '@/components/game/WorldStatsPanel';
import CraftingPanel from '@/components/game/CraftingPanel';
import UserProfilePanel from '@/components/game/UserProfilePanel';
import { toast } from 'sonner';

const MIN_TILE_SIZE = 12;
const MAX_TILE_SIZE = 48;
const DEFAULT_TILE_SIZE = 28;

type FacingDirection = 'north' | 'south' | 'east' | 'west';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, username } = useAuth();
  const isTouchDevice = useTouchDevice();
  const [configOpen, setConfigOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [sovereigntyOpen, setSovereigntyOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [craftingOpen, setCraftingOpen] = useState(false);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WorldMember | null>(null);
  const [tileSize, setTileSize] = useState(DEFAULT_TILE_SIZE);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [facingDirection, setFacingDirection] = useState<FacingDirection>('south');
  
  const {
    world,
    selectedTile,
    isOwner,
    members,
    loading: worldLoading,
    movePlayer,
    selectTile,
    claimTile,
    gatherFromTile,
    addResource,
    updateResource,
    deleteResource,
    respawnResources,
    updateWorldName,
    setUserColor,
    craftResource,
    consumeResource,
    createSovereignty,
    updateSovereignty,
    renameTile,
    placeItem,
  } = useGameWorld();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
        const iconDisplay = resource.iconType === 'image' ? '✓' : resource.icon;
        toast.success(`Gathered ${iconDisplay} ${resource.name}`);
      }
    }
  };

  const handleRenameTile = (name: string) => {
    if (selectedTile) {
      renameTile(selectedTile.x, selectedTile.y, name);
    }
  };

  const handleZoom = useCallback((delta: number) => {
    setTileSize(prev => Math.max(MIN_TILE_SIZE, Math.min(MAX_TILE_SIZE, prev + delta)));
  }, []);

  // Handle movement with direction tracking
  const handleMove = useCallback((dx: number, dy: number) => {
    if (dy < 0) setFacingDirection('north');
    else if (dy > 0) setFacingDirection('south');
    else if (dx < 0) setFacingDirection('west');
    else if (dx > 0) setFacingDirection('east');
    movePlayer(dx, dy);
  }, [movePlayer]);

  // Get current selected resource
  const selectedResource = world.inventory[selectedSlot]?.resourceId 
    ? world.resources.find(r => r.id === world.inventory[selectedSlot].resourceId)
    : null;
  
  const canPlaceSelectedItem = !!(selectedResource?.placeable && world.inventory[selectedSlot]?.quantity > 0);

  // Handle placing items
  const handlePlaceItem = useCallback(() => {
    const slot = world.inventory[selectedSlot];
    if (!slot?.resourceId) {
      toast.error('No item selected');
      return;
    }
    
    const result = placeItem(slot.resourceId, facingDirection);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }, [world.inventory, selectedSlot, facingDirection, placeItem]);

  // Handle keyboard input for slot selection and placement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Number keys 1-9, 0, -, = for slots 0-11
      const slotKeys: Record<string, number> = {
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
        '7': 6, '8': 7, '9': 8, '0': 9, '-': 10, '=': 11
      };
      
      if (e.key in slotKeys) {
        e.preventDefault();
        setSelectedSlot(slotKeys[e.key]);
      }
      
      // Q key for placing
      if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        handlePlaceItem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlaceItem]);

  const zoomPercent = Math.round((tileSize / DEFAULT_TILE_SIZE) * 100);

  if (loading || worldLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
          tileSize={tileSize}
          onMove={handleMove}
          onTileSelect={selectTile}
          onZoom={handleZoom}
        />
        
        <GameHUD
          world={world}
          resources={world.resources}
          zoomPercent={zoomPercent}
          username={username}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onOpenConfig={() => setConfigOpen(true)}
          onOpenAccount={() => setAccountOpen(true)}
          onOpenSovereignty={() => setSovereigntyOpen(true)}
          onOpenStats={() => setStatsOpen(true)}
          onOpenCrafting={() => setCraftingOpen(true)}
          onZoom={handleZoom}
          onConsumeResource={consumeResource}
        />

        {isTouchDevice && (
          <TouchControls 
            onMove={handleMove} 
            onPlace={handlePlaceItem}
            canPlace={canPlaceSelectedItem}
          />
        )}
      </div>

      {/* Tile info panel */}
      {selectedTile && selectedTileData && (
        <div className="absolute right-4 top-20 z-20">
          <TileInfoPanel
            tile={selectedTileData}
            position={selectedTile}
            playerPosition={world.playerPosition}
            resources={world.resources}
            userId={world.userId}
            userColor={world.userColor}
            userCoins={world.coins}
            members={members}
            onClose={() => selectTile(selectedTile.x, selectedTile.y)}
            onClaim={handleClaim}
            onGather={handleGather}
            onRename={handleRenameTile}
            onViewUser={(member) => {
              setSelectedMember(member);
              setUserProfileOpen(true);
            }}
          />
        </div>
      )}

      <AccountPanel
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        userColor={world.userColor}
        coins={world.coins}
        claimedTiles={claimedCount}
        username={username}
        onColorChange={setUserColor}
      />

      <SovereigntyPanel
        isOpen={sovereigntyOpen}
        onClose={() => setSovereigntyOpen(false)}
        userColor={world.userColor}
        coins={world.coins}
        claimedTiles={claimedCount}
        username={username}
        sovereignty={world.sovereignty}
        onColorChange={setUserColor}
        onCreateSovereignty={createSovereignty}
        onUpdateSovereignty={updateSovereignty}
      />

      <WorldConfig
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        worldName={world.name}
        joinCode={world.joinCode}
        isOwner={isOwner}
        resources={world.resources}
        userId={world.userId}
        onUpdateWorldName={updateWorldName}
        onAddResource={addResource}
        onUpdateResource={updateResource}
        onDeleteResource={deleteResource}
        onRespawnResources={respawnResources}
      />

      <WorldStatsPanel
        isOpen={statsOpen}
        onClose={() => setStatsOpen(false)}
        world={world}
        resources={world.resources}
        members={members}
        onViewUser={(member) => {
          setSelectedMember(member);
          setUserProfileOpen(true);
        }}
      />

      <CraftingPanel
        isOpen={craftingOpen}
        onClose={() => setCraftingOpen(false)}
        resources={world.resources}
        inventory={world.inventory}
        onCraft={craftResource}
      />

      <UserProfilePanel
        isOpen={userProfileOpen}
        onClose={() => {
          setUserProfileOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        world={world}
      />
    </div>
  );
};

export default Index;

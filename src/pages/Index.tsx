import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameWorld, WorldMember } from '@/hooks/useGameWorld';
import { useAuth } from '@/hooks/useAuth';
import { useTouchDevice } from '@/hooks/useTouchDevice';
import GameMap from '@/components/game/GameMap';
import Minimap from '@/components/game/Minimap';
import GameHUD from '@/components/game/GameHUD';
import TileInfoPanel from '@/components/game/TileInfoPanel';
import MultiTileInfoPanel from '@/components/game/MultiTileInfoPanel';
import WorldConfig from '@/components/game/WorldConfig';
import AccountPanel from '@/components/game/AccountPanel';
import SovereigntyPanel from '@/components/game/SovereigntyPanel';
import TouchControls from '@/components/game/TouchControls';
import WorldStatsPanel from '@/components/game/WorldStatsPanel';
import CraftingPanel from '@/components/game/CraftingPanel';
import UserProfilePanel from '@/components/game/UserProfilePanel';
import ClaimedTilesPanel from '@/components/game/ClaimedTilesPanel';
import MarketplacePanel from '@/components/game/MarketplacePanel';
import { Market, Position, calculateTileValue } from '@/types/game';
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
  const [claimedTilesOpen, setClaimedTilesOpen] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [currentMarket, setCurrentMarket] = useState<Market | null>(null);
  const [selectedMember, setSelectedMember] = useState<WorldMember | null>(null);
  const [tileSize, setTileSize] = useState(DEFAULT_TILE_SIZE);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [facingDirection, setFacingDirection] = useState<FacingDirection>('south');
  const [isMoving, setIsMoving] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState<Position[]>([]);
  
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
    toggleEnableMarkets,
    addMarket,
    removeMarket,
    buyFromMarket,
    sellToMarket,
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

  const handleClaimAll = useCallback(() => {
    let successCount = 0;
    let totalCost = 0;
    
    for (const pos of selectedTiles) {
      const tile = world.map.tiles[pos.y]?.[pos.x];
      if (tile && !tile.claimedBy) {
        const result = claimTile(pos.x, pos.y);
        if (result.success) {
          successCount++;
          totalCost += calculateTileValue(tile, world.resources);
        }
      }
    }
    
    if (successCount > 0) {
      toast.success(`Claimed ${successCount} tiles for ${totalCost} coins!`);
      setSelectedTiles([]);
    } else {
      toast.error('Could not claim any tiles');
    }
  }, [selectedTiles, world.map.tiles, world.resources, claimTile]);

  const handleMultiTileSelect = useCallback((tiles: Position[]) => {
    setSelectedTiles(tiles);
  }, []);

  const handleMultiGather = useCallback((x: number, y: number, resourceId: string) => {
    const resource = world.resources.find(r => r.id === resourceId);
    gatherFromTile(x, y, resourceId);
    if (resource) {
      const iconDisplay = resource.iconType === 'image' ? '✓' : resource.icon;
      toast.success(`Gathered ${iconDisplay} ${resource.name}`);
    }
  }, [world.resources, gatherFromTile]);

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

  // Handle movement with direction tracking and animation
  const handleMove = useCallback((dx: number, dy: number) => {
    if (dy < 0) setFacingDirection('north');
    else if (dy > 0) setFacingDirection('south');
    else if (dx < 0) setFacingDirection('west');
    else if (dx > 0) setFacingDirection('east');
    
    setIsMoving(true);
    movePlayer(dx, dy);
    
    // Stop moving animation after a short delay
    setTimeout(() => setIsMoving(false), 200);
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

  // Check if player is adjacent to and facing a market
  const getAdjacentMarket = useCallback((): Market | null => {
    if (!world.enableMarkets || !world.markets?.length) return null;
    
    const { x, y } = world.playerPosition;
    let targetX = x;
    let targetY = y;
    
    switch (facingDirection) {
      case 'north': targetY -= 1; break;
      case 'south': targetY += 1; break;
      case 'east': targetX += 1; break;
      case 'west': targetX -= 1; break;
    }
    
    // Check if the target tile is a market (1x1)
    for (const market of world.markets) {
      if (targetX === market.position.x && targetY === market.position.y) {
        return market;
      }
    }
    
    return null;
  }, [world.playerPosition, world.enableMarkets, world.markets, facingDirection]);

  // Handle opening marketplace
  const handleOpenMarketplace = useCallback(() => {
    const market = getAdjacentMarket();
    if (market) {
      setCurrentMarket(market);
      setMarketplaceOpen(true);
    } else {
      // If not near a market, use Q for placing items instead
      handlePlaceItem();
    }
  }, [getAdjacentMarket, handlePlaceItem]);

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
      
      // Q key for marketplace (when adjacent) or placing items
      if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        handleOpenMarketplace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenMarketplace]);

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
          selectedTiles={selectedTiles}
          multiSelectMode={multiSelectMode}
          userColor={world.userColor}
          userId={world.userId}
          tileSize={tileSize}
          markets={world.markets}
          enableMarkets={world.enableMarkets}
          facingDirection={facingDirection}
          isMoving={isMoving}
          onMove={handleMove}
          onTileSelect={selectTile}
          onMultiTileSelect={handleMultiTileSelect}
          onZoom={handleZoom}
        />
        
        <GameHUD
          world={world}
          resources={world.resources}
          zoomPercent={zoomPercent}
          username={username}
          selectedSlot={selectedSlot}
          multiSelectMode={multiSelectMode}
          onSelectSlot={setSelectedSlot}
          onOpenConfig={() => setConfigOpen(true)}
          onOpenAccount={() => setAccountOpen(true)}
          onOpenSovereignty={() => setSovereigntyOpen(true)}
          onOpenStats={() => setStatsOpen(true)}
          onOpenCrafting={() => setCraftingOpen(true)}
          onOpenClaimedTiles={() => setClaimedTilesOpen(true)}
          onZoom={handleZoom}
          onConsumeResource={consumeResource}
          onToggleMultiSelect={() => {
            setMultiSelectMode(prev => !prev);
            setSelectedTiles([]);
          }}
        />

        {/* Minimap */}
        <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
          <Minimap
            map={world.map}
            playerPosition={world.playerPosition}
            userColor={world.userColor}
            userId={world.userId}
            markets={world.markets}
          />
        </div>

        {isTouchDevice && (
          <TouchControls 
            onMove={handleMove} 
            onPlace={handlePlaceItem}
            canPlace={canPlaceSelectedItem}
          />
        )}
      </div>

      {/* Tile info panel - single tile */}
      {selectedTile && selectedTileData && !multiSelectMode && (
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

      {/* Multi-tile info panel */}
      {multiSelectMode && selectedTiles.length > 0 && (
        <div className="absolute right-4 top-20 z-20">
          <MultiTileInfoPanel
            tiles={selectedTiles.map(pos => ({
              tile: world.map.tiles[pos.y][pos.x],
              position: pos,
            }))}
            playerPosition={world.playerPosition}
            resources={world.resources}
            userId={world.userId}
            userColor={world.userColor}
            userCoins={world.coins}
            onClose={() => setSelectedTiles([])}
            onClaimAll={handleClaimAll}
            onGather={handleMultiGather}
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
        enableMarkets={world.enableMarkets}
        onUpdateWorldName={updateWorldName}
        onAddResource={addResource}
        onUpdateResource={updateResource}
        onDeleteResource={deleteResource}
        onRespawnResources={respawnResources}
        onToggleMarkets={toggleEnableMarkets}
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

      <ClaimedTilesPanel
        isOpen={claimedTilesOpen}
        onClose={() => setClaimedTilesOpen(false)}
        world={world}
      />

      <MarketplacePanel
        isOpen={marketplaceOpen}
        onClose={() => {
          setMarketplaceOpen(false);
          setCurrentMarket(null);
        }}
        marketName={currentMarket?.name || 'Marketplace'}
        playerCoins={world.coins}
        inventory={world.inventory}
        resources={world.resources}
        onBuyResource={buyFromMarket}
        onSellResource={sellToMarket}
      />
    </div>
  );
};

export default Index;

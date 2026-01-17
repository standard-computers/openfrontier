import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameWorld, WorldMember } from '@/hooks/useGameWorld';
import { useNPCBehavior } from '@/hooks/useNPCBehavior';
import { useStrangerBehavior } from '@/hooks/useStrangerBehavior';
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
import PlayerRankingPanel from '@/components/game/PlayerRankingPanel';
import StrangerInfoPanel from '@/components/game/StrangerInfoPanel';
import DemoOverlay from '@/components/game/DemoOverlay';
import { useDemoWorld } from '@/hooks/useDemoWorld';
import { Market, Position, calculateTileValue, Sovereignty, Stranger, TILE_TYPES } from '@/types/game';
import { toast } from 'sonner';

const MIN_TILE_SIZE = 12;
const MAX_TILE_SIZE = 64;
const DEFAULT_TILE_SIZE = 39;

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
  const [rankingOpen, setRankingOpen] = useState(false);
  const [currentMarket, setCurrentMarket] = useState<Market | null>(null);
  const [selectedMember, setSelectedMember] = useState<WorldMember | null>(null);
  const [tileSize, setTileSize] = useState(DEFAULT_TILE_SIZE);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [facingDirection, setFacingDirection] = useState<FacingDirection>('south');
  const [isMoving, setIsMoving] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState<Position[]>([]);
  const [cameraPosition, setCameraPosition] = useState<Position | null>(null);
  const [selectedStranger, setSelectedStranger] = useState<Stranger | null>(null);
  
  // Determine if we're in demo mode (not logged in)
  const isDemoMode = !loading && !user;
  
  // Use demo world when not authenticated
  const demoWorld = useDemoWorld();
  
  // Use real game world when authenticated
  const gameWorld = useGameWorld();
  
  // Select which world data to use
  const {
    world,
    setWorld,
    selectedTile,
    isOwner,
    members,
    loading: worldLoading,
    movePlayer,
    selectTile,
    claimTile,
    claimMultipleTiles,
    gatherFromTile,
    addResource,
    addExistingResource,
    updateResource,
    deleteResource,
    respawnResources,
    updateWorldName,
    setUserColor,
    craftResource,
    consumeResource,
    createSovereignty,
    updateSovereignty,
    createArea,
    deleteArea,
    updateArea,
    renameTile,
    placeItem,
    useItemOnFacingTile,
    toggleEnableMarkets,
    addMarket,
    removeMarket,
    buyFromMarket,
    sellToMarket,
    toggleEnableNpcs,
    updateNpcCount,
    toggleEnableStrangers,
    updateStrangerDensity,
    saveMapData,
  } = isDemoMode ? demoWorld : gameWorld;

  // Build member sovereignty map for stranger allegiance
  const memberSovereignties = useMemo(() => {
    const map = new Map<string, { username: string; sovereignty?: Sovereignty }>();
    if (world.userId && world.sovereignty) {
      map.set(world.userId, { username: username || 'Player', sovereignty: world.sovereignty });
    }
    members.forEach(member => {
      if (member.userId !== world.userId) {
        map.set(member.userId, { username: member.username });
      }
    });
    return map;
  }, [world.userId, world.sovereignty, username, members]);

  // Enable NPC behavior (only in non-demo mode)
  useNPCBehavior({ world, setWorld, saveMapData: isDemoMode ? async () => {} : saveMapData });
  
  // Enable Stranger behavior (only in non-demo mode)
  useStrangerBehavior({ world, setWorld, saveMapData: isDemoMode ? async () => {} : saveMapData, memberSovereignties });

  // Redirect authenticated users to worlds dashboard if no world selected
  useEffect(() => {
    if (!loading && user && !localStorage.getItem('currentWorldId')) {
      navigate('/worlds');
    }
  }, [user, loading, navigate]);

  const selectedTileData = selectedTile 
    ? world.map.tiles[selectedTile.y]?.[selectedTile.x] 
    : null;

  const handleClaim = () => {
    if (isDemoMode) {
      toast.error('Sign up to claim tiles!');
      return;
    }
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
    if (isDemoMode) {
      toast.error('Sign up to claim tiles!');
      return;
    }
    const result = claimMultipleTiles(selectedTiles);
    
    if (result.success) {
      toast.success(result.message);
      setSelectedTiles([]);
    } else {
      toast.error(result.message);
    }
  }, [selectedTiles, claimMultipleTiles, isDemoMode]);

  const handleMultiTileSelect = useCallback((tiles: Position[]) => {
    setSelectedTiles(tiles);
  }, []);

  const handleMultiGather = useCallback((x: number, y: number, resourceId: string) => {
    if (isDemoMode) {
      toast.error('Sign up to gather resources!');
      return;
    }
    const resource = world.resources.find(r => r.id === resourceId);
    gatherFromTile(x, y, resourceId);
    if (resource) {
      const iconDisplay = resource.iconType === 'image' ? '✓' : resource.icon;
      toast.success(`Gathered ${iconDisplay} ${resource.name}`);
    }
  }, [world.resources, gatherFromTile, isDemoMode]);

  const handleGather = (resourceId: string) => {
    if (isDemoMode) {
      toast.error('Sign up to gather resources!');
      return;
    }
    if (selectedTile) {
      const resource = world.resources.find(r => r.id === resourceId);
      gatherFromTile(selectedTile.x, selectedTile.y, resourceId);
      if (resource) {
        const iconDisplay = resource.iconType === 'image' ? '✓' : resource.icon;
        toast.success(`Gathered ${iconDisplay} ${resource.name}`);
      }
    }
  };

  const handleGatherAll = useCallback(() => {
    if (isDemoMode) {
      toast.error('Sign up to gather resources!');
      return;
    }
    if (!selectedTile) {
      toast.error('No tile selected');
      return;
    }
    
    const tile = world.map.tiles[selectedTile.y]?.[selectedTile.x];
    if (!tile) return;
    
    const distance = Math.max(
      Math.abs(selectedTile.x - world.playerPosition.x),
      Math.abs(selectedTile.y - world.playerPosition.y)
    );
    const CLAIM_RADIUS = 6;
    
    if (distance > CLAIM_RADIUS) {
      toast.error(`Too far away (${distance} tiles, max ${CLAIM_RADIUS})`);
      return;
    }
    
    if (tile.claimedBy && tile.claimedBy !== world.userId) {
      toast.error('Cannot gather from another player\'s tile');
      return;
    }
    
    if (tile.resources.length === 0) {
      toast.info('No resources to gather');
      return;
    }
    
    let gatheredCount = 0;
    for (const resourceId of [...tile.resources]) {
      gatherFromTile(selectedTile.x, selectedTile.y, resourceId);
      gatheredCount++;
    }
    
    toast.success(`Gathered ${gatheredCount} resource${gatheredCount > 1 ? 's' : ''}`);
  }, [selectedTile, world.map.tiles, world.playerPosition, world.userId, gatherFromTile, isDemoMode]);

  const handleRenameTile = (name: string) => {
    if (isDemoMode) return;
    if (selectedTile) {
      renameTile(selectedTile.x, selectedTile.y, name);
    }
  };

  const handleZoom = useCallback((delta: number) => {
    setTileSize(prev => Math.max(MIN_TILE_SIZE, Math.min(MAX_TILE_SIZE, prev + delta)));
  }, []);

  const handleMove = useCallback((dx: number, dy: number) => {
    if (dy < 0) setFacingDirection('north');
    else if (dy > 0) setFacingDirection('south');
    else if (dx < 0) setFacingDirection('west');
    else if (dx > 0) setFacingDirection('east');
    
    setIsMoving(true);
    movePlayer(dx, dy);
    setCameraPosition(null);
    
    setTimeout(() => setIsMoving(false), 200);
  }, [movePlayer]);

  const handleNavigateToPosition = useCallback((position: Position) => {
    setCameraPosition(position);
  }, []);

  const handleReturnToPlayer = useCallback(() => {
    setCameraPosition(null);
  }, []);

  const selectedResource = world.inventory[selectedSlot]?.resourceId 
    ? world.resources.find(r => r.id === world.inventory[selectedSlot].resourceId)
    : null;
  
  const canPlaceSelectedItem = !!(selectedResource?.placeable && world.inventory[selectedSlot]?.quantity > 0);
  const canUseSelectedItem = !!(selectedResource?.canInflictDamage && world.inventory[selectedSlot]?.quantity > 0);

  const handlePlaceItem = useCallback(() => {
    if (isDemoMode) {
      toast.error('Sign up to place items!');
      return;
    }
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
  }, [world.inventory, selectedSlot, facingDirection, placeItem, isDemoMode]);

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
    
    for (const market of world.markets) {
      if (targetX === market.position.x && targetY === market.position.y) {
        return market;
      }
    }
    
    return null;
  }, [world.playerPosition, world.enableMarkets, world.markets, facingDirection]);

  const handleOpenMarketplace = useCallback(() => {
    if (isDemoMode) {
      toast.error('Sign up to use the marketplace!');
      return;
    }
    const market = getAdjacentMarket();
    if (market) {
      setCurrentMarket(market);
      setMarketplaceOpen(true);
    } else {
      handlePlaceItem();
    }
  }, [getAdjacentMarket, handlePlaceItem, isDemoMode]);

  const handleRequestStrangerMove = useCallback((strangerId: string) => {
    if (isDemoMode) return;
    setWorld(prev => {
      if (!prev.strangers) return prev;
      
      const strangerIndex = prev.strangers.findIndex(s => s.id === strangerId);
      if (strangerIndex === -1) return prev;
      
      const stranger = prev.strangers[strangerIndex];
      const { x, y } = stranger.position;
      
      const directions = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
      ];
      
      const adjacentTiles = directions
        .map(({ dx, dy }) => ({ x: x + dx, y: y + dy }))
        .filter(pos => {
          if (pos.x < 0 || pos.x >= prev.map.width || pos.y < 0 || pos.y >= prev.map.height) return false;
          const tile = prev.map.tiles[pos.y][pos.x];
          const tileInfo = TILE_TYPES.find(t => t.type === tile.type);
          return tileInfo?.walkable ?? tile.walkable;
        });
      
      if (adjacentTiles.length === 0) {
        toast.error("Stranger has nowhere to move!");
        return prev;
      }
      
      const newPos = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)];
      const updatedStranger = { ...stranger, position: newPos };
      
      const newStrangers = [...prev.strangers];
      newStrangers[strangerIndex] = updatedStranger;
      
      toast.success(`${stranger.name} moved to (${newPos.x}, ${newPos.y})`);
      
      return { ...prev, strangers: newStrangers };
    });
  }, [setWorld, isDemoMode]);

  const handleUseItem = useCallback(() => {
    if (isDemoMode) {
      toast.error('Sign up to use items!');
      return;
    }
    const result = useItemOnFacingTile(selectedSlot, facingDirection);
    if (result.message) {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    }
  }, [useItemOnFacingTile, selectedSlot, facingDirection, isDemoMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      const slotKeys: Record<string, number> = {
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
        '7': 6, '8': 7, '9': 8, '0': 9, '-': 10, '=': 11
      };
      
      if (e.key in slotKeys) {
        e.preventDefault();
        setSelectedSlot(slotKeys[e.key]);
      }
      
      if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        handleOpenMarketplace();
      }
      
      if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        handleGatherAll();
      }
      
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleUseItem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenMarketplace, handleGatherAll, handleUseItem]);

  const zoomPercent = Math.round((tileSize / DEFAULT_TILE_SIZE) * 100);

  if (loading || worldLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const claimedCount = world.map.tiles.flat().filter(t => t.claimedBy === world.userId).length;

  // Build tiles with position data for MultiTileInfoPanel
  const selectedTilesWithData = selectedTiles.map(pos => ({
    tile: world.map.tiles[pos.y]?.[pos.x],
    position: pos
  })).filter(t => t.tile);

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">
      {/* Demo mode overlay with login/signup buttons */}
      {isDemoMode && <DemoOverlay />}
      
      {/* Main map area */}
      <div className="flex-1 relative">
        <GameMap
          map={world.map}
          playerPosition={world.playerPosition}
          cameraPosition={cameraPosition}
          resources={world.resources}
          selectedTile={selectedTile}
          selectedTiles={selectedTiles}
          multiSelectMode={multiSelectMode}
          userColor={world.userColor}
          userId={world.userId}
          tileSize={tileSize}
          markets={world.markets}
          enableMarkets={world.enableMarkets}
          npcs={world.npcs}
          strangers={world.strangers}
          areas={world.areas}
          facingDirection={facingDirection}
          isMoving={isMoving}
          worldCreatedAt={world.createdAt}
          onMove={handleMove}
          onTileSelect={selectTile}
          onMultiTileSelect={handleMultiTileSelect}
          onZoom={handleZoom}
          onStrangerClick={setSelectedStranger}
        />
        
        {/* Only show HUD in non-demo mode */}
        {!isDemoMode && (
          <GameHUD
            world={world}
            resources={world.resources}
            zoomPercent={zoomPercent}
            username={username}
            selectedSlot={selectedSlot}
            multiSelectMode={multiSelectMode}
            members={members}
            cameraOffset={cameraPosition !== null}
            onSelectSlot={setSelectedSlot}
            onOpenConfig={() => setConfigOpen(true)}
            onOpenAccount={() => setAccountOpen(true)}
            onOpenSovereignty={() => setSovereigntyOpen(true)}
            onOpenStats={() => setStatsOpen(true)}
            onOpenCrafting={() => setCraftingOpen(true)}
            onOpenClaimedTiles={() => setClaimedTilesOpen(true)}
            onOpenRanking={() => setRankingOpen(true)}
            onOpenMarketplace={() => setMarketplaceOpen(true)}
            onZoom={handleZoom}
            onConsumeResource={consumeResource}
            onToggleMultiSelect={() => {
              setMultiSelectMode(prev => !prev);
              setSelectedTiles([]);
            }}
            onReturnToPlayer={handleReturnToPlayer}
          />
        )}

        {/* Minimap - show in both modes */}
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
            canUse={canUseSelectedItem}
            onUse={handleUseItem}
          />
        )}
      </div>

      {/* Tile Info Panel - show in both modes */}
      {selectedTileData && !multiSelectMode && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50">
          <TileInfoPanel
            tile={selectedTileData}
            resources={world.resources}
            position={selectedTile!}
            playerPosition={world.playerPosition}
            userId={world.userId}
            userColor={world.userColor}
            userCoins={world.coins}
            members={members}
            onClose={() => selectTile(selectedTile!.x, selectedTile!.y)}
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

      {/* Multi-tile selection panel - only in non-demo mode */}
      {multiSelectMode && selectedTilesWithData.length > 0 && !isDemoMode && (
        <MultiTileInfoPanel
          tiles={selectedTilesWithData}
          playerPosition={world.playerPosition}
          resources={world.resources}
          userId={world.userId}
          userColor={world.userColor}
          userCoins={world.coins}
          onClose={() => {
            setMultiSelectMode(false);
            setSelectedTiles([]);
          }}
          onClaimAll={handleClaimAll}
          onGather={handleMultiGather}
          onCreateArea={createArea}
        />
      )}

      {/* All panels - only in non-demo mode */}
      {!isDemoMode && (
        <>
          <AccountPanel
            isOpen={accountOpen}
            username={username}
            userColor={world.userColor}
            coins={world.coins}
            claimedTiles={claimedCount}
            onColorChange={setUserColor}
            onClose={() => setAccountOpen(false)}
          />

          <SovereigntyPanel
            isOpen={sovereigntyOpen}
            sovereignty={world.sovereignty}
            areas={world.areas || []}
            userColor={world.userColor}
            coins={world.coins}
            claimedTiles={claimedCount}
            username={username}
            onClose={() => setSovereigntyOpen(false)}
            onColorChange={setUserColor}
            onCreateSovereignty={createSovereignty}
            onUpdateSovereignty={updateSovereignty}
            onDeleteArea={deleteArea}
            onUpdateArea={updateArea}
          />

          <WorldConfig
            isOpen={configOpen}
            worldName={world.name}
            joinCode={world.joinCode}
            isOwner={isOwner}
            resources={world.resources}
            userId={world.userId}
            enableMarkets={world.enableMarkets}
            enableNpcs={world.enableNpcs}
            npcCount={world.npcCount}
            enableStrangers={world.enableStrangers}
            strangerDensity={world.strangerDensity}
            mapWidth={world.map.width}
            mapHeight={world.map.height}
            onClose={() => setConfigOpen(false)}
            onUpdateWorldName={updateWorldName}
            onAddResource={addResource}
            onAddExistingResource={addExistingResource}
            onUpdateResource={updateResource}
            onDeleteResource={deleteResource}
            onRespawnResources={respawnResources}
            onToggleMarkets={toggleEnableMarkets}
            onToggleNpcs={toggleEnableNpcs}
            onUpdateNpcCount={updateNpcCount}
            onToggleStrangers={toggleEnableStrangers}
            onUpdateStrangerDensity={updateStrangerDensity}
          />

          <WorldStatsPanel
            isOpen={statsOpen}
            world={world}
            resources={world.resources}
            members={members}
            onClose={() => setStatsOpen(false)}
            onViewUser={(member) => {
              setSelectedMember(member);
              setUserProfileOpen(true);
            }}
            onNavigateToPosition={handleNavigateToPosition}
          />

          <CraftingPanel
            isOpen={craftingOpen}
            resources={world.resources}
            inventory={world.inventory}
            onCraft={craftResource}
            onClose={() => setCraftingOpen(false)}
          />

          <UserProfilePanel
            isOpen={userProfileOpen}
            member={selectedMember}
            world={world}
            onClose={() => {
              setUserProfileOpen(false);
              setSelectedMember(null);
            }}
          />

          <ClaimedTilesPanel
            isOpen={claimedTilesOpen}
            world={world}
            onClose={() => setClaimedTilesOpen(false)}
          />

          <MarketplacePanel
            isOpen={marketplaceOpen}
            marketName={currentMarket?.name || 'Marketplace'}
            playerCoins={world.coins}
            inventory={world.inventory}
            resources={world.resources}
            onBuyResource={buyFromMarket}
            onSellResource={sellToMarket}
            onClose={() => {
              setMarketplaceOpen(false);
              setCurrentMarket(null);
            }}
          />

          <PlayerRankingPanel
            isOpen={rankingOpen}
            world={world}
            resources={world.resources}
            members={members}
            onClose={() => setRankingOpen(false)}
            onViewUser={(member) => {
              setSelectedMember(member);
              setUserProfileOpen(true);
            }}
            onNavigateToPosition={handleNavigateToPosition}
          />

          {selectedStranger && (
            <StrangerInfoPanel
              stranger={selectedStranger}
              onClose={() => setSelectedStranger(null)}
              onRequestMove={handleRequestStrangerMove}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Index;

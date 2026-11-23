// @refresh reset
// World hooks share this page's hook chain; remount after hot updates to avoid stale queues.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameWorld, WorldMember } from '@/hooks/useGameWorld';
import { useNPCBehavior } from '@/hooks/useNPCBehavior';
import { useStrangerBehavior } from '@/hooks/useStrangerBehavior';
import { useAuth } from '@/hooks/useAuth';
import { useTouchDevice } from '@/hooks/useTouchDevice';
import GameMap from '@/components/game/GameMap';
import Minimap from '@/components/game/Minimap';
import GameHUD, { GameTopBar } from '@/components/game/GameHUD';
import TileInfoPanel from '@/components/game/TileInfoPanel';
import MultiTileInfoPanel from '@/components/game/MultiTileInfoPanel';
import WorldConfig from '@/components/game/WorldConfig';
import SovereigntyPanel from '@/components/game/SovereigntyPanel';
import TouchControls from '@/components/game/TouchControls';
import WorldStatsPanel from '@/components/game/WorldStatsPanel';
import CraftingPanel from '@/components/game/CraftingPanel';
import UserProfilePanel from '@/components/game/UserProfilePanel';
import MarketplacePanel from '@/components/game/MarketplacePanel';

import StrangerInfoPanel from '@/components/game/StrangerInfoPanel';
import DemoOverlay from '@/components/game/DemoOverlay';
import { useDemoWorld } from '@/hooks/useDemoWorld';
import { Market, Position, TileType, calculateTileValue, Sovereignty, Stranger, TILE_TYPES } from '@/types/game';
import { toast } from 'sonner';
import { getInventoryDropResource, rearrangeInventory } from '@/lib/inventoryDrag';
import { getSelectionGatherPlan } from '@/lib/selectionGather';
import { getDisperseCount } from '@/lib/inventoryDisperse';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useTileRequests } from '@/hooks/useTileRequests';
import TileRequestsPanel from '@/components/game/TileRequestsPanel';
import { buildCitizenBuildingIndex, countBuildingOccupants, moveCitizenIntoBuilding } from '@/lib/citizenBuildings';

const MIN_TILE_SIZE = 4;
const MAX_TILE_SIZE = 64;
const DEFAULT_TILE_SIZE = 39;
// Below this zoom level, resource/character overlays are hidden for performance
const DETAIL_ZOOM_THRESHOLD = 50;


type FacingDirection = 'north' | 'south' | 'east' | 'west';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, username } = useAuth();
  const isTouchDevice = useTouchDevice();
  const [configOpen, setConfigOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [sovereigntyOpen, setSovereigntyOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [craftingOpen, setCraftingOpen] = useState(false);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  
  const [currentMarket, setCurrentMarket] = useState<Market | null>(null);
  const [selectedMember, setSelectedMember] = useState<WorldMember | null>(null);
  const [tileSize, setTileSize] = useState(DEFAULT_TILE_SIZE);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [disperseRequest, setDisperseRequest] = useState<{ slotIndex: number; name: string; count: number } | null>(null);
  const [facingDirection, setFacingDirection] = useState<FacingDirection>('south');
  const [isMoving, setIsMoving] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [panMode, setPanMode] = useState(false);

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
    worldSovereignties,
    loading: worldLoading,
    movePlayer,
    selectTile,
    selectTileAt,
    claimTile,
    claimMultipleTiles,
    gatherFromTile,
    gatherManyFromTiles,
    isOutsiderGatheringAllowed,
    addResource,
    addExistingResource,
    addExistingResources,
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
    convertTiles,
    placeItem,
    disperseItem,
    useItemOnFacingTile,
    toggleEnableMarkets,
    addMarket,
    removeMarket,
    buyFromMarket,
    sellToMarket,
    toggleEnableNpcs,
    updateNpcCount,
    updateNpcAggression,
    toggleEnableStrangers,
    updateStrangerDensity,
    saveMapData,
    refreshTileNegotiations,
  } = isDemoMode ? demoWorld : gameWorld;
  const tileRequests = useTileRequests(world, !isDemoMode && !worldLoading && world.id !== 'world-default', refreshTileNegotiations);
  useEffect(() => {
    const completed = tileRequests.requests.filter(r => r.status === 'accepted' || r.status === 'expired');
    if (!completed.length) return;
    setWorld(prev => {
      let tiles = prev.map.tiles;
      for (const request of [...completed].reverse()) {
        const tile = tiles[request.tile_y]?.[request.tile_x];
        if (!tile || tile.claimedBy === request.requester_id) continue;
        if (tiles === prev.map.tiles) tiles = [...tiles];
        tiles[request.tile_y] = [...tiles[request.tile_y]];
        tiles[request.tile_y][request.tile_x] = { ...tile, claimedBy: request.requester_id };
      }
      return tiles === prev.map.tiles ? prev : { ...prev, map: { ...prev.map, tiles } };
    });
  }, [tileRequests.requests, setWorld]);

  // Build member sovereignty map for stranger allegiance
  // NPC movement must not rebuild allegiance callbacks and reset the citizen action timer.
  const npcSovereigntyKey = JSON.stringify(world.npcs?.map(npc => [npc.id, npc.name, npc.sovereignty]));
  const memberSovereignties = useMemo(() => {
    const map = new Map<string, { username: string; sovereignty?: Sovereignty }>();
    if (world.userId && world.sovereignty) {
      map.set(world.userId, { username: username || 'Player', sovereignty: world.sovereignty });
    }
    members.forEach(member => {
      if (member.userId !== world.userId) {
        const saved = worldSovereignties.find(s => s.userId === member.userId);
        map.set(member.userId, {
          username: member.username,
          sovereignty: saved ? { name: saved.name, flag: saved.flag, motto: saved.motto, foundedAt: saved.foundedAt, openBorders: saved.openBorders, allowOutsiderGathering: saved.allowOutsiderGathering, taxRate: gameWorld.taxPolicies[member.userId] ?? 0 } : undefined,
        });
      }
    });
    world.npcs?.forEach(npc => map.set(npc.id, { username: npc.name, sovereignty: { ...npc.sovereignty, taxRate: gameWorld.taxPolicies[npc.id] ?? npc.sovereignty.taxRate ?? 10 } }));
    return map;
  }, [world.userId, world.sovereignty, npcSovereigntyKey, username, members, worldSovereignties, gameWorld.taxPolicies]);

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

  const handleConvertTile = useCallback((newType: TileType) => {
    if (isDemoMode) {
      toast.error('Sign up to convert tiles!');
      return;
    }
    if (!selectedTile) return;
    const result = convertTiles([selectedTile], newType);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }, [selectedTile, convertTiles, isDemoMode]);

  const handleConvertTiles = useCallback((newType: TileType) => {
    if (isDemoMode) {
      toast.error('Sign up to convert tiles!');
      return;
    }
    if (selectedTiles.length === 0) return;
    const result = convertTiles(selectedTiles, newType);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }, [selectedTiles, convertTiles, isDemoMode]);

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
    
    if (tile.claimedBy && tile.claimedBy !== world.userId && !isOutsiderGatheringAllowed(tile.claimedBy)) {
      toast.error('Cannot gather from another player\'s tile');
      return;
    }

    if (tile.resources.length === 0) {
      toast.info('No resources to gather');
      return;
    }

    const plan = getSelectionGatherPlan([{ tile, position: selectedTile }], world.userId, isOutsiderGatheringAllowed);
    const gatheredCount = gatherManyFromTiles(plan.gatherable);

    toast.success(`Gathered ${gatheredCount} resource${gatheredCount > 1 ? 's' : ''}`);
  }, [selectedTile, world.map.tiles, world.userId, gatherManyFromTiles, isOutsiderGatheringAllowed, isDemoMode]);

  // Gather one resource at a time across the multi-tile selection.
  // Each press of G grabs the next available gatherable resource, cycling
  // through the selected tiles until all resources are collected.
  const handleMultiGatherStep = useCallback(() => {
    if (isDemoMode) {
      toast.error('Sign up to gather resources!');
      return;
    }
    if (!selectedTiles.length) {
      toast.info('No tiles selected');
      return;
    }

    // Find the first selected tile that still has a gatherable resource.
    for (const pos of selectedTiles) {
      const tile = world.map.tiles[pos.y]?.[pos.x];
      if (!tile) continue;
      if (tile.claimedBy && tile.claimedBy !== world.userId && !isOutsiderGatheringAllowed(tile.claimedBy)) continue;
      // Recover placed resources only on owned tiles.
      const gatherable = tile.resources.find(
        rid => !tile.placedResources?.includes(rid) || tile.claimedBy === world.userId
      );
      if (!gatherable) continue;

      const resource = world.resources.find(r => r.id === gatherable);
      gatherFromTile(pos.x, pos.y, gatherable);
      if (resource) {
        const iconDisplay = resource.iconType === 'image' ? '✓' : resource.icon;
        toast.success(`Gathered ${iconDisplay} ${resource.name}`);
      } else {
        toast.success('Gathered 1 resource');
      }
      return;
    }

    toast.info('No more resources to gather in selection');
  }, [selectedTiles, world.map.tiles, world.userId, world.resources, gatherFromTile, isOutsiderGatheringAllowed, isDemoMode]);

  // Gather everything in the selection at once. Only offered when every
  // selected tile is unclaimed or belongs to this player.
  const handleMultiGatherAll = useCallback(() => {
    if (isDemoMode) {
      toast.error('Sign up to gather resources!');
      return;
    }
    if (!selectedTiles.length) {
      toast.info('No tiles selected');
      return;
    }

    const plan = getSelectionGatherPlan(
      selectedTiles
        .map(pos => ({ tile: world.map.tiles[pos.y]?.[pos.x], position: pos }))
        .filter((t): t is { tile: NonNullable<typeof t.tile>; position: Position } => !!t.tile),
      world.userId,
      isOutsiderGatheringAllowed
    );

    if (!plan.allMineOrUnclaimed) {
      toast.error('Cannot gather from another player\'s tile');
      return;
    }
    if (plan.gatherable.length === 0) {
      toast.info('No resources to gather');
      return;
    }

    const gatheredCount = gatherManyFromTiles(plan.gatherable);
    if (gatheredCount === 0) {
      toast.info('Nothing left to gather');
      return;
    }
    toast.success(`Gathered ${gatheredCount} resource${gatheredCount > 1 ? 's' : ''}`);
  }, [selectedTiles, world.map.tiles, world.userId, gatherManyFromTiles, isDemoMode]);

  const handleRenameTile = (name: string) => {
    if (isDemoMode) return;
    if (selectedTile) {
      renameTile(selectedTile.x, selectedTile.y, name);
    }
  };

  const handleZoom = useCallback((delta: number) => {
    setTileSize(prev => Math.max(MIN_TILE_SIZE, Math.min(MAX_TILE_SIZE, prev + delta)));
  }, []);

  // Third-person: movement pans the camera freely across the world
  const handleMove = useCallback((dx: number, dy: number) => {
    if (dy < 0) setFacingDirection('north');
    else if (dy > 0) setFacingDirection('south');
    else if (dx < 0) setFacingDirection('west');
    else if (dx > 0) setFacingDirection('east');

    setCameraPosition(prev => {
      const base = prev ?? world.playerPosition;
      return {
        x: Math.max(0, Math.min(world.map.width - 1, base.x + dx)),
        y: Math.max(0, Math.min(world.map.height - 1, base.y + dy)),
      };
    });
  }, [world.playerPosition, world.map.width, world.map.height]);

  const handleNavigateToPosition = useCallback((position: Position) => {
    setCameraPosition(position);
  }, []);

  // Drag-pan the camera by a tile delta
  const handlePan = useCallback((dx: number, dy: number) => {
    setCameraPosition(prev => {
      const base = prev ?? world.playerPosition;
      return {
        x: Math.max(0, Math.min(world.map.width - 1, base.x + dx)),
        y: Math.max(0, Math.min(world.map.height - 1, base.y + dy)),
      };
    });
  }, [world.playerPosition, world.map.width, world.map.height]);


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
    if (!selectedTile) {
      toast.error('Select a tile first');
      return;
    }
    
    const result = placeItem(slot.resourceId, facingDirection, selectedTile);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }, [world.inventory, selectedSlot, facingDirection, selectedTile, placeItem, isDemoMode]);

  // Market on the currently selected tile
  const handleInventoryDrop = useCallback((slotIndex: number, position: Position) => {
    if (isDemoMode) return;
    const resource = getInventoryDropResource(world, slotIndex, position);
    if (!resource) {
      toast.error('Place inventory items on tiles you own');
      return;
    }
    setSelectedSlot(slotIndex);
    const result = placeItem(resource.id, facingDirection, position);
    if (result.success) {
      toast.success(result.message);
      // Open the tile panel on the tile that just changed so it can be edited.
      selectTileAt(position.x, position.y);
    } else if (result.message) toast.error(result.message);
  }, [world, isDemoMode, placeItem, facingDirection, selectTileAt]);

  // Market on the currently selected tile
  const getAdjacentMarket = useCallback((): Market | null => {
    if (!world.enableMarkets || !world.markets?.length || !selectedTile) return null;
    
    for (const market of world.markets) {
      if (selectedTile.x === market.position.x && selectedTile.y === market.position.y) {
        return market;
      }
    }
    
    return null;
  }, [world.enableMarkets, world.markets, selectedTile]);

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
      const buildings = buildCitizenBuildingIndex(prev.map, prev.resources);
      const occupants = countBuildingOccupants(prev.strangers);
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
          const onOwnLand = stranger.allegiance ? tile.claimedBy === stranger.allegiance.userId : !tile.claimedBy;
          return tile.type !== 'water' && (tileInfo?.walkable ?? tile.walkable) && onOwnLand &&
            moveCitizenIntoBuilding(stranger, pos, buildings, occupants) !== null;
        });
      
      if (adjacentTiles.length === 0) {
        toast.error("Stranger has nowhere to move!");
        return prev;
      }
      
      const newPos = adjacentTiles[Math.floor(Math.random() * adjacentTiles.length)];
      const updatedStranger = moveCitizenIntoBuilding(stranger, newPos, buildings, occupants);
      if (!updatedStranger) return prev;
      
      const newStrangers = [...prev.strangers];
      newStrangers[strangerIndex] = updatedStranger;
      
      toast.success(`${stranger.name} moved to (${newPos.x}, ${newPos.y})`);
      
      return { ...prev, strangers: newStrangers };
    });
  }, [setWorld, isDemoMode]);

  const handleRenameStranger = useCallback((strangerId: string, newName: string) => {
    if (isDemoMode) return;
    setWorld(prev => {
      if (!prev.strangers) return prev;
      const idx = prev.strangers.findIndex(s => s.id === strangerId);
      if (idx === -1) return prev;
      const stranger = prev.strangers[idx];
      if (stranger.allegiance?.userId !== prev.userId) return prev;
      const newStrangers = [...prev.strangers];
      newStrangers[idx] = { ...stranger, name: newName };
      toast.success(`Stranger renamed to ${newName}`);
      return { ...prev, strangers: newStrangers };
    });
    setSelectedStranger(prev => prev && prev.id === strangerId ? { ...prev, name: newName } : prev);
  }, [setWorld, isDemoMode]);

  const handleUseItem = useCallback(() => {
    if (isDemoMode) {
      toast.error('Sign up to use items!');
      return;
    }
    if (!selectedTile && selectedTiles.length === 0) {
      toast.error('Select a tile first');
      return;
    }
    const result = useItemOnFacingTile(
      selectedSlot,
      facingDirection,
      selectedTile ?? selectedTiles[0],
      selectedTiles.length > 0 ? selectedTiles : undefined
    );
    if (result.message) {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    }
  }, [useItemOnFacingTile, selectedSlot, facingDirection, selectedTile, selectedTiles, isDemoMode]);

  const handleToggleMultiSelect = useCallback(() => {
    setMultiSelectMode(prev => {
      if (!prev) {
        setPanMode(false);
        setSelectedTiles([]);
      }
      return !prev;
    });
  }, []);

  const handleTogglePanMode = useCallback(() => {
    setPanMode(prev => {
      if (!prev) {
        setMultiSelectMode(false);
        setSelectedTiles([]);
      }
      return !prev;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        handleTogglePanMode();
      }

      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleToggleMultiSelect();
      }

      
      const slotKeys: Record<string, number> = {
        '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
        '7': 6, '8': 7, '9': 8, '0': 9
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
        if (multiSelectMode && selectedTiles.length > 0) {
          handleMultiGatherStep();
        } else {
          handleGatherAll();
        }
      }
      
      if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleUseItem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleOpenMarketplace, handleGatherAll, handleMultiGatherStep, handleUseItem, handleTogglePanMode, handleToggleMultiSelect, multiSelectMode, selectedTiles]);

  const zoomPercent = Math.round((tileSize / DEFAULT_TILE_SIZE) * 100);

  if (loading || worldLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const claimedCount = sovereigntyOpen ? world.map.tiles.reduce((count, row) => count + row.reduce((owned, tile) => owned + (tile.claimedBy === world.userId ? 1 : 0), 0), 0) : 0;

  // Build tiles with position data for MultiTileInfoPanel
  const selectedTilesWithData = selectedTiles.map(pos => ({
    tile: world.map.tiles[pos.y]?.[pos.x],
    position: pos
  })).filter(t => t.tile);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden relative">
      {/* Demo mode overlay with login/signup buttons */}
      {isDemoMode && <DemoOverlay />}

      {/* Top bar - fixed above the map, only in non-demo mode */}
      {!isDemoMode && (
        <GameTopBar
          world={world}
          resources={world.resources}
          zoomPercent={zoomPercent}
          username={username}
          multiSelectMode={multiSelectMode}
          panMode={panMode}
          members={members}
          onOpenStats={() => setStatsOpen(true)}
          
          onOpenMarketplace={() => setMarketplaceOpen(true)}
          onOpenPlayer={() => setSovereigntyOpen(true)}
          onOpenCrafting={() => setCraftingOpen(true)}
          onOpenConfig={() => setConfigOpen(true)}
          onOpenRequests={() => setRequestsOpen(true)}
          requestCount={tileRequests.actionableCount}
          onZoom={handleZoom}
          onToggleMultiSelect={handleToggleMultiSelect}
          onTogglePanMode={handleTogglePanMode}
        />
      )}

      {/* Main map area */}
      <div className="flex-1 relative min-h-0">
        <GameMap
          map={world.map}
          projectileShot={isDemoMode ? null : gameWorld.projectileShot}
          playerPosition={world.playerPosition}
          cameraPosition={cameraPosition}
          resources={world.resources}
          selectedTile={selectedTile}
          selectedTiles={selectedTiles}
          multiSelectMode={multiSelectMode}
          panMode={panMode}
          showDetails={zoomPercent >= DETAIL_ZOOM_THRESHOLD}
          onPan={handlePan}

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
          onInventoryDrop={isDemoMode ? undefined : handleInventoryDrop}
        />
        
        {/* Only show HUD in non-demo mode */}
        {!isDemoMode && (
          <GameHUD
            world={world}
            tileSize={tileSize}
            resources={world.resources}
            selectedSlot={selectedSlot}
            cameraOffset={cameraPosition !== null}
            onSelectSlot={setSelectedSlot}
            onMoveSlot={(source, destination) => {
              setWorld(prev => ({ ...prev, inventory: rearrangeInventory(prev.inventory, source, destination) }));
              setSelectedSlot(destination);
            }}
            onDisperseSlot={(index) => {
              const slot = world.inventory[index];
              const resource = world.resources.find(r => r.id === slot?.resourceId);
              if (!slot || !resource) return;
              if (!resource.placeable) { toast.error('This item cannot be placed'); return; }
              const count = getDisperseCount(slot, world.map.tiles, world.userId);
              if (count === 0) { toast.error('No empty owned tiles to place on'); return; }
              setDisperseRequest({ slotIndex: index, name: resource.name, count });
            }}
            onConsumeResource={consumeResource}
            onReturnToPlayer={handleReturnToPlayer}
          />
        )}
        <AlertDialog open={!!disperseRequest} onOpenChange={open => !open && setDisperseRequest(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disperse {disperseRequest?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Place 1 {disperseRequest?.name} on each of {disperseRequest?.count.toLocaleString()} empty owned tiles.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (!disperseRequest) return;
                const result = disperseItem(disperseRequest.slotIndex);
                if (result.success) toast.success(result.message); else if (result.message) toast.error(result.message);
                setDisperseRequest(null);
              }}>Disperse</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
      {selectedTileData && selectedTile && !multiSelectMode && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50">
          <TileInfoPanel
            key={`${selectedTile.x},${selectedTile.y}`}
            tile={selectedTileData}
            resources={world.resources}
            position={selectedTile}
            playerPosition={world.playerPosition}
            userId={world.userId}
            userColor={world.userColor}
            userCoins={world.coins}
            members={members}
            citizens={world.strangers}
            onViewCitizen={setSelectedStranger}
            onClose={() => selectTile(selectedTile.x, selectedTile.y)}
            onOffer={!isDemoMode ? amount => void tileRequests.create(selectedTile.x, selectedTile.y, 'offer', amount) : undefined}
            onContest={!isDemoMode ? () => void tileRequests.create(selectedTile.x, selectedTile.y, 'contest') : undefined}
            activeRequest={tileRequests.requests.find(r => r.tile_x === selectedTile.x && r.tile_y === selectedTile.y && ['pending', 'countered', 'conflict'].includes(r.status))}
            requestBusy={tileRequests.busy}
            onClaim={handleClaim}
            onGather={handleGather}
            onRename={handleRenameTile}
            onRotate={!isDemoMode ? (resourceId) => gameWorld.rotateResource(selectedTile.x, selectedTile.y, resourceId) : undefined}
            onShoot={!isDemoMode ? (resourceId) => gameWorld.shootResource(selectedTile.x, selectedTile.y, resourceId) : undefined}
            onToggleAutoFire={!isDemoMode ? (resourceId) => gameWorld.toggleResourceAutoFire(selectedTile.x, selectedTile.y, resourceId) : undefined}
            onConvert={handleConvertTile}
            onViewUser={(member) => {
              setSelectedMember(member);
              setUserProfileOpen(true);
            }}
          />
        </div>
      )}

      {/* Multi-tile selection pane - right side, only in non-demo mode */}
      <TileRequestsPanel open={requestsOpen} onClose={() => setRequestsOpen(false)} world={world} members={members} requests={tileRequests.requests} busy={tileRequests.busy} onRespond={tileRequests.respond} onViewTile={(x, y) => { setRequestsOpen(false); setMultiSelectMode(false); setCameraPosition({ x, y }); selectTile(x, y); }} />
      {multiSelectMode && selectedTilesWithData.length > 0 && !isDemoMode && (
        <div className="absolute right-0 top-0 bottom-0 z-40">
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
          onGatherAll={handleMultiGatherAll}
          onCreateArea={createArea}
          onConvert={handleConvertTiles}
          allowGatherFromOwner={isOutsiderGatheringAllowed}
        />
        </div>
      )}

      {/* All panels - only in non-demo mode */}
      {!isDemoMode && (
        <>
          <SovereigntyPanel
            isOpen={sovereigntyOpen}
            sovereignty={world.sovereignty}
            areas={world.areas || []}
            userColor={world.userColor}
            coins={world.coins}
            claimedTiles={claimedCount}
            tiles={world.map.tiles}
            userId={world.userId}
            population={(world.strangers || []).filter(s => s.allegiance?.userId === world.userId).length}
            username={username}
            onClose={() => setSovereigntyOpen(false)}
            onColorChange={setUserColor}
            onCreateSovereignty={createSovereignty}
            onUpdateSovereignty={updateSovereignty}
            onDeleteArea={deleteArea}
            onUpdateArea={updateArea}
            onSetCapitalArea={gameWorld.setCapitalArea}
            onNavigateToArea={(position) => { setSovereigntyOpen(false); setCameraPosition(position); }}
            npcs={world.npcs}
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
            npcAggression={world.npcAggression}
            enableStrangers={world.enableStrangers}
            strangerDensity={world.strangerDensity}
            mapWidth={world.map.width}
            mapHeight={world.map.height}
            onClose={() => setConfigOpen(false)}
            onUpdateWorldName={updateWorldName}
            onAddResource={addResource}
            onAddExistingResource={addExistingResource}
            onAddExistingResources={addExistingResources}
            onUpdateResource={updateResource}
            onDeleteResource={deleteResource}
            onRespawnResources={respawnResources}
            onToggleMarkets={toggleEnableMarkets}
            onToggleNpcs={toggleEnableNpcs}
            onUpdateNpcCount={updateNpcCount}
            onUpdateNpcAggression={updateNpcAggression}
            onToggleStrangers={toggleEnableStrangers}
            onUpdateStrangerDensity={updateStrangerDensity}
          />

          <WorldStatsPanel
            isOpen={statsOpen}
            world={world}
            resources={world.resources}
            members={members}
            worldSovereignties={worldSovereignties}
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


          {selectedStranger && (
            <StrangerInfoPanel
              stranger={world.strangers?.find(s => s.id === selectedStranger.id) ?? selectedStranger}
              onClose={() => setSelectedStranger(null)}
              onRequestMove={handleRequestStrangerMove}
              canRename={selectedStranger.allegiance?.userId === world.userId}
              onRename={handleRenameStranger}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Index;

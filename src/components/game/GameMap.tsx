import { useEffect, useRef, useMemo, useState, useCallback, memo } from 'react';
import { WorldMap, Position, Resource, TileType, TILE_TYPES, Market, NPC, Area, Stranger } from '@/types/game';
import { cn } from '@/lib/utils';
import ResourceIcon from './ResourceIcon';
import PixelCharacter from './PixelCharacter';
import CanvasTileRenderer from './CanvasTileRenderer';

type FacingDirection = 'north' | 'south' | 'east' | 'west';

interface GameMapProps {
  map: WorldMap;
  playerPosition: Position;
  cameraPosition: Position | null;
  resources: Resource[];
  selectedTile: Position | null;
  selectedTiles: Position[];
  multiSelectMode: boolean;
  userColor: string;
  userId: string;
  tileSize: number;
  markets?: Market[];
  enableMarkets?: boolean;
  npcs?: NPC[];
  strangers?: Stranger[];
  areas?: Area[];
  facingDirection: FacingDirection;
  isMoving: boolean;
  worldCreatedAt?: string;
  onMove: (dx: number, dy: number) => void;
  onTileSelect: (x: number, y: number) => void;
  onMultiTileSelect: (tiles: Position[]) => void;
  onZoom: (delta: number) => void;
  onStrangerClick?: (stranger: Stranger) => void;
}

// Memoized tile component to prevent unnecessary re-renders
const TileOverlay = memo(({
  x,
  y,
  screenX,
  screenY,
  tileSize,
  isPlayerHere,
  isSelected,
  isMultiSelected,
  isInDragSelection,
  isWalkable,
  isClaimed,
  isOwnClaim,
  claimColor,
  borderStyles,
  marketOnTile,
  tileArea,
  displayableResource,
  resourceWidth,
  resourceHeight,
  playerBehindResource,
  isDamaged,
  lifePercent,
  hasLightEmitter,
  isNighttime,
  npcOnTile,
  strangerOnTile,
  hoveredStrangerId,
  facingDirection,
  isMoving,
  userColor,
  onMouseDown,
  onMouseEnter,
  onClick,
  onStrangerHover,
  onStrangerLeave,
  onStrangerClick,
}: {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  tileSize: number;
  isPlayerHere: boolean;
  isSelected: boolean;
  isMultiSelected: boolean;
  isInDragSelection: boolean;
  isWalkable: boolean;
  isClaimed: boolean;
  isOwnClaim: boolean;
  claimColor: string;
  borderStyles: React.CSSProperties;
  marketOnTile: Market | null;
  tileArea: Area | undefined;
  displayableResource: Resource | undefined;
  resourceWidth: number;
  resourceHeight: number;
  playerBehindResource: boolean;
  isDamaged: boolean;
  lifePercent: number;
  hasLightEmitter: boolean;
  isNighttime: boolean;
  npcOnTile: NPC | undefined;
  strangerOnTile: Stranger | undefined;
  hoveredStrangerId: string | null;
  facingDirection: FacingDirection;
  isMoving: boolean;
  userColor: string;
  onMouseDown: () => void;
  onMouseEnter: () => void;
  onClick: () => void;
  onStrangerHover: (stranger: Stranger) => void;
  onStrangerLeave: () => void;
  onStrangerClick: (stranger: Stranger) => void;
}) => {
  let selectionStyle: React.CSSProperties = {};
  if (isSelected) {
    selectionStyle.boxShadow = 'inset 0 0 0 3px #fff';
  } else if (isMultiSelected) {
    selectionStyle.boxShadow = 'inset 0 0 0 2px #3b82f6';
  } else if (isInDragSelection && isWalkable) {
    selectionStyle.boxShadow = 'inset 0 0 0 2px rgba(59, 130, 246, 0.6)';
  }

  const isMultiTileResource = resourceWidth > 1 || resourceHeight > 1;

  return (
    <div
      className={cn(
        'cursor-pointer relative box-border select-none',
        marketOnTile && 'bg-amber-800/80',
        (isInDragSelection || isMultiSelected) && isWalkable && 'bg-blue-500/20'
      )}
      style={{
        gridColumn: screenX + 1,
        gridRow: screenY + 1,
        width: tileSize,
        height: tileSize,
        fontSize: Math.max(10, tileSize * 0.5),
        ...borderStyles,
        ...selectionStyle,
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {/* Area color overlay */}
      {tileArea && (
        <div 
          className="absolute inset-0 pointer-events-none z-5"
          style={{ 
            backgroundColor: tileArea.color,
            opacity: 0.25,
          }}
        />
      )}
      {/* Show market icon */}
      {marketOnTile && (
        <span 
          className="absolute inset-0 flex items-center justify-center drop-shadow-lg z-20"
          style={{ fontSize: Math.max(16, tileSize * 0.8) }}
        >
          🏪
        </span>
      )}
      {/* Show displayable resources */}
      {displayableResource && (
        <div 
          className="absolute flex flex-col items-center drop-shadow-md pointer-events-none"
          style={{ 
            bottom: 0,
            left: 0,
            width: isMultiTileResource ? tileSize * resourceWidth : tileSize,
            height: isMultiTileResource ? tileSize * resourceHeight : tileSize,
            opacity: playerBehindResource ? 0.7 : 1,
            zIndex: 5,
          }}
        >
          {/* Light glow effect */}
          {hasLightEmitter && isNighttime && (
            <div 
              className="absolute rounded-full pointer-events-none"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: tileSize * 5,
                height: tileSize * 5,
                background: 'radial-gradient(circle, rgba(255, 220, 100, 0.45) 0%, rgba(255, 180, 50, 0.2) 35%, rgba(255, 150, 30, 0.08) 60%, transparent 80%)',
                zIndex: -1,
              }}
            />
          )}
          {/* Health bar */}
          {isDamaged && (
            <div 
              className="absolute bg-muted/60 rounded-full overflow-hidden"
              style={{
                top: -4,
                left: '10%',
                right: '10%',
                height: Math.max(3, tileSize * 0.08),
              }}
            >
              <div 
                className={`h-full transition-all duration-200 ${
                  lifePercent > 50 ? 'bg-emerald-400' : 
                  lifePercent > 25 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${lifePercent}%` }}
              />
            </div>
          )}
          <div className="flex items-end justify-start w-full h-full">
            <ResourceIcon 
              icon={displayableResource.icon} 
              iconType={displayableResource.icon.startsWith('http') ? 'image' : 'emoji'}
              size={isMultiTileResource ? 'custom' : 'md'}
              className="drop-shadow-md w-full h-full object-contain"
              style={isMultiTileResource ? {
                fontSize: Math.max(16, tileSize * Math.min(resourceWidth, resourceHeight) * 0.8),
                width: '100%',
                height: '100%',
              } : undefined}
            />
          </div>
        </div>
      )}
      {/* Player character */}
      {isPlayerHere && (
        <div 
          className="absolute z-20 flex items-end justify-center pointer-events-none"
          style={{
            left: 0,
            right: 0,
            bottom: 0,
            height: tileSize * 2,
          }}
        >
          <PixelCharacter 
            direction={facingDirection} 
            isMoving={isMoving} 
            size={tileSize} 
            userColor={userColor}
          />
        </div>
      )}
      {/* NPC character */}
      {npcOnTile && !isPlayerHere && (
        <div 
          className="absolute z-15 flex items-end justify-center pointer-events-none"
          style={{
            left: 0,
            right: 0,
            bottom: 0,
            height: tileSize * 2,
          }}
        >
          <PixelCharacter 
            direction="south" 
            isMoving={false} 
            size={tileSize} 
            userColor={npcOnTile.color}
          />
        </div>
      )}
      {/* Stranger on tile */}
      {strangerOnTile && !isPlayerHere && !npcOnTile && (
        <div 
          className="absolute z-14 flex items-end justify-center cursor-pointer group"
          style={{
            left: 0,
            right: 0,
            bottom: 0,
            height: tileSize * 2,
          }}
          onMouseEnter={() => onStrangerHover(strangerOnTile)}
          onMouseLeave={onStrangerLeave}
          onClick={(e) => {
            e.stopPropagation();
            onStrangerClick(strangerOnTile);
          }}
        >
          <div className="opacity-80 group-hover:opacity-100 transition-opacity">
            <PixelCharacter 
              direction="south" 
              isMoving={false} 
              size={tileSize} 
              userColor={strangerOnTile.color}
            />
          </div>
          {hoveredStrangerId === strangerOnTile.id && (
            <div 
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-card/95 border border-border rounded shadow-lg text-xs whitespace-nowrap z-50 pointer-events-none"
              style={{ minWidth: '120px' }}
            >
              <div className="font-medium text-foreground text-center">{strangerOnTile.name}</div>
              <div className="text-muted-foreground text-center mt-0.5">
                {strangerOnTile.allegiance ? (
                  <span className="flex items-center justify-center gap-1">
                    <span>{strangerOnTile.allegiance.sovereigntyFlag}</span>
                    <span>{strangerOnTile.allegiance.sovereigntyName}</span>
                  </span>
                ) : (
                  <span className="italic">No Allegiance</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Claim indicator */}
      {isClaimed && !isPlayerHere && !npcOnTile && (
        <div 
          className="absolute top-0.5 right-0.5 rounded-full"
          style={{ 
            backgroundColor: claimColor,
            width: Math.max(4, tileSize * 0.15),
            height: Math.max(4, tileSize * 0.15),
          }}
        />
      )}
    </div>
  );
});

TileOverlay.displayName = 'TileOverlay';

const GameMap = ({
  map,
  playerPosition,
  cameraPosition,
  resources,
  selectedTile,
  selectedTiles,
  multiSelectMode,
  userColor,
  userId,
  tileSize,
  markets = [],
  enableMarkets = false,
  npcs = [],
  strangers = [],
  areas = [],
  facingDirection,
  isMoving,
  worldCreatedAt,
  onMove,
  onTileSelect,
  onMultiTileSelect,
  onZoom,
  onStrangerClick,
}: GameMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ tilesX: 30, tilesY: 20 });
  const [dragStart, setDragStart] = useState<Position | null>(null);
  const [dragEnd, setDragEnd] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredStranger, setHoveredStranger] = useState<Stranger | null>(null);
  
  // Calculate game hour based on world creation time
  const [gameHour, setGameHour] = useState(() => {
    if (!worldCreatedAt) return 12;
    const createdAt = new Date(worldCreatedAt).getTime();
    const elapsedMs = Date.now() - createdAt;
    const totalGameHours = (elapsedMs / 3600000) * 24;
    return Math.floor(totalGameHours % 24);
  });

  // Update game time every 2.5 seconds
  useEffect(() => {
    if (!worldCreatedAt) return;
    
    const updateGameTime = () => {
      const createdAt = new Date(worldCreatedAt).getTime();
      const elapsedMs = Date.now() - createdAt;
      const totalGameHours = (elapsedMs / 3600000) * 24;
      setGameHour(Math.floor(totalGameHours % 24));
    };
    
    updateGameTime();
    const interval = setInterval(updateGameTime, 2500);
    return () => clearInterval(interval);
  }, [worldCreatedAt]);

  // Time of day overlay
  const timeOfDayOverlay = useMemo(() => {
    if (gameHour >= 0 && gameHour < 5) {
      return { color: 'rgba(10, 20, 50, 0.6)', blend: 'multiply' };
    } else if (gameHour >= 5 && gameHour < 7) {
      const progress = (gameHour - 5) / 2;
      return { color: `rgba(255, 150, 100, ${0.5 - progress * 0.4})`, blend: 'overlay' };
    } else if (gameHour >= 7 && gameHour < 19) {
      return { color: 'rgba(255, 255, 200, 0.05)', blend: 'overlay' };
    } else if (gameHour >= 19 && gameHour < 22) {
      const progress = (gameHour - 19) / 3;
      return { color: `rgba(50, 30, 80, ${0.1 + progress * 0.4})`, blend: 'multiply' };
    } else {
      return { color: 'rgba(10, 20, 50, 0.55)', blend: 'multiply' };
    }
  }, [gameHour]);

  const isNighttime = useMemo(() => gameHour >= 0 && gameHour < 7 || gameHour >= 19, [gameHour]);

  // Create resource lookup map for O(1) access
  const resourceMap = useMemo(() => {
    const map = new Map<string, Resource>();
    for (const r of resources) {
      map.set(r.id, r);
    }
    return map;
  }, [resources]);

  // Create NPC position lookup map
  const npcPositionMap = useMemo(() => {
    const map = new Map<string, NPC>();
    for (const npc of npcs) {
      map.set(`${npc.position.x}-${npc.position.y}`, npc);
    }
    return map;
  }, [npcs]);

  // Create stranger position lookup map
  const strangerPositionMap = useMemo(() => {
    const map = new Map<string, Stranger>();
    for (const s of strangers) {
      map.set(`${s.position.x}-${s.position.y}`, s);
    }
    return map;
  }, [strangers]);

  // Create market position lookup map
  const marketPositionMap = useMemo(() => {
    if (!enableMarkets) return new Map<string, Market>();
    const map = new Map<string, Market>();
    for (const m of markets) {
      map.set(`${m.position.x}-${m.position.y}`, m);
    }
    return map;
  }, [markets, enableMarkets]);

  // Create selected tiles set for O(1) lookup
  const selectedTilesSet = useMemo(() => {
    const set = new Set<string>();
    for (const t of selectedTiles) {
      set.add(`${t.x}-${t.y}`);
    }
    return set;
  }, [selectedTiles]);

  const updateViewport = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setViewportSize({
        tilesX: Math.ceil(rect.width / tileSize) + 1,
        tilesY: Math.ceil(rect.height / tileSize) + 1,
      });
    }
  }, [tileSize]);

  useEffect(() => {
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [updateViewport]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onZoom(e.deltaY > 0 ? -4 : 4);
    }
  }, [onZoom]);

  const getDragSelectedTiles = useCallback((): Position[] => {
    if (!dragStart || !dragEnd) return [];
    const minX = Math.min(dragStart.x, dragEnd.x);
    const maxX = Math.max(dragStart.x, dragEnd.x);
    const minY = Math.min(dragStart.y, dragEnd.y);
    const maxY = Math.max(dragStart.y, dragEnd.y);
    
    const tiles: Position[] = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tile = map.tiles[y]?.[x];
        const tileTypeInfo = TILE_TYPES.find(t => t.type === tile?.type);
        const isWalkable = tileTypeInfo?.walkable ?? tile?.walkable;
        if (tile && isWalkable) {
          tiles.push({ x, y });
        }
      }
    }
    return tiles;
  }, [dragStart, dragEnd, map.tiles]);

  const handleTileMouseDown = useCallback((x: number, y: number) => {
    if (multiSelectMode) {
      setDragStart({ x, y });
      setDragEnd({ x, y });
      setIsDragging(true);
    }
  }, [multiSelectMode]);

  const handleTileMouseEnter = useCallback((x: number, y: number) => {
    if (isDragging && multiSelectMode) {
      setDragEnd({ x, y });
    }
  }, [isDragging, multiSelectMode]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && multiSelectMode) {
      const tiles = getDragSelectedTiles();
      if (tiles.length > 0) {
        onMultiTileSelect(tiles);
      }
      setDragStart(null);
      setDragEnd(null);
      setIsDragging(false);
    }
  }, [isDragging, multiSelectMode, getDragSelectedTiles, onMultiTileSelect]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const isTileInDragSelection = useCallback((x: number, y: number): boolean => {
    if (!dragStart || !dragEnd || !isDragging) return false;
    const minX = Math.min(dragStart.x, dragEnd.x);
    const maxX = Math.max(dragStart.x, dragEnd.x);
    const minY = Math.min(dragStart.y, dragEnd.y);
    const maxY = Math.max(dragStart.y, dragEnd.y);
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }, [dragStart, dragEnd, isDragging]);

  const getAreaForTile = useCallback((x: number, y: number): Area | undefined => {
    return areas.find(area => area.tiles.some(t => t.x === x && t.y === y));
  }, [areas]);

  const centerPosition = cameraPosition || playerPosition;
  
  const viewportOffset = useMemo(() => {
    const offsetX = Math.max(0, Math.min(
      centerPosition.x - Math.floor(viewportSize.tilesX / 2),
      map.width - viewportSize.tilesX
    ));
    const offsetY = Math.max(0, Math.min(
      centerPosition.y - Math.floor(viewportSize.tilesY / 2),
      map.height - viewportSize.tilesY
    ));
    return { x: Math.max(0, offsetX), y: Math.max(0, offsetY) };
  }, [centerPosition, map.width, map.height, viewportSize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          onMove(0, -1);
          break;
        case 's':
        case 'arrowdown':
          onMove(0, 1);
          break;
        case 'a':
        case 'arrowleft':
          onMove(-1, 0);
          break;
        case 'd':
        case 'arrowright':
          onMove(1, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMove]);

  // Compute visible tiles data with all derived properties
  const visibleTilesData = useMemo(() => {
    const endX = Math.min(viewportOffset.x + viewportSize.tilesX, map.width);
    const endY = Math.min(viewportOffset.y + viewportSize.tilesY, map.height);
    
    const result: Array<{
      x: number;
      y: number;
      screenX: number;
      screenY: number;
      tile: typeof map.tiles[0][0];
      isPlayerHere: boolean;
      isSelected: boolean;
      isWalkable: boolean;
      isClaimed: boolean;
      isOwnClaim: boolean;
      claimColor: string;
      borderStyles: React.CSSProperties;
      marketOnTile: Market | null;
      tileArea: Area | undefined;
      displayableResource: Resource | undefined;
      resourceWidth: number;
      resourceHeight: number;
      playerBehindResource: boolean;
      isDamaged: boolean;
      lifePercent: number;
      hasLightEmitter: boolean;
      npcOnTile: NPC | undefined;
      strangerOnTile: Stranger | undefined;
    }> = [];
    
    for (let y = viewportOffset.y; y < endY; y++) {
      for (let x = viewportOffset.x; x < endX; x++) {
        const tile = map.tiles[y]?.[x];
        if (!tile) continue;
        
        const screenX = x - viewportOffset.x;
        const screenY = y - viewportOffset.y;
        const posKey = `${x}-${y}`;
        
        const isPlayerHere = x === playerPosition.x && y === playerPosition.y;
        const isSelected = selectedTile?.x === x && selectedTile?.y === y;
        const tileTypeInfo = TILE_TYPES.find(t => t.type === tile.type);
        const isWalkable = tileTypeInfo?.walkable ?? tile.walkable;
        const isClaimed = !!tile.claimedBy;
        const isOwnClaim = tile.claimedBy === userId;
        
        // Get NPC claim owner
        const npcClaimOwner = tile.claimedBy?.startsWith('npc-') 
          ? npcs.find(npc => npc.id === tile.claimedBy)
          : null;
        
        const claimColor = isOwnClaim 
          ? userColor 
          : npcClaimOwner 
            ? npcClaimOwner.color 
            : '#888';
        
        // Calculate border styles
        let borderStyles: React.CSSProperties = {};
        if (isClaimed && !isSelected && !selectedTilesSet.has(posKey)) {
          const borderWidth = 2;
          const topTile = map.tiles[y - 1]?.[x];
          const bottomTile = map.tiles[y + 1]?.[x];
          const leftTile = map.tiles[y]?.[x - 1];
          const rightTile = map.tiles[y]?.[x + 1];
          
          borderStyles = {
            borderTop: topTile?.claimedBy !== tile.claimedBy ? `${borderWidth}px solid ${claimColor}` : 'none',
            borderBottom: bottomTile?.claimedBy !== tile.claimedBy ? `${borderWidth}px solid ${claimColor}` : 'none',
            borderLeft: leftTile?.claimedBy !== tile.claimedBy ? `${borderWidth}px solid ${claimColor}` : 'none',
            borderRight: rightTile?.claimedBy !== tile.claimedBy ? `${borderWidth}px solid ${claimColor}` : 'none',
          };
        }
        
        const marketOnTile = marketPositionMap.get(posKey) || null;
        const tileArea = getAreaForTile(x, y);
        const npcOnTile = npcPositionMap.get(posKey);
        const strangerOnTile = strangerPositionMap.get(posKey);
        
        // Get displayable resources
        const displayableResources = tile.resources
          .map(resId => resourceMap.get(resId))
          .filter((r): r is Resource => !!(r?.isFloating || r?.display))
          .sort((a, b) => {
            const aSize = (a.tileWidth ?? 1) * (a.tileHeight ?? 1);
            const bSize = (b.tileWidth ?? 1) * (b.tileHeight ?? 1);
            return bSize - aSize;
          });
        
        const displayableResource = displayableResources[0];
        const resourceWidth = displayableResource?.tileWidth ?? 1;
        const resourceHeight = displayableResource?.tileHeight ?? 1;
        
        const playerBehindResource = !!(displayableResource && (
          playerPosition.x >= x && 
          playerPosition.x < x + resourceWidth &&
          playerPosition.y <= y && 
          playerPosition.y > y - resourceHeight
        ));
        
        const resourceLife = displayableResource ? tile.resourceLife?.[displayableResource.id] : undefined;
        const maxLife = displayableResource?.maxLife ?? 100;
        const isDamaged = !!(displayableResource?.destructible && resourceLife !== undefined && resourceLife < maxLife);
        const lifePercent = isDamaged ? (resourceLife! / maxLife) * 100 : 100;
        
        const hasLightEmitter = isNighttime && displayableResources.some(r => r.emitsLight);
        
        result.push({
          x,
          y,
          screenX,
          screenY,
          tile,
          isPlayerHere,
          isSelected,
          isWalkable,
          isClaimed,
          isOwnClaim,
          claimColor,
          borderStyles,
          marketOnTile,
          tileArea,
          displayableResource,
          resourceWidth,
          resourceHeight,
          playerBehindResource,
          isDamaged,
          lifePercent,
          hasLightEmitter,
          npcOnTile,
          strangerOnTile,
        });
      }
    }
    return result;
  }, [
    map.tiles, map.width, map.height,
    viewportOffset, viewportSize,
    playerPosition, selectedTile, userId, userColor,
    resourceMap, npcPositionMap, strangerPositionMap, marketPositionMap, selectedTilesSet,
    npcs, isNighttime, getAreaForTile
  ]);

  const handleStrangerHover = useCallback((stranger: Stranger) => {
    setHoveredStranger(stranger);
  }, []);

  const handleStrangerLeave = useCallback(() => {
    setHoveredStranger(null);
  }, []);

  const handleStrangerClickInternal = useCallback((stranger: Stranger) => {
    onStrangerClick?.(stranger);
  }, [onStrangerClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative"
      tabIndex={0}
      onWheel={handleWheel}
    >
      <CanvasTileRenderer
        map={map}
        viewportOffset={viewportOffset}
        viewportSize={viewportSize}
        tileSize={tileSize}
      />
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${viewportSize.tilesX}, ${tileSize}px)`,
          gridTemplateRows: `repeat(${viewportSize.tilesY}, ${tileSize}px)`,
        }}
      >
        {visibleTilesData.map((data) => {
          const posKey = `${data.x}-${data.y}`;
          const isMultiSelected = selectedTilesSet.has(posKey);
          const isInDragSelection = isTileInDragSelection(data.x, data.y);
          
          return (
            <TileOverlay
              key={posKey}
              x={data.x}
              y={data.y}
              screenX={data.screenX}
              screenY={data.screenY}
              tileSize={tileSize}
              isPlayerHere={data.isPlayerHere}
              isSelected={data.isSelected}
              isMultiSelected={isMultiSelected}
              isInDragSelection={isInDragSelection}
              isWalkable={data.isWalkable}
              isClaimed={data.isClaimed}
              isOwnClaim={data.isOwnClaim}
              claimColor={data.claimColor}
              borderStyles={data.borderStyles}
              marketOnTile={data.marketOnTile}
              tileArea={data.tileArea}
              displayableResource={data.displayableResource}
              resourceWidth={data.resourceWidth}
              resourceHeight={data.resourceHeight}
              playerBehindResource={data.playerBehindResource}
              isDamaged={data.isDamaged}
              lifePercent={data.lifePercent}
              hasLightEmitter={data.hasLightEmitter}
              isNighttime={isNighttime}
              npcOnTile={data.npcOnTile}
              strangerOnTile={data.strangerOnTile}
              hoveredStrangerId={hoveredStranger?.id || null}
              facingDirection={facingDirection}
              isMoving={isMoving}
              userColor={userColor}
              onMouseDown={() => handleTileMouseDown(data.x, data.y)}
              onMouseEnter={() => handleTileMouseEnter(data.x, data.y)}
              onClick={() => {
                if (!multiSelectMode && data.isWalkable && !data.marketOnTile) {
                  onTileSelect(data.x, data.y);
                }
              }}
              onStrangerHover={handleStrangerHover}
              onStrangerLeave={handleStrangerLeave}
              onStrangerClick={handleStrangerClickInternal}
            />
          );
        })}
      </div>
      
      {/* Time of day lighting overlay */}
      <div 
        className="absolute inset-0 pointer-events-none transition-colors duration-[30000ms]"
        style={{
          backgroundColor: timeOfDayOverlay.color,
          mixBlendMode: timeOfDayOverlay.blend as React.CSSProperties['mixBlendMode'],
          zIndex: 40,
        }}
      />
    </div>
  );
};

export default GameMap;

import { useEffect, useRef, useMemo, useState, useCallback, memo } from 'react';
import { WorldMap, Position, Resource, TileType, TILE_TYPES, Market, NPC, Area, Stranger } from '@/types/game';
import { cn } from '@/lib/utils';
import ResourceIcon from './ResourceIcon';
import PixelCharacter from './PixelCharacter';
import CanvasTileRenderer from './CanvasTileRenderer';
import CanvasOverlayRenderer from './CanvasOverlayRenderer';

type FacingDirection = 'north' | 'south' | 'east' | 'west';

interface GameMapProps {
  map: WorldMap;
  playerPosition: Position;
  cameraPosition: Position | null;
  resources: Resource[];
  selectedTile: Position | null;
  selectedTiles: Position[];
  multiSelectMode: boolean;
  panMode?: boolean;
  showDetails?: boolean;
  onPan?: (dx: number, dy: number) => void;

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

// Memoized overlay rendered only for tiles that actually have something on them
// (market, resource, NPC, stranger). Claims/areas/selection are drawn on canvas.
const TileOverlay = memo(({
  screenX,
  screenY,
  tileSize,
  marketOnTile,
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
  onStrangerHover,
  onStrangerLeave,
  onStrangerClick,
}: {
  screenX: number;
  screenY: number;
  tileSize: number;
  marketOnTile: Market | null;
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
  onStrangerHover: (stranger: Stranger) => void;
  onStrangerLeave: () => void;
  onStrangerClick: (stranger: Stranger) => void;
}) => {
  const isMultiTileResource = resourceWidth > 1 || resourceHeight > 1;

  return (
    <div
      className={cn('absolute box-border select-none pointer-events-none', marketOnTile && 'bg-amber-800/80')}
      style={{
        left: screenX * tileSize,
        top: screenY * tileSize,
        width: tileSize,
        height: tileSize,
        fontSize: Math.max(10, tileSize * 0.5),
        zIndex: 4,
      }}
    >
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
                className={`h-full ${
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
      {/* NPC character */}
      {npcOnTile && (
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
      {strangerOnTile && !npcOnTile && (
        <div 
          className="absolute z-14 flex items-end justify-center cursor-pointer group pointer-events-auto"
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
  panMode = false,
  showDetails = true,
  onPan,

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
      const tilesX = Math.ceil(rect.width / tileSize) + 1;
      const tilesY = Math.ceil(rect.height / tileSize) + 1;
      // Only update state when tile counts actually change — avoids re-render
      // loops from mobile address-bar show/hide firing resize continuously
      setViewportSize(prev =>
        prev.tilesX === tilesX && prev.tilesY === tilesY ? prev : { tilesX, tilesY }
      );
    }
  }, [tileSize]);

  useEffect(() => {
    updateViewport();
    let rafId: number | null = null;
    const handleResize = () => {
      // Debounce via rAF to absorb rapid resize events on mobile scroll
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateViewport();
      });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
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
        if (tile) {
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

  // Only tiles that actually need a DOM overlay (market / resource / character).
  // Claims, areas and selection highlights are painted on canvas instead.
  const visibleTilesData = useMemo(() => {
    const endX = Math.min(viewportOffset.x + viewportSize.tilesX, map.width);
    const endY = Math.min(viewportOffset.y + viewportSize.tilesY, map.height);

    const result: Array<{
      x: number;
      y: number;
      screenX: number;
      screenY: number;
      marketOnTile: Market | null;
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

    if (!showDetails) return result;

    const hasMarkets = marketPositionMap.size > 0;
    const hasNpcs = npcPositionMap.size > 0;
    const hasStrangers = strangerPositionMap.size > 0;

    for (let y = viewportOffset.y; y < endY; y++) {
      const row = map.tiles[y];
      if (!row) continue;
      for (let x = viewportOffset.x; x < endX; x++) {
        const tile = row[x];
        if (!tile) continue;

        const hasResources = tile.resources.length > 0;
        if (!hasResources && !hasMarkets && !hasNpcs && !hasStrangers) continue;

        const posKey = `${x}-${y}`;
        const marketOnTile = hasMarkets ? marketPositionMap.get(posKey) || null : null;
        const npcOnTile = hasNpcs ? npcPositionMap.get(posKey) : undefined;
        const strangerOnTile = hasStrangers ? strangerPositionMap.get(posKey) : undefined;

        let displayableResource: Resource | undefined;
        let hasLightEmitter = false;
        if (hasResources) {
          let bestSize = -1;
          for (const resId of tile.resources) {
            const r = resourceMap.get(resId);
            if (!r || !(r.isFloating || r.display)) continue;
            if (isNighttime && r.emitsLight) hasLightEmitter = true;
            const size = (r.tileWidth ?? 1) * (r.tileHeight ?? 1);
            if (size > bestSize) {
              bestSize = size;
              displayableResource = r;
            }
          }
        }

        if (!displayableResource && !marketOnTile && !npcOnTile && !strangerOnTile) continue;

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

        result.push({
          x,
          y,
          screenX: x - viewportOffset.x,
          screenY: y - viewportOffset.y,
          marketOnTile,
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
    viewportOffset, viewportSize, showDetails,
    playerPosition,
    resourceMap, npcPositionMap, strangerPositionMap, marketPositionMap,
    isNighttime
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

  // --- Pan tool: drag the map around ---
  const panOrigin = useRef<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (!panMode) return;
    e.preventDefault();
    panOrigin.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
  }, [panMode]);

  useEffect(() => {
    if (!isPanning) return;
    const handleMove = (e: MouseEvent) => {
      const origin = panOrigin.current;
      if (!origin) return;
      const dx = Math.trunc((origin.x - e.clientX) / tileSize);
      const dy = Math.trunc((origin.y - e.clientY) / tileSize);
      if (dx === 0 && dy === 0) return;
      panOrigin.current = {
        x: origin.x - dx * tileSize,
        y: origin.y - dy * tileSize,
      };
      onPan?.(dx, dy);
    };
    const stop = () => {
      panOrigin.current = null;
      setIsPanning(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stop);
    };
  }, [isPanning, tileSize, onPan]);

  // --- Delegated pointer handling: one set of listeners for the whole map ---
  const tileFromEvent = useCallback((e: React.MouseEvent): Position | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = viewportOffset.x + Math.floor((e.clientX - rect.left) / tileSize);
    const y = viewportOffset.y + Math.floor((e.clientY - rect.top) / tileSize);
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
    return { x, y };
  }, [viewportOffset, tileSize, map.width, map.height]);

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    handlePanStart(e);
    if (!multiSelectMode) return;
    const pos = tileFromEvent(e);
    if (pos) handleTileMouseDown(pos.x, pos.y);
  }, [handlePanStart, multiSelectMode, tileFromEvent, handleTileMouseDown]);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !multiSelectMode) return;
    const pos = tileFromEvent(e);
    if (pos && (pos.x !== dragEnd?.x || pos.y !== dragEnd?.y)) {
      handleTileMouseEnter(pos.x, pos.y);
    }
  }, [isDragging, multiSelectMode, tileFromEvent, dragEnd, handleTileMouseEnter]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (panMode || multiSelectMode) return;
    const pos = tileFromEvent(e);
    if (!pos) return;
    if (marketPositionMap.has(`${pos.x}-${pos.y}`)) return;
    onTileSelect(pos.x, pos.y);
  }, [panMode, multiSelectMode, tileFromEvent, marketPositionMap, onTileSelect]);

  const dragRect = useMemo(() => {
    if (!isDragging || !dragStart || !dragEnd) return null;
    return {
      minX: Math.min(dragStart.x, dragEnd.x),
      maxX: Math.max(dragStart.x, dragEnd.x),
      minY: Math.min(dragStart.y, dragEnd.y),
      maxY: Math.max(dragStart.y, dragEnd.y),
    };
  }, [isDragging, dragStart, dragEnd]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-full overflow-hidden relative",
        panMode ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer"
      )}
      tabIndex={0}
      onWheel={handleWheel}
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleContainerMouseMove}
      onClick={handleContainerClick}
    >

      <CanvasTileRenderer
        map={map}
        viewportOffset={viewportOffset}
        viewportSize={viewportSize}
        tileSize={tileSize}
      />
      <CanvasOverlayRenderer
        map={map}
        viewportOffset={viewportOffset}
        viewportSize={viewportSize}
        tileSize={tileSize}
        userId={userId}
        userColor={userColor}
        npcs={npcs}
        areas={areas}
        selectedTile={selectedTile}
        selectedTilesSet={selectedTilesSet}
        dragRect={dragRect}
      />
      <div className="absolute inset-0 pointer-events-none">
        {visibleTilesData.map((data) => (
          <TileOverlay
            key={`${data.x}-${data.y}`}
            screenX={data.screenX}
            screenY={data.screenY}
            tileSize={tileSize}
            marketOnTile={data.marketOnTile}
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
            onStrangerHover={handleStrangerHover}
            onStrangerLeave={handleStrangerLeave}
            onStrangerClick={handleStrangerClickInternal}
          />
        ))}
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

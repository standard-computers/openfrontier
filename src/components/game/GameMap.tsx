import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { WorldMap, Position, Resource, TileType, TILE_TYPES, Market, NPC, Area } from '@/types/game';
import { cn } from '@/lib/utils';
import ResourceIcon from './ResourceIcon';
import PixelCharacter from './PixelCharacter';
import CanvasTileRenderer from './CanvasTileRenderer';

type FacingDirection = 'north' | 'south' | 'east' | 'west';

interface GameMapProps {
  map: WorldMap;
  playerPosition: Position;
  cameraPosition: Position | null; // null = follow player
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
  areas?: Area[];
  facingDirection: FacingDirection;
  isMoving: boolean;
  onMove: (dx: number, dy: number) => void;
  onTileSelect: (x: number, y: number) => void;
  onMultiTileSelect: (tiles: Position[]) => void;
  onZoom: (delta: number) => void;
}

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
  areas = [],
  facingDirection,
  isMoving,
  onMove,
  onTileSelect,
  onMultiTileSelect,
  onZoom,
}: GameMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ tilesX: 30, tilesY: 20 });
  const [dragStart, setDragStart] = useState<Position | null>(null);
  const [dragEnd, setDragEnd] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Calculate tiles in drag selection
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

  // Calculate if a tile is in the current drag selection
  const isTileInDragSelection = useCallback((x: number, y: number): boolean => {
    if (!dragStart || !dragEnd || !isDragging) return false;
    const minX = Math.min(dragStart.x, dragEnd.x);
    const maxX = Math.max(dragStart.x, dragEnd.x);
    const minY = Math.min(dragStart.y, dragEnd.y);
    const maxY = Math.max(dragStart.y, dragEnd.y);
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }, [dragStart, dragEnd, isDragging]);

  // Check if tile is in selectedTiles array
  const isTileMultiSelected = useCallback((x: number, y: number): boolean => {
    return selectedTiles.some(t => t.x === x && t.y === y);
  }, [selectedTiles]);

  // Get area for a tile position
  const getAreaForTile = useCallback((x: number, y: number): Area | undefined => {
    return areas.find(area => area.tiles.some(t => t.x === x && t.y === y));
  }, [areas]);

  // Use camera position if set, otherwise follow player
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
      // Ignore if typing in an input or textarea
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

  const visibleTiles = useMemo(() => {
    const tiles: { x: number; y: number; tile: typeof map.tiles[0][0] }[] = [];
    const endX = Math.min(viewportOffset.x + viewportSize.tilesX, map.width);
    const endY = Math.min(viewportOffset.y + viewportSize.tilesY, map.height);
    
    for (let y = viewportOffset.y; y < endY; y++) {
      for (let x = viewportOffset.x; x < endX; x++) {
        if (map.tiles[y] && map.tiles[y][x]) {
          tiles.push({ x, y, tile: map.tiles[y][x] });
        }
      }
    }
    return tiles;
  }, [map, viewportOffset, viewportSize]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative"
      tabIndex={0}
      onWheel={handleWheel}
    >
      {/* Canvas-based tile renderer for modern pixel art look */}
      <CanvasTileRenderer
        map={map}
        viewportOffset={viewportOffset}
        viewportSize={viewportSize}
        tileSize={tileSize}
      />
      {/* Interactive overlay grid */}
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${viewportSize.tilesX}, ${tileSize}px)`,
          gridTemplateRows: `repeat(${viewportSize.tilesY}, ${tileSize}px)`,
        }}
      >
        {visibleTiles.map(({ x, y, tile }) => {
          const isPlayerHere = x === playerPosition.x && y === playerPosition.y;
          const isSelected = selectedTile?.x === x && selectedTile?.y === y;
          const isInDragSelection = isTileInDragSelection(x, y);
          const isMultiSelected = isTileMultiSelected(x, y);
          const isClaimed = !!tile.claimedBy;
          const isOwnClaim = tile.claimedBy === userId;
          const screenX = x - viewportOffset.x;
          const screenY = y - viewportOffset.y;
          // Check walkability from TILE_TYPES (source of truth) instead of stored tile data
          const tileTypeInfo = TILE_TYPES.find(t => t.type === tile.type);
          const isWalkable = tileTypeInfo?.walkable ?? tile.walkable;

          // Check if an NPC is on this tile
          const npcOnTile = npcs.find(npc => npc.position.x === x && npc.position.y === y);

          // Get floating resources on this tile
          const floatingResources = tile.resources
            .map(resId => resources.find(r => r.id === resId))
            .filter(r => r?.isFloating);

          // Get the first floating resource for multi-tile rendering
          const primaryFloatingResource = floatingResources[0];
          const resourceWidth = primaryFloatingResource?.tileWidth ?? 1;
          const resourceHeight = primaryFloatingResource?.tileHeight ?? 1;
          const isMultiTileResource = resourceWidth > 1 || resourceHeight > 1;

          // Check if this tile is a market (1x1 building)
          const marketOnTile = enableMarkets ? markets.find(m => 
            x === m.position.x && y === m.position.y
          ) : null;

          // Check if this tile is claimed by an NPC
          const npcClaimOwner = tile.claimedBy?.startsWith('npc-') 
            ? npcs.find(npc => npc.id === tile.claimedBy)
            : null;

          // Check if tile belongs to an area
          const tileArea = getAreaForTile(x, y);

          // Calculate which borders to show for claimed tiles
          // Only show border on edges that don't have an adjacent tile claimed by the same owner
          let borderStyles: React.CSSProperties = {};
          if (isClaimed && !isSelected && !isMultiSelected) {
            const claimColor = isOwnClaim 
              ? userColor 
              : npcClaimOwner 
                ? npcClaimOwner.color 
                : '#888';
            const borderWidth = 2;
            
            // Check adjacent tiles
            const topTile = map.tiles[y - 1]?.[x];
            const bottomTile = map.tiles[y + 1]?.[x];
            const leftTile = map.tiles[y]?.[x - 1];
            const rightTile = map.tiles[y]?.[x + 1];
            
            const showTop = topTile?.claimedBy !== tile.claimedBy;
            const showBottom = bottomTile?.claimedBy !== tile.claimedBy;
            const showLeft = leftTile?.claimedBy !== tile.claimedBy;
            const showRight = rightTile?.claimedBy !== tile.claimedBy;
            
            borderStyles = {
              borderTop: showTop ? `${borderWidth}px solid ${claimColor}` : 'none',
              borderBottom: showBottom ? `${borderWidth}px solid ${claimColor}` : 'none',
              borderLeft: showLeft ? `${borderWidth}px solid ${claimColor}` : 'none',
              borderRight: showRight ? `${borderWidth}px solid ${claimColor}` : 'none',
            };
          }

          // Determine selection visual
          let selectionStyle: React.CSSProperties = {};
          if (isSelected) {
            selectionStyle.boxShadow = 'inset 0 0 0 3px #fff';
          } else if (isMultiSelected) {
            selectionStyle.boxShadow = 'inset 0 0 0 2px #3b82f6';
          } else if (isInDragSelection && isWalkable) {
            selectionStyle.boxShadow = 'inset 0 0 0 2px rgba(59, 130, 246, 0.6)';
          }

          return (
            <div
              key={`${x}-${y}`}
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
              onMouseDown={() => handleTileMouseDown(x, y)}
              onMouseEnter={() => handleTileMouseEnter(x, y)}
              onClick={() => {
                if (!multiSelectMode && isWalkable && !marketOnTile) {
                  onTileSelect(x, y);
                }
              }}
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
              {/* Show floating resources - extends upward and to the right for multi-tile */}
              {floatingResources.length > 0 && !isPlayerHere && primaryFloatingResource && (
                <div 
                  className="absolute flex items-end justify-start drop-shadow-md pointer-events-none z-10"
                  style={{ 
                    // Position at bottom-left of this tile, extend upward and right
                    bottom: 0,
                    left: 0,
                    width: isMultiTileResource ? tileSize * resourceWidth : tileSize,
                    height: isMultiTileResource ? tileSize * resourceHeight : tileSize,
                  }}
                >
                  <ResourceIcon 
                    icon={primaryFloatingResource.icon} 
                    iconType={primaryFloatingResource.icon.startsWith('http') ? 'image' : 'emoji'}
                    size={isMultiTileResource ? 'custom' : 'md'}
                    className="drop-shadow-md w-full h-full object-contain"
                    style={isMultiTileResource ? {
                      fontSize: Math.max(16, tileSize * Math.min(resourceWidth, resourceHeight) * 0.8),
                      width: '100%',
                      height: '100%',
                    } : undefined}
                  />
                </div>
              )}
              {/* Show player character */}
              {isPlayerHere && (
                <div 
                  className="absolute z-20 flex items-end justify-center pointer-events-none"
                  style={{
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: tileSize * 2, // Character spans 2 tiles tall
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
              {/* Show NPC character */}
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
              {/* Show claim indicator */}
              {isClaimed && !isPlayerHere && !npcOnTile && (
                <div 
                  className="absolute top-0.5 right-0.5 rounded-full"
                  style={{ 
                    backgroundColor: isOwnClaim 
                      ? userColor 
                      : npcClaimOwner 
                        ? npcClaimOwner.color 
                        : '#888',
                    width: Math.max(4, tileSize * 0.15),
                    height: Math.max(4, tileSize * 0.15),
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameMap;

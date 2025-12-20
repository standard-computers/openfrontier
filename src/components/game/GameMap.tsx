import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { WorldMap, Position, Resource, TILE_COLORS, TileType, TILE_TYPES, Market } from '@/types/game';
import { cn } from '@/lib/utils';
import ResourceIcon from './ResourceIcon';
import PixelCharacter from './PixelCharacter';

type FacingDirection = 'north' | 'south' | 'east' | 'west';

interface GameMapProps {
  map: WorldMap;
  playerPosition: Position;
  resources: Resource[];
  selectedTile: Position | null;
  userColor: string;
  userId: string;
  tileSize: number;
  markets?: Market[];
  enableMarkets?: boolean;
  facingDirection: FacingDirection;
  isMoving: boolean;
  onMove: (dx: number, dy: number) => void;
  onTileSelect: (x: number, y: number) => void;
  onZoom: (delta: number) => void;
}

const GameMap = ({
  map,
  playerPosition,
  resources,
  selectedTile,
  userColor,
  userId,
  tileSize,
  markets = [],
  enableMarkets = false,
  facingDirection,
  isMoving,
  onMove,
  onTileSelect,
  onZoom,
}: GameMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ tilesX: 30, tilesY: 20 });

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

  const viewportOffset = useMemo(() => {
    const offsetX = Math.max(0, Math.min(
      playerPosition.x - Math.floor(viewportSize.tilesX / 2),
      map.width - viewportSize.tilesX
    ));
    const offsetY = Math.max(0, Math.min(
      playerPosition.y - Math.floor(viewportSize.tilesY / 2),
      map.height - viewportSize.tilesY
    ));
    return { x: Math.max(0, offsetX), y: Math.max(0, offsetY) };
  }, [playerPosition, map.width, map.height, viewportSize]);

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
          const isClaimed = !!tile.claimedBy;
          const isOwnClaim = tile.claimedBy === userId;
          const screenX = x - viewportOffset.x;
          const screenY = y - viewportOffset.y;
          // Check walkability from TILE_TYPES (source of truth) instead of stored tile data
          const tileTypeInfo = TILE_TYPES.find(t => t.type === tile.type);
          const isWalkable = tileTypeInfo?.walkable ?? tile.walkable;

          // Get floating resources on this tile
          const floatingResources = tile.resources
            .map(resId => resources.find(r => r.id === resId))
            .filter(r => r?.isFloating);

          // Check if this tile is a market (1x1 building)
          const marketOnTile = enableMarkets ? markets.find(m => 
            x === m.position.x && y === m.position.y
          ) : null;

          // Calculate which borders to show for claimed tiles
          // Only show border on edges that don't have an adjacent tile claimed by the same owner
          let borderStyles: React.CSSProperties = {};
          if (isClaimed && !isSelected) {
            const claimColor = isOwnClaim ? userColor : '#888';
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

          return (
            <div
              key={`${x}-${y}`}
              className={cn(
                'tile cursor-pointer relative box-border',
                marketOnTile ? 'bg-amber-800' : TILE_COLORS[tile.type],
                !isWalkable && !marketOnTile && 'brightness-75'
              )}
              style={{
                gridColumn: screenX + 1,
                gridRow: screenY + 1,
                width: tileSize,
                height: tileSize,
                fontSize: Math.max(10, tileSize * 0.5),
                boxShadow: isSelected ? 'inset 0 0 0 3px #fff' : undefined,
                ...borderStyles,
              }}
              onClick={() => isWalkable && !marketOnTile && onTileSelect(x, y)}
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
              {/* Show floating resources */}
              {floatingResources.length > 0 && !isPlayerHere && floatingResources[0] && (
                <span 
                  className="absolute inset-0 flex items-center justify-center drop-shadow-md"
                  style={{ fontSize: Math.max(10, tileSize * 0.5) }}
                >
                  <ResourceIcon 
                    icon={floatingResources[0].icon} 
                    iconType={floatingResources[0].icon.startsWith('http') ? 'image' : 'emoji'}
                    size="md"
                    className="drop-shadow-md"
                  />
                </span>
              )}
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
              {isClaimed && !isPlayerHere && (
                <div 
                  className="absolute top-0.5 right-0.5 rounded-full"
                  style={{ 
                    backgroundColor: isOwnClaim ? userColor : '#888',
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

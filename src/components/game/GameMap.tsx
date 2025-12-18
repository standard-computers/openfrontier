import { useEffect, useRef, useMemo, useState } from 'react';
import { WorldMap, Position, Resource, TILE_COLORS, TileType } from '@/types/game';
import { cn } from '@/lib/utils';

interface GameMapProps {
  map: WorldMap;
  playerPosition: Position;
  resources: Resource[];
  selectedTile: Position | null;
  userColor: string;
  userId: string;
  onMove: (dx: number, dy: number) => void;
  onTileSelect: (x: number, y: number) => void;
}

const TILE_SIZE = 28;

const GameMap = ({
  map,
  playerPosition,
  resources,
  selectedTile,
  userColor,
  userId,
  onMove,
  onTileSelect,
}: GameMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ tilesX: 30, tilesY: 20 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setViewportSize({
          tilesX: Math.floor(rect.width / TILE_SIZE),
          tilesY: Math.floor(rect.height / TILE_SIZE),
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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
    >
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${viewportSize.tilesX}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${viewportSize.tilesY}, ${TILE_SIZE}px)`,
        }}
      >
        {visibleTiles.map(({ x, y, tile }) => {
          const isPlayerHere = x === playerPosition.x && y === playerPosition.y;
          const isSelected = selectedTile?.x === x && selectedTile?.y === y;
          const isClaimed = !!tile.claimedBy;
          const isOwnClaim = tile.claimedBy === userId;
          const screenX = x - viewportOffset.x;
          const screenY = y - viewportOffset.y;

          return (
            <div
              key={`${x}-${y}`}
              className={cn(
                'tile text-sm cursor-pointer relative',
                TILE_COLORS[tile.type],
                !tile.walkable && 'brightness-75'
              )}
              style={{
                gridColumn: screenX + 1,
                gridRow: screenY + 1,
                width: TILE_SIZE,
                height: TILE_SIZE,
                boxShadow: isSelected 
                  ? 'inset 0 0 0 3px #fff'
                  : isClaimed 
                    ? `inset 0 0 0 2px ${isOwnClaim ? userColor : '#888'}`
                    : undefined,
              }}
              onClick={() => tile.walkable && onTileSelect(x, y)}
            >
              {isPlayerHere && (
                <span className="text-lg drop-shadow-lg z-10">🧑‍🌾</span>
              )}
              {isClaimed && !isPlayerHere && (
                <div 
                  className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
                  style={{ backgroundColor: isOwnClaim ? userColor : '#888' }}
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

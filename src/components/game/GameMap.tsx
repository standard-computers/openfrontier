import { useEffect, useRef, useMemo } from 'react';
import { WorldMap, Position, Resource, TILE_COLORS, TileType } from '@/types/game';
import { cn } from '@/lib/utils';

interface GameMapProps {
  map: WorldMap;
  playerPosition: Position;
  resources: Resource[];
  onMove: (dx: number, dy: number) => void;
  onGather: () => void;
  editMode?: boolean;
  selectedTool?: TileType | string | null;
  onTileClick?: (x: number, y: number) => void;
}

const TILE_SIZE = 32;
const VIEWPORT_TILES_X = 15;
const VIEWPORT_TILES_Y = 11;

const GameMap = ({
  map,
  playerPosition,
  resources,
  onMove,
  onGather,
  editMode = false,
  selectedTool,
  onTileClick,
}: GameMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate viewport offset to center player
  const viewportOffset = useMemo(() => {
    const offsetX = Math.max(0, Math.min(
      playerPosition.x - Math.floor(VIEWPORT_TILES_X / 2),
      map.width - VIEWPORT_TILES_X
    ));
    const offsetY = Math.max(0, Math.min(
      playerPosition.y - Math.floor(VIEWPORT_TILES_Y / 2),
      map.height - VIEWPORT_TILES_Y
    ));
    return { x: Math.max(0, offsetX), y: Math.max(0, offsetY) };
  }, [playerPosition, map.width, map.height]);

  // Keyboard controls
  useEffect(() => {
    if (editMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
        case 'e':
        case ' ':
          onGather();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMove, onGather, editMode]);

  const getResourceIcon = (resourceId: string) => {
    return resources.find(r => r.id === resourceId)?.icon || '?';
  };

  // Visible tiles
  const visibleTiles = useMemo(() => {
    const tiles: { x: number; y: number; tile: typeof map.tiles[0][0] }[] = [];
    const endX = Math.min(viewportOffset.x + VIEWPORT_TILES_X, map.width);
    const endY = Math.min(viewportOffset.y + VIEWPORT_TILES_Y, map.height);
    
    for (let y = viewportOffset.y; y < endY; y++) {
      for (let x = viewportOffset.x; x < endX; x++) {
        tiles.push({ x, y, tile: map.tiles[y][x] });
      }
    }
    return tiles;
  }, [map, viewportOffset]);

  return (
    <div
      ref={containerRef}
      className="pixel-panel overflow-hidden"
      style={{
        width: VIEWPORT_TILES_X * TILE_SIZE + 4,
        height: VIEWPORT_TILES_Y * TILE_SIZE + 4,
      }}
      tabIndex={0}
    >
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: `repeat(${VIEWPORT_TILES_X}, ${TILE_SIZE}px)`,
          gridTemplateRows: `repeat(${VIEWPORT_TILES_Y}, ${TILE_SIZE}px)`,
        }}
      >
        {visibleTiles.map(({ x, y, tile }) => {
          const isPlayerHere = x === playerPosition.x && y === playerPosition.y;
          const screenX = x - viewportOffset.x;
          const screenY = y - viewportOffset.y;

          return (
            <div
              key={`${x}-${y}`}
              className={cn(
                'tile relative',
                TILE_COLORS[tile.type],
                editMode && 'cursor-pointer hover:brightness-125',
                !tile.walkable && 'opacity-90'
              )}
              style={{
                gridColumn: screenX + 1,
                gridRow: screenY + 1,
              }}
              onClick={() => editMode && onTileClick?.(x, y)}
            >
              {tile.resource && !isPlayerHere && (
                <span className="absolute inset-0 flex items-center justify-center text-lg animate-bob">
                  {getResourceIcon(tile.resource)}
                </span>
              )}
              {isPlayerHere && !editMode && (
                <span className="absolute inset-0 flex items-center justify-center text-xl z-10 drop-shadow-lg">
                  🧑‍🌾
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      {!editMode && (
        <div className="absolute bottom-2 left-2 text-[8px] font-pixel text-foreground/60">
          WASD to move • E to gather
        </div>
      )}
    </div>
  );
};

export default GameMap;

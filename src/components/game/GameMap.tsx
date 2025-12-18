import { useEffect, useRef, useMemo, useState } from 'react';
import { WorldMap, Position, Resource, TILE_COLORS, TileType } from '@/types/game';
import { cn } from '@/lib/utils';

interface GameMapProps {
  map: WorldMap;
  playerPosition: Position;
  resources: Resource[];
  onMove: (dx: number, dy: number) => void;
  onGather: () => void;
  editMode?: boolean;
  selectedTool?: TileType | null;
  onTileClick?: (x: number, y: number) => void;
}

const TILE_SIZE = 28;

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
    if (editMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e', ' '].includes(e.key.toLowerCase())) {
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
          const screenX = x - viewportOffset.x;
          const screenY = y - viewportOffset.y;

          return (
            <div
              key={`${x}-${y}`}
              className={cn(
                'tile text-sm',
                TILE_COLORS[tile.type],
                editMode && 'cursor-crosshair hover:brightness-125',
                !tile.walkable && 'brightness-75'
              )}
              style={{
                gridColumn: screenX + 1,
                gridRow: screenY + 1,
                width: TILE_SIZE,
                height: TILE_SIZE,
              }}
              onClick={() => editMode && onTileClick?.(x, y)}
            >
              {isPlayerHere && !editMode && (
                <span className="text-xl drop-shadow-lg z-10 animate-bounce">🧑‍🌾</span>
              )}
              {tile.resource && !isPlayerHere && (
                <span className="drop-shadow">{getResourceIcon(tile.resource)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameMap;

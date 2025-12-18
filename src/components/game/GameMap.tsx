import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { WorldMap, Position, Resource, TILE_COLORS, TileType } from '@/types/game';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut } from 'lucide-react';

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

const MIN_TILE_SIZE = 12;
const MAX_TILE_SIZE = 48;
const DEFAULT_TILE_SIZE = 28;

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
  const [tileSize, setTileSize] = useState(DEFAULT_TILE_SIZE);
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

  const handleZoom = useCallback((delta: number) => {
    setTileSize(prev => Math.max(MIN_TILE_SIZE, Math.min(MAX_TILE_SIZE, prev + delta)));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      handleZoom(e.deltaY > 0 ? -4 : 4);
    }
  }, [handleZoom]);

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

  const zoomPercent = Math.round((tileSize / DEFAULT_TILE_SIZE) * 100);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative"
      tabIndex={0}
      onWheel={handleWheel}
    >
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1">
        <button
          onClick={() => handleZoom(4)}
          className="game-panel p-2 hover:bg-muted transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="game-panel px-2 py-1 text-xs text-center text-muted-foreground">
          {zoomPercent}%
        </div>
        <button
          onClick={() => handleZoom(-4)}
          className="game-panel p-2 hover:bg-muted transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

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

          return (
            <div
              key={`${x}-${y}`}
              className={cn(
                'tile cursor-pointer relative',
                TILE_COLORS[tile.type],
                !tile.walkable && 'brightness-75'
              )}
              style={{
                gridColumn: screenX + 1,
                gridRow: screenY + 1,
                width: tileSize,
                height: tileSize,
                fontSize: Math.max(10, tileSize * 0.5),
                boxShadow: isSelected 
                  ? 'inset 0 0 0 3px #fff'
                  : isClaimed 
                    ? `inset 0 0 0 2px ${isOwnClaim ? userColor : '#888'}`
                    : undefined,
              }}
              onClick={() => tile.walkable && onTileSelect(x, y)}
            >
              {isPlayerHere && (
                <span className="drop-shadow-lg z-10" style={{ fontSize: Math.max(12, tileSize * 0.65) }}>🧑‍🌾</span>
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

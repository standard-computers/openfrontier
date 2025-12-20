import { useMemo, useState } from 'react';
import { WorldMap, Position, Market } from '@/types/game';
import FullMapModal from './FullMapModal';

interface MinimapProps {
  map: WorldMap;
  playerPosition: Position;
  userColor: string;
  userId: string;
  markets?: Market[];
  size?: number;
}

const TILE_COLORS: Record<string, string> = {
  grass: '#4ade80',
  water: '#3b82f6',
  sand: '#fbbf24',
  stone: '#6b7280',
  dirt: '#92400e',
  forest: '#16a34a',
  snow: '#f1f5f9',
  swamp: '#65a30d',
  lava: '#ef4444',
  ice: '#7dd3fc',
  mountain: '#4b5563',
  jungle: '#15803d',
};

const Minimap = ({ map, playerPosition, userColor, userId, markets = [], size = 120 }: MinimapProps) => {
  const [showFullMap, setShowFullMap] = useState(false);

  const minimapData = useMemo(() => {
    const canvas = document.createElement('canvas');
    const scale = Math.max(1, Math.floor(Math.max(map.width, map.height) / size));
    const scaledWidth = Math.ceil(map.width / scale);
    const scaledHeight = Math.ceil(map.height / scale);
    
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;

    // Draw tiles
    for (let y = 0; y < map.height; y += scale) {
      for (let x = 0; x < map.width; x += scale) {
        const tile = map.tiles[y]?.[x];
        if (tile) {
          // Check if claimed
          if (tile.claimedBy) {
            ctx.fillStyle = tile.claimedBy === userId ? userColor : '#a855f7';
          } else {
            ctx.fillStyle = TILE_COLORS[tile.type] || '#888';
          }
          ctx.fillRect(Math.floor(x / scale), Math.floor(y / scale), 1, 1);
        }
      }
    }

    return {
      dataUrl: canvas.toDataURL(),
      scaledWidth,
      scaledHeight,
      scale,
    };
  }, [map, userId, userColor, size]);

  if (!minimapData) return null;

  const playerX = (playerPosition.x / minimapData.scale);
  const playerY = (playerPosition.y / minimapData.scale);

  return (
    <>
      <div 
        className="game-panel p-1.5 relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
        style={{ width: minimapData.scaledWidth + 12, height: minimapData.scaledHeight + 12 }}
        onClick={() => setShowFullMap(true)}
        title="Click to expand map"
      >
        <div 
          className="relative rounded overflow-hidden"
          style={{ width: minimapData.scaledWidth, height: minimapData.scaledHeight }}
        >
          <img 
            src={minimapData.dataUrl} 
            alt="Minimap"
            className="w-full h-full"
            style={{ imageRendering: 'pixelated' }}
          />
          
          {/* Player indicator */}
          <div 
            className="absolute w-2 h-2 rounded-full border border-background animate-pulse"
            style={{ 
              backgroundColor: userColor,
              left: playerX - 4,
              top: playerY - 4,
              boxShadow: `0 0 4px ${userColor}`,
            }}
          />

          {/* Market indicators */}
          {markets.map((market) => (
            <div
              key={market.id}
              className="absolute w-1.5 h-1.5 bg-amber-400 rounded-sm"
              style={{
                left: (market.position.x + 0.5) / minimapData.scale - 3,
                top: (market.position.y + 0.5) / minimapData.scale - 3,
              }}
            />
          ))}
        </div>
      </div>

      <FullMapModal
        open={showFullMap}
        onOpenChange={setShowFullMap}
        map={map}
        playerPosition={playerPosition}
        userColor={userColor}
        userId={userId}
        markets={markets}
      />
    </>
  );
};

export default Minimap;
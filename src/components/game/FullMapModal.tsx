import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorldMap, Position, Market } from '@/types/game';

interface FullMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  map: WorldMap;
  playerPosition: Position;
  userColor: string;
  userId: string;
  markets?: Market[];
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

interface ClaimedRegion {
  claimedBy: string;
  color: string;
  tiles: { x: number; y: number }[];
}

const FullMapModal = ({ 
  open, 
  onOpenChange, 
  map, 
  playerPosition, 
  userColor, 
  userId, 
  markets = [] 
}: FullMapModalProps) => {
  const mapData = useMemo(() => {
    const maxSize = 600;
    const scale = Math.max(1, Math.ceil(Math.max(map.width, map.height) / maxSize));
    const scaledWidth = Math.ceil(map.width / scale);
    const scaledHeight = Math.ceil(map.height / scale);
    
    const canvas = document.createElement('canvas');
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;

    // Track claimed regions for border drawing
    const claimedTiles: Map<string, { x: number; y: number; claimedBy: string }[]> = new Map();

    // Draw base tiles
    for (let y = 0; y < map.height; y += scale) {
      for (let x = 0; x < map.width; x += scale) {
        const tile = map.tiles[y]?.[x];
        if (tile) {
          ctx.fillStyle = TILE_COLORS[tile.type] || '#888';
          ctx.fillRect(Math.floor(x / scale), Math.floor(y / scale), 1, 1);
          
          // Track claimed tiles
          if (tile.claimedBy) {
            if (!claimedTiles.has(tile.claimedBy)) {
              claimedTiles.set(tile.claimedBy, []);
            }
            claimedTiles.get(tile.claimedBy)!.push({ 
              x: Math.floor(x / scale), 
              y: Math.floor(y / scale), 
              claimedBy: tile.claimedBy 
            });
          }
        }
      }
    }

    // Draw claimed territory outlines
    claimedTiles.forEach((tiles, claimerId) => {
      const color = claimerId === userId ? userColor : '#a855f7';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      
      const tileSet = new Set(tiles.map(t => `${t.x},${t.y}`));
      
      tiles.forEach(({ x, y }) => {
        // Draw border on edges that don't have adjacent claimed tiles from same owner
        if (!tileSet.has(`${x},${y - 1}`)) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 1, y);
          ctx.stroke();
        }
        if (!tileSet.has(`${x},${y + 1}`)) {
          ctx.beginPath();
          ctx.moveTo(x, y + 1);
          ctx.lineTo(x + 1, y + 1);
          ctx.stroke();
        }
        if (!tileSet.has(`${x - 1},${y}`)) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 1);
          ctx.stroke();
        }
        if (!tileSet.has(`${x + 1},${y}`)) {
          ctx.beginPath();
          ctx.moveTo(x + 1, y);
          ctx.lineTo(x + 1, y + 1);
          ctx.stroke();
        }
      });
    });

    return {
      dataUrl: canvas.toDataURL(),
      scaledWidth,
      scaledHeight,
      scale,
    };
  }, [map, userId, userColor]);

  if (!mapData) return null;

  const playerX = playerPosition.x / mapData.scale;
  const playerY = playerPosition.y / mapData.scale;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto">
        <DialogHeader>
          <DialogTitle>World Map</DialogTitle>
        </DialogHeader>
        <div className="relative overflow-auto max-h-[75vh]">
          <div 
            className="relative"
            style={{ width: mapData.scaledWidth, height: mapData.scaledHeight }}
          >
            <img 
              src={mapData.dataUrl} 
              alt="Full Map"
              className="w-full h-full"
              style={{ imageRendering: 'pixelated' }}
            />
            
            {/* Player indicator */}
            <div 
              className="absolute w-3 h-3 rounded-full border-2 border-white animate-pulse"
              style={{ 
                backgroundColor: userColor,
                left: playerX - 6,
                top: playerY - 6,
                boxShadow: `0 0 8px ${userColor}`,
              }}
            />

            {/* Market indicators */}
            {markets.map((market) => (
              <div
                key={market.id}
                className="absolute flex items-center justify-center"
                style={{
                  left: (market.position.x + 0.5) / mapData.scale - 8,
                  top: (market.position.y + 0.5) / mapData.scale - 8,
                  width: 16,
                  height: 16,
                  fontSize: 12,
                }}
                title={market.name}
              >
                🏪
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex gap-4 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded-full border border-white"
              style={{ backgroundColor: userColor }}
            />
            <span>You</span>
          </div>
          <div className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded border-2"
              style={{ borderColor: userColor, backgroundColor: 'transparent' }}
            />
            <span>Your Territory</span>
          </div>
          <div className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded border-2"
              style={{ borderColor: '#a855f7', backgroundColor: 'transparent' }}
            />
            <span>Others' Territory</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🏪</span>
            <span>Market</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullMapModal;

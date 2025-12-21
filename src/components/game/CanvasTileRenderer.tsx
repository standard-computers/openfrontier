import { useRef, useEffect, useMemo, useCallback } from 'react';
import { WorldMap, TileType } from '@/types/game';

interface CanvasTileRendererProps {
  map: WorldMap;
  viewportOffset: { x: number; y: number };
  viewportSize: { tilesX: number; tilesY: number };
  tileSize: number;
}

// Modern pixel art color palette with vibrant colors and lighting
const TILE_PALETTES: Record<TileType, { base: string; light: string; dark: string; accent: string }> = {
  grass: { base: '#4a7c4e', light: '#5fa663', dark: '#3a5f3d', accent: '#6bc96f' },
  water: { base: '#3a8bbc', light: '#5cb8e0', dark: '#2a6a8f', accent: '#7dd4f7' },
  sand: { base: '#d4b483', light: '#e8d4a8', dark: '#b8956a', accent: '#f5e6c3' },
  stone: { base: '#6b7280', light: '#8b95a5', dark: '#4b5563', accent: '#a3adb8' },
  dirt: { base: '#8b6b4d', light: '#a58565', dark: '#6b4d35', accent: '#c9a375' },
  forest: { base: '#2d5a3e', light: '#3d7a52', dark: '#1d4030', accent: '#4d9a66' },
  snow: { base: '#e8f0f5', light: '#ffffff', dark: '#c8d8e0', accent: '#f0f8ff' },
  ice: { base: '#a8d8ea', light: '#c8f0ff', dark: '#88b8d0', accent: '#d8f4ff' },
  swamp: { base: '#4a5a3a', light: '#5a7048', dark: '#3a4830', accent: '#6a8058' },
  lava: { base: '#d44a1a', light: '#ff6b35', dark: '#a83a10', accent: '#ff9050' },
  mountain: { base: '#5a5a6a', light: '#7a7a8a', dark: '#3a3a4a', accent: '#9a9aaa' },
  jungle: { base: '#1a4a2a', light: '#2a6a3a', dark: '#103a1a', accent: '#3a8a4a' },
};

// Noise function for texture variation
const noise = (x: number, y: number, seed: number = 0): number => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
};

// Draw a single tile with modern pixel art style
const drawTile = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: TileType,
  tileSize: number,
  map: WorldMap,
  worldX: number,
  worldY: number
) => {
  const palette = TILE_PALETTES[type];
  const px = x * tileSize;
  const py = y * tileSize;
  
  // Get neighbor types for auto-tiling
  const getNeighbor = (dx: number, dy: number): TileType | null => {
    const tile = map.tiles[worldY + dy]?.[worldX + dx];
    return tile?.type || null;
  };
  
  // Draw base fill
  ctx.fillStyle = palette.base;
  ctx.fillRect(px, py, tileSize, tileSize);
  
  // Pixel size for the 32-bit look (larger pixels = more visible)
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Add texture based on tile type
  for (let py2 = 0; py2 < tileSize; py2 += pixelSize) {
    for (let px2 = 0; px2 < tileSize; px2 += pixelSize) {
      const noiseVal = noise(worldX * 16 + px2, worldY * 16 + py2, type.charCodeAt(0));
      
      if (type === 'grass') {
        // Grass texture with occasional light/dark patches
        if (noiseVal > 0.8) {
          ctx.fillStyle = palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.15) {
          ctx.fillStyle = palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Add grass blade accents
        if (noiseVal > 0.9) {
          ctx.fillStyle = palette.accent;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize / 2);
        }
      } else if (type === 'water') {
        // Animated water look with wave pattern
        const wave = Math.sin((worldX + px2 / tileSize + worldY) * 2) * 0.5 + 0.5;
        if (noiseVal * wave > 0.4) {
          ctx.fillStyle = palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize * 2, pixelSize / 2);
        } else if (noiseVal < 0.2) {
          ctx.fillStyle = palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
      } else if (type === 'sand') {
        // Sandy texture with dots
        if (noiseVal > 0.75) {
          ctx.fillStyle = palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.2) {
          ctx.fillStyle = palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize / 2, pixelSize / 2);
        }
      } else if (type === 'stone' || type === 'mountain') {
        // Rocky texture with cracks and highlights
        if (noiseVal > 0.85) {
          ctx.fillStyle = palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.1) {
          ctx.fillStyle = palette.dark;
          // Draw crack lines
          ctx.fillRect(px + px2, py + py2, pixelSize * 2, pixelSize / 2);
        } else if (noiseVal > 0.6 && noiseVal < 0.65) {
          ctx.fillStyle = palette.accent;
          ctx.fillRect(px + px2, py + py2, pixelSize / 2, pixelSize / 2);
        }
      } else if (type === 'forest' || type === 'jungle') {
        // Dense foliage texture
        if (noiseVal > 0.7) {
          ctx.fillStyle = palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.25) {
          ctx.fillStyle = palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        if (noiseVal > 0.85) {
          ctx.fillStyle = palette.accent;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
      } else if (type === 'snow' || type === 'ice') {
        // Sparkly snow/ice texture
        if (noiseVal > 0.9) {
          ctx.fillStyle = palette.accent;
          ctx.fillRect(px + px2, py + py2, pixelSize / 2, pixelSize / 2);
        } else if (noiseVal < 0.15) {
          ctx.fillStyle = palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
      } else if (type === 'dirt') {
        // Earthy texture
        if (noiseVal > 0.8) {
          ctx.fillStyle = palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.2) {
          ctx.fillStyle = palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
      } else if (type === 'swamp') {
        // Murky swamp texture
        if (noiseVal > 0.7) {
          ctx.fillStyle = palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.3) {
          ctx.fillStyle = palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize * 1.5, pixelSize);
        }
      } else if (type === 'lava') {
        // Glowing lava texture
        if (noiseVal > 0.6) {
          ctx.fillStyle = palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal > 0.8) {
          ctx.fillStyle = palette.accent;
          ctx.fillRect(px + px2, py + py2, pixelSize * 2, pixelSize);
        } else if (noiseVal < 0.15) {
          ctx.fillStyle = palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
      }
    }
  }
  
  // Draw corner blending with adjacent tiles
  const cornerSize = Math.max(pixelSize * 2, tileSize / 8);
  
  // Get adjacent tile types
  const top = getNeighbor(0, -1);
  const bottom = getNeighbor(0, 1);
  const left = getNeighbor(-1, 0);
  const right = getNeighbor(1, 0);
  const topLeft = getNeighbor(-1, -1);
  const topRight = getNeighbor(1, -1);
  const bottomLeft = getNeighbor(-1, 1);
  const bottomRight = getNeighbor(1, 1);
  
  // Helper to draw corner transition
  const drawCornerTransition = (
    cornerX: number,
    cornerY: number,
    neighborType: TileType | null,
    corner: 'tl' | 'tr' | 'bl' | 'br'
  ) => {
    if (!neighborType || neighborType === type) return;
    
    const neighborPalette = TILE_PALETTES[neighborType];
    if (!neighborPalette) return;
    
    // Draw a small corner blend
    const blendSize = cornerSize;
    
    ctx.fillStyle = neighborPalette.base;
    
    // Draw triangular corner blend
    ctx.beginPath();
    switch (corner) {
      case 'tl':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX + blendSize, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY + blendSize);
        break;
      case 'tr':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX - blendSize, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY + blendSize);
        break;
      case 'bl':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX + blendSize, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY - blendSize);
        break;
      case 'br':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX - blendSize, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY - blendSize);
        break;
    }
    ctx.closePath();
    ctx.fill();
  };
  
  // Draw edge transitions
  const drawEdgeTransition = (
    edge: 'top' | 'bottom' | 'left' | 'right',
    neighborType: TileType | null
  ) => {
    if (!neighborType || neighborType === type) return;
    
    const neighborPalette = TILE_PALETTES[neighborType];
    if (!neighborPalette) return;
    
    const edgeSize = pixelSize * 2;
    
    // Draw pixelated edge blend
    for (let i = 0; i < tileSize; i += pixelSize) {
      const noiseVal = noise(worldX * 100 + i, worldY * 100 + i, edge.charCodeAt(0));
      if (noiseVal > 0.5) continue;
      
      ctx.fillStyle = neighborPalette.base;
      
      switch (edge) {
        case 'top':
          ctx.fillRect(px + i, py, pixelSize, edgeSize * (1 - noiseVal));
          break;
        case 'bottom':
          ctx.fillRect(px + i, py + tileSize - edgeSize * (1 - noiseVal), pixelSize, edgeSize * (1 - noiseVal));
          break;
        case 'left':
          ctx.fillRect(px, py + i, edgeSize * (1 - noiseVal), pixelSize);
          break;
        case 'right':
          ctx.fillRect(px + tileSize - edgeSize * (1 - noiseVal), py + i, edgeSize * (1 - noiseVal), pixelSize);
          break;
      }
    }
  };
  
  // Draw edge blending (only for different tile types)
  drawEdgeTransition('top', top);
  drawEdgeTransition('bottom', bottom);
  drawEdgeTransition('left', left);
  drawEdgeTransition('right', right);
  
  // Draw inner corners when diagonal differs but adjacent sides match
  if (top === type && left === type && topLeft && topLeft !== type) {
    drawCornerTransition(0, 0, topLeft, 'tl');
  }
  if (top === type && right === type && topRight && topRight !== type) {
    drawCornerTransition(tileSize, 0, topRight, 'tr');
  }
  if (bottom === type && left === type && bottomLeft && bottomLeft !== type) {
    drawCornerTransition(0, tileSize, bottomLeft, 'bl');
  }
  if (bottom === type && right === type && bottomRight && bottomRight !== type) {
    drawCornerTransition(tileSize, tileSize, bottomRight, 'br');
  }
  
  // Draw subtle ambient occlusion on edges (darken edges slightly)
  const aoSize = pixelSize;
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  
  // Top edge shadow
  if (top && top !== type) {
    ctx.fillRect(px, py, tileSize, aoSize);
  }
  // Left edge shadow  
  if (left && left !== type) {
    ctx.fillRect(px, py, aoSize, tileSize);
  }
  
  // Draw subtle highlight on opposite edges
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  if (bottom && bottom !== type) {
    ctx.fillRect(px, py + tileSize - aoSize, tileSize, aoSize);
  }
  if (right && right !== type) {
    ctx.fillRect(px + tileSize - aoSize, py, aoSize, tileSize);
  }
};

const CanvasTileRenderer = ({
  map,
  viewportOffset,
  viewportSize,
  tileSize,
}: CanvasTileRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Calculate canvas dimensions
  const canvasWidth = viewportSize.tilesX * tileSize;
  const canvasHeight = viewportSize.tilesY * tileSize;
  
  // Memoize visible tiles calculation
  const visibleTilesData = useMemo(() => {
    const tiles: { x: number; y: number; type: TileType; worldX: number; worldY: number }[] = [];
    const endX = Math.min(viewportOffset.x + viewportSize.tilesX, map.width);
    const endY = Math.min(viewportOffset.y + viewportSize.tilesY, map.height);
    
    for (let y = viewportOffset.y; y < endY; y++) {
      for (let x = viewportOffset.x; x < endX; x++) {
        if (map.tiles[y]?.[x]) {
          tiles.push({
            x: x - viewportOffset.x,
            y: y - viewportOffset.y,
            type: map.tiles[y][x].type,
            worldX: x,
            worldY: y,
          });
        }
      }
    }
    return tiles;
  }, [map, viewportOffset, viewportSize]);
  
  // Draw tiles to canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Disable image smoothing for pixel art look
    ctx.imageSmoothingEnabled = false;
    
    // Draw each visible tile
    for (const tile of visibleTilesData) {
      drawTile(ctx, tile.x, tile.y, tile.type, tileSize, map, tile.worldX, tile.worldY);
    }
  }, [visibleTilesData, tileSize, canvasWidth, canvasHeight, map]);
  
  // Redraw when dependencies change
  useEffect(() => {
    draw();
  }, [draw]);
  
  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="absolute inset-0 pointer-events-none"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export default CanvasTileRenderer;

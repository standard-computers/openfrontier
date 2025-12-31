import { useRef, useEffect, useMemo, useCallback } from 'react';
import { WorldMap, TileType } from '@/types/game';

interface CanvasTileRendererProps {
  map: WorldMap;
  viewportOffset: { x: number; y: number };
  viewportSize: { tilesX: number; tilesY: number };
  tileSize: number;
}

// Enhanced pixel art palette with more color depth
const TILE_PALETTES: Record<TileType, { 
  colors: string[];
  highlight: string;
  shadow: string;
  accent: string;
}> = {
  grass: { 
    colors: ['#2d6930', '#3a7a3c', '#3d8c40', '#4a9e4d', '#5ab85d', '#6bc96c', '#4d8b4f'],
    highlight: '#8ed890',
    shadow: '#1a4a1c',
    accent: '#7cc97f'
  },
  water: { 
    colors: ['#185090', '#2068a0', '#2878a8', '#3a90c0', '#4da8d8', '#60c0f0', '#3580b0'],
    highlight: '#90e0ff',
    shadow: '#0a2840',
    accent: '#70d0ff'
  },
  sand: { 
    colors: ['#a88040', '#b89050', '#c8a060', '#d4b070', '#e0c080', '#ecd090', '#f8e0a0'],
    highlight: '#fff0c0',
    shadow: '#6a5020',
    accent: '#f0d898'
  },
  stone: { 
    colors: ['#383848', '#484858', '#585868', '#606878', '#707888', '#808898', '#9098a8'],
    highlight: '#b0b8c8',
    shadow: '#202028',
    accent: '#a0a8b8'
  },
  dirt: { 
    colors: ['#5a3010', '#6a4020', '#7a5030', '#8a6040', '#9a7050', '#aa8060', '#ba9070'],
    highlight: '#c8a080',
    shadow: '#3a2008',
    accent: '#b89068'
  },
  forest: { 
    colors: ['#0a2810', '#102820', '#183828', '#1a4828', '#204030', '#2a5838', '#3a6848'],
    highlight: '#5a8858',
    shadow: '#041008',
    accent: '#4a7848'
  },
  snow: { 
    colors: ['#c0d0e0', '#c8d8e8', '#d0e0f0', '#d8e8f8', '#e0f0ff', '#e8f8ff', '#f0ffff'],
    highlight: '#ffffff',
    shadow: '#90a8c0',
    accent: '#f8ffff'
  },
  ice: { 
    colors: ['#5098c8', '#60a8d8', '#70b8e0', '#80c8e8', '#90d8f0', '#a0e8f8', '#b0f0ff'],
    highlight: '#e0ffff',
    shadow: '#3070a0',
    accent: '#c0f0ff'
  },
  swamp: { 
    colors: ['#182810', '#203818', '#284020', '#304828', '#3a5030', '#4a6040', '#5a7050'],
    highlight: '#6a8858',
    shadow: '#101808',
    accent: '#508040'
  },
  lava: { 
    colors: ['#500000', '#700000', '#900800', '#b01000', '#d02000', '#e83010', '#ff4820'],
    highlight: '#ffa060',
    shadow: '#300000',
    accent: '#ff8040'
  },
  mountain: { 
    colors: ['#202028', '#303038', '#404048', '#505058', '#606068', '#707078', '#808088'],
    highlight: '#a0a0a8',
    shadow: '#101018',
    accent: '#909098'
  },
  jungle: { 
    colors: ['#021008', '#042000', '#062808', '#083010', '#0a3818', '#1a4828', '#2a5838'],
    highlight: '#4a7848',
    shadow: '#010808',
    accent: '#3a6838'
  },
};

// Tile cache for pre-rendered tiles - keyed by "type-tileSize"
const tileCache = new Map<string, HTMLCanvasElement>();

// Deterministic noise functions
const noise = (x: number, y: number, seed: number = 0): number => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
};

const noise2 = (x: number, y: number, seed: number = 0): number => {
  const n = Math.sin(x * 7.432 + y * 45.123 + seed * 2.5) * 23421.631;
  return n - Math.floor(n);
};

// Get tile orientation (0, 1, 2, 3 for 0°, 90°, 180°, 270°)
const getTileOrientation = (worldX: number, worldY: number): number => {
  return Math.floor(noise(worldX * 3.7, worldY * 5.3, 9999) * 4);
};

// Get tile variant for additional randomness
const getTileVariant = (worldX: number, worldY: number): number => {
  return Math.floor(noise(worldX * 2.1, worldY * 3.9, 8888) * 8);
};

// Transform coordinates based on orientation
const transformCoord = (
  localX: number,
  localY: number,
  tileSize: number,
  orientation: number
): { x: number; y: number } => {
  switch (orientation) {
    case 1: // 90°
      return { x: tileSize - localY - 1, y: localX };
    case 2: // 180°
      return { x: tileSize - localX - 1, y: tileSize - localY - 1 };
    case 3: // 270°
      return { x: localY, y: tileSize - localX - 1 };
    default: // 0°
      return { x: localX, y: localY };
  }
};

// Simplified tile drawing - reduced detail for performance
const drawTileBase = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  worldX: number,
  worldY: number,
  palette: typeof TILE_PALETTES.grass,
  orientation: number,
  variant: number
) => {
  // Use larger pixel blocks for faster rendering
  const pixelSize = Math.max(4, Math.floor(tileSize / 8));
  const seed = worldX * 1000 + worldY;
  
  // Base layer with varied colors
  for (let ly = 0; ly < tileSize; ly += pixelSize) {
    for (let lx = 0; lx < tileSize; lx += pixelSize) {
      const { x: tx, y: ty } = transformCoord(lx, ly, tileSize, orientation);
      const n = noise(seed + tx * 0.15, ty * 0.15, 100 + variant);
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.min(colorIndex, palette.colors.length - 1)];
      ctx.fillRect(px + lx, py + ly, pixelSize, pixelSize);
    }
  }
};

// Add simple detail overlay based on tile type
const addTileDetails = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  worldX: number,
  worldY: number,
  type: TileType,
  palette: typeof TILE_PALETTES.grass,
  variant: number
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 12));
  const seed = worldX * 1000 + worldY;
  
  // Add minimal details based on type
  switch (type) {
    case 'grass':
      // A few grass tufts
      if (variant % 2 === 0) {
        const tx = (seed % 8 + 2) * pixelSize;
        const ty = (seed % 6 + 4) * pixelSize;
        ctx.fillStyle = palette.highlight;
        ctx.fillRect(px + tx, py + ty, pixelSize, pixelSize * 2);
      }
      break;
    case 'water':
      // Wave line
      if (variant % 3 === 0) {
        const wy = pixelSize * (3 + (variant % 4) * 2);
        ctx.fillStyle = palette.highlight;
        ctx.fillRect(px + pixelSize * 2, py + wy, tileSize - pixelSize * 4, pixelSize);
      }
      break;
    case 'sand':
      // Grain dots
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(px + (seed % 10 + 2) * pixelSize, py + (seed % 8 + 2) * pixelSize, pixelSize / 2, pixelSize / 2);
      break;
    case 'forest':
    case 'jungle':
      // Foliage spot
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(px + (seed % 6 + 3) * pixelSize, py + (seed % 5 + 2) * pixelSize, pixelSize * 2, pixelSize * 2);
      break;
    case 'stone':
    case 'mountain':
      // Crack line
      if (variant % 2 === 0) {
        ctx.fillStyle = palette.shadow;
        ctx.fillRect(px + (seed % 6 + 2) * pixelSize, py + pixelSize * 2, pixelSize, tileSize / 3);
      }
      break;
  }
};

// Get or create cached tile for a unique tile configuration
const getCachedTile = (
  type: TileType,
  tileSize: number,
  worldX: number,
  worldY: number
): HTMLCanvasElement => {
  const orientation = getTileOrientation(worldX, worldY);
  const variant = getTileVariant(worldX, worldY);
  const cacheKey = `${type}-${tileSize}-${orientation}-${variant}`;
  
  let cached = tileCache.get(cacheKey);
  if (cached) return cached;
  
  // Limit cache size to prevent memory issues
  if (tileCache.size > 500) {
    const firstKey = tileCache.keys().next().value;
    if (firstKey) tileCache.delete(firstKey);
  }
  
  // Create new cached tile
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    const palette = TILE_PALETTES[type] || TILE_PALETTES.grass;
    
    // Draw base
    drawTileBase(ctx, 0, 0, tileSize, worldX, worldY, palette, orientation, variant);
    
    // Add details
    addTileDetails(ctx, 0, 0, tileSize, worldX, worldY, type, palette, variant);
    
    // Minimal edge effect
    const pixelSize = Math.max(2, Math.floor(tileSize / 12));
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, tileSize, pixelSize);
    ctx.fillRect(0, 0, pixelSize, tileSize);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, tileSize - pixelSize, tileSize, pixelSize);
    ctx.fillRect(tileSize - pixelSize, 0, pixelSize, tileSize);
  }
  
  tileCache.set(cacheKey, canvas);
  return canvas;
};

// Clear cache when tile size changes
let lastTileSize = 0;
const clearCacheIfNeeded = (tileSize: number) => {
  if (lastTileSize !== tileSize) {
    tileCache.clear();
    lastTileSize = tileSize;
  }
};

const CanvasTileRenderer = ({
  map,
  viewportOffset,
  viewportSize,
  tileSize,
}: CanvasTileRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastDrawRef = useRef<string>('');
  
  const canvasWidth = viewportSize.tilesX * tileSize;
  const canvasHeight = viewportSize.tilesY * tileSize;
  
  // Create a stable key for the current viewport to detect real changes
  const viewportKey = useMemo(() => 
    `${viewportOffset.x}-${viewportOffset.y}-${viewportSize.tilesX}-${viewportSize.tilesY}-${tileSize}`,
    [viewportOffset.x, viewportOffset.y, viewportSize.tilesX, viewportSize.tilesY, tileSize]
  );
  
  const draw = useCallback(() => {
    // Skip if nothing changed
    if (lastDrawRef.current === viewportKey) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear cache if tile size changed
    clearCacheIfNeeded(tileSize);
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;
    
    const endX = Math.min(viewportOffset.x + viewportSize.tilesX, map.width);
    const endY = Math.min(viewportOffset.y + viewportSize.tilesY, map.height);
    
    // Draw tiles using cached tile images
    for (let y = viewportOffset.y; y < endY; y++) {
      for (let x = viewportOffset.x; x < endX; x++) {
        const tile = map.tiles[y]?.[x];
        if (!tile) continue;
        
        const screenX = (x - viewportOffset.x) * tileSize;
        const screenY = (y - viewportOffset.y) * tileSize;
        
        // Get or create cached tile
        const cachedTile = getCachedTile(tile.type, tileSize, x, y);
        ctx.drawImage(cachedTile, screenX, screenY);
      }
    }
    
    lastDrawRef.current = viewportKey;
  }, [viewportKey, tileSize, canvasWidth, canvasHeight, map.tiles, map.width, map.height, viewportOffset, viewportSize]);
  
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

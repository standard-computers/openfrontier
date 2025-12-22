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

// Draw detailed grass tile
const drawGrassTile = (
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
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  const seed = worldX * 1000 + worldY;
  
  // Base layer with varied greens
  for (let ly = 0; ly < tileSize; ly += pixelSize) {
    for (let lx = 0; lx < tileSize; lx += pixelSize) {
      const { x: tx, y: ty } = transformCoord(lx, ly, tileSize, orientation);
      const n = noise(seed + tx * 0.15, ty * 0.15, 100 + variant);
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.min(colorIndex, palette.colors.length - 1)];
      ctx.fillRect(px + lx, py + ly, pixelSize, pixelSize);
    }
  }
  
  // Add grass tufts in random positions
  const tuftCount = 6 + (variant % 4);
  for (let i = 0; i < tuftCount; i++) {
    const n1 = noise(seed + i * 13.7, i * 7.3, 200);
    const n2 = noise2(seed + i * 11.1, i * 9.9, 201);
    
    const baseX = Math.floor(n1 * (tileSize - pixelSize * 4)) + pixelSize;
    const baseY = Math.floor(n2 * (tileSize - pixelSize * 6)) + pixelSize * 3;
    const height = pixelSize * (2 + Math.floor(noise(i, seed, 202) * 3));
    
    // Draw grass blade
    for (let h = 0; h < height; h += pixelSize) {
      const sway = Math.floor(noise(i + h, seed, 203) * 2 - 1) * (h > pixelSize ? pixelSize : 0);
      const shade = h / height;
      ctx.fillStyle = shade < 0.4 ? palette.colors[5] : palette.colors[3];
      ctx.fillRect(px + baseX + sway, py + baseY - h, pixelSize, pixelSize);
    }
    // Highlight tip
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(px + baseX, py + baseY - height, pixelSize, pixelSize);
  }
  
  // Add small details based on variant
  if (variant % 3 === 0) {
    // Flower
    const fx = pixelSize * 3 + (variant % 5) * pixelSize * 2;
    const fy = pixelSize * 4 + (variant % 4) * pixelSize * 2;
    const flowerColors = ['#ff6688', '#ffaa44', '#ffff66', '#aaddff', '#ff88cc'];
    ctx.fillStyle = flowerColors[variant % 5];
    ctx.fillRect(px + fx, py + fy, pixelSize, pixelSize);
    ctx.fillRect(px + fx + pixelSize, py + fy, pixelSize, pixelSize);
    ctx.fillRect(px + fx, py + fy + pixelSize, pixelSize, pixelSize);
    ctx.fillStyle = '#ffee00';
    ctx.fillRect(px + fx + pixelSize, py + fy + pixelSize, pixelSize, pixelSize);
  } else if (variant % 3 === 1) {
    // Small rocks
    const rx = pixelSize * 5 + (variant % 3) * pixelSize * 3;
    const ry = tileSize - pixelSize * 4;
    ctx.fillStyle = '#888890';
    ctx.fillRect(px + rx, py + ry, pixelSize * 2, pixelSize);
    ctx.fillStyle = '#a0a0a8';
    ctx.fillRect(px + rx, py + ry - pixelSize, pixelSize, pixelSize);
  }
};

// Draw detailed water tile
const drawWaterTile = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  worldX: number,
  worldY: number,
  palette: typeof TILE_PALETTES.water,
  orientation: number,
  variant: number
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  const seed = worldX * 1000 + worldY;
  
  // Base water with depth variation
  for (let ly = 0; ly < tileSize; ly += pixelSize) {
    for (let lx = 0; lx < tileSize; lx += pixelSize) {
      const { x: tx, y: ty } = transformCoord(lx, ly, tileSize, orientation);
      const depth = ty / tileSize;
      const n = noise(seed + tx * 0.12, ty * 0.12, 800 + variant);
      const colorIndex = Math.floor((n * 0.7 + depth * 0.3) * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + lx, py + ly, pixelSize, pixelSize);
    }
  }
  
  // Add wave lines
  const waveCount = 2 + (variant % 3);
  for (let i = 0; i < waveCount; i++) {
    const wy = pixelSize * (3 + i * 4 + (variant % 2) * 2);
    if (wy >= tileSize - pixelSize) continue;
    
    const waveOffset = (variant + i) % 4;
    const waveLength = pixelSize * (4 + (variant % 3) * 2);
    const wx = pixelSize * waveOffset * 2;
    
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(px + wx, py + wy, waveLength, pixelSize);
    
    // Secondary wave
    if (i % 2 === 0) {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(px + wx + waveLength + pixelSize * 2, py + wy + pixelSize, waveLength * 0.6, pixelSize);
    }
  }
  
  // Add sparkle
  if (variant % 4 === 0) {
    const sx = pixelSize * (4 + (seed % 8));
    const sy = pixelSize * 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + sx, py + sy, pixelSize, pixelSize);
  }
};

// Draw detailed sand tile
const drawSandTile = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  worldX: number,
  worldY: number,
  palette: typeof TILE_PALETTES.sand,
  orientation: number,
  variant: number
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  const seed = worldX * 1000 + worldY;
  
  // Base sand with dune patterns
  for (let ly = 0; ly < tileSize; ly += pixelSize) {
    for (let lx = 0; lx < tileSize; lx += pixelSize) {
      const { x: tx, y: ty } = transformCoord(lx, ly, tileSize, orientation);
      const dune = Math.sin((tx * 0.15 + variant * 0.5) * 0.5) * 0.3;
      const n = noise(seed + tx * 0.1, ty * 0.1, 1600 + variant) + dune;
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + lx, py + ly, pixelSize, pixelSize);
    }
  }
  
  // Add grain details
  const grainCount = 8 + (variant % 5);
  for (let i = 0; i < grainCount; i++) {
    const gx = Math.floor(noise(seed + i * 17, i * 13, 1700) * tileSize);
    const gy = Math.floor(noise2(seed + i * 19, i * 11, 1701) * tileSize);
    ctx.fillStyle = i % 3 === 0 ? palette.highlight : palette.colors[2];
    ctx.fillRect(px + gx, py + gy, pixelSize / 2, pixelSize / 2);
  }
  
  // Add shells or pebbles based on variant
  if (variant % 5 === 0) {
    const sx = pixelSize * (3 + (seed % 6));
    const sy = pixelSize * (4 + (seed % 5));
    ctx.fillStyle = '#f8e8e0';
    ctx.fillRect(px + sx, py + sy, pixelSize * 2, pixelSize);
    ctx.fillRect(px + sx + pixelSize / 2, py + sy - pixelSize, pixelSize, pixelSize);
  } else if (variant % 5 === 2) {
    const px2 = pixelSize * (5 + (seed % 4));
    const py2 = pixelSize * (6 + (seed % 4));
    ctx.fillStyle = '#a08070';
    ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
  }
  
  // Ripple marks
  if (variant % 3 === 1) {
    for (let i = 0; i < 3; i++) {
      const ry = pixelSize * (4 + i * 4);
      ctx.fillStyle = palette.shadow;
      ctx.fillRect(px + pixelSize * 2, py + ry, tileSize - pixelSize * 4, pixelSize / 2);
    }
  }
};

// Draw detailed forest tile
const drawForestTile = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  worldX: number,
  worldY: number,
  palette: typeof TILE_PALETTES.forest,
  orientation: number,
  variant: number
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  const seed = worldX * 1000 + worldY;
  
  // Dark base layer
  for (let ly = 0; ly < tileSize; ly += pixelSize) {
    for (let lx = 0; lx < tileSize; lx += pixelSize) {
      const { x: tx, y: ty } = transformCoord(lx, ly, tileSize, orientation);
      const n = noise(seed + tx * 0.12, ty * 0.12, 2400 + variant);
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + lx, py + ly, pixelSize, pixelSize);
    }
  }
  
  // Add foliage clusters
  const clusterCount = 5 + (variant % 4);
  for (let i = 0; i < clusterCount; i++) {
    const cx = Math.floor(noise(seed + i * 23, i * 17, 2500) * (tileSize - pixelSize * 3));
    const cy = Math.floor(noise2(seed + i * 19, i * 13, 2501) * (tileSize - pixelSize * 3));
    const size = pixelSize * (1 + (i % 2));
    
    ctx.fillStyle = palette.colors[4 + (i % 3)];
    ctx.fillRect(px + cx, py + cy, size, size);
    
    // Light spot
    if (i % 3 === 0) {
      ctx.fillStyle = palette.highlight;
      ctx.fillRect(px + cx, py + cy, pixelSize, pixelSize);
    }
  }
  
  // Add mushroom based on variant
  if (variant % 6 === 0) {
    const mx = pixelSize * (4 + (seed % 6));
    const my = tileSize - pixelSize * 4;
    // Stem
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(px + mx, py + my + pixelSize, pixelSize, pixelSize * 2);
    // Cap
    ctx.fillStyle = '#c84040';
    ctx.fillRect(px + mx - pixelSize, py + my, pixelSize * 3, pixelSize);
    // Spots
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + mx, py + my, pixelSize, pixelSize);
  }
  
  // Fallen leaves
  if (variant % 4 === 2) {
    const lx = pixelSize * (2 + (seed % 8));
    const ly = pixelSize * (8 + (seed % 4));
    ctx.fillStyle = '#8a5030';
    ctx.fillRect(px + lx, py + ly, pixelSize, pixelSize);
  }
};

// Draw detailed stone tile
const drawStoneTile = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  worldX: number,
  worldY: number,
  palette: typeof TILE_PALETTES.stone,
  orientation: number,
  variant: number
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  const seed = worldX * 1000 + worldY;
  
  // Base stone with strata
  for (let ly = 0; ly < tileSize; ly += pixelSize) {
    for (let lx = 0; lx < tileSize; lx += pixelSize) {
      const { x: tx, y: ty } = transformCoord(lx, ly, tileSize, orientation);
      const strata = Math.sin((ty * 0.2 + variant * 0.3) * 0.8) * 0.2;
      const n = noise(seed + tx * 0.1, ty * 0.1, 3100 + variant) + strata;
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + lx, py + ly, pixelSize, pixelSize);
    }
  }
  
  // Add cracks
  const crackCount = 1 + (variant % 3);
  for (let i = 0; i < crackCount; i++) {
    const startX = Math.floor(noise(seed + i * 31, i * 29, 3200) * (tileSize - pixelSize * 4)) + pixelSize;
    const startY = Math.floor(noise2(seed + i * 27, i * 23, 3201) * (tileSize / 2));
    
    ctx.fillStyle = palette.shadow;
    let crackX = startX;
    let crackY = startY;
    for (let j = 0; j < 4 + (variant % 3); j++) {
      ctx.fillRect(px + crackX, py + crackY, pixelSize, pixelSize);
      crackX += Math.floor((noise(i, j, 3400) - 0.5) * pixelSize * 2);
      crackY += pixelSize;
      if (crackY >= tileSize - pixelSize) break;
      crackX = Math.max(pixelSize, Math.min(tileSize - pixelSize * 2, crackX));
    }
  }
  
  // Mineral flecks
  const fleckCount = 3 + (variant % 4);
  for (let i = 0; i < fleckCount; i++) {
    const fx = Math.floor(noise(seed + i * 41, i * 37, 3500) * tileSize);
    const fy = Math.floor(noise2(seed + i * 43, i * 39, 3501) * tileSize);
    ctx.fillStyle = i % 2 === 0 ? palette.highlight : '#d0d8e8';
    ctx.fillRect(px + fx, py + fy, pixelSize / 2, pixelSize / 2);
  }
  
  // Moss patch
  if (variant % 5 === 0) {
    const mx = pixelSize * (2 + (seed % 6));
    const my = pixelSize * (3 + (seed % 5));
    ctx.fillStyle = '#4a6840';
    ctx.fillRect(px + mx, py + my, pixelSize * 2, pixelSize);
    ctx.fillRect(px + mx + pixelSize, py + my + pixelSize, pixelSize, pixelSize);
  }
};

// Draw detailed snow tile
const drawSnowTile = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  worldX: number,
  worldY: number,
  palette: typeof TILE_PALETTES.snow,
  orientation: number,
  variant: number
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  const seed = worldX * 1000 + worldY;
  
  // Base snow with subtle undulation
  for (let ly = 0; ly < tileSize; ly += pixelSize) {
    for (let lx = 0; lx < tileSize; lx += pixelSize) {
      const { x: tx, y: ty } = transformCoord(lx, ly, tileSize, orientation);
      const drift = Math.sin((tx * 0.12 + variant * 0.3) * 0.6) * 0.15;
      const n = noise(seed + tx * 0.08, ty * 0.08, 4000 + variant) + drift;
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + lx, py + ly, pixelSize, pixelSize);
    }
  }
  
  // Add sparkles
  const sparkleCount = 4 + (variant % 5);
  for (let i = 0; i < sparkleCount; i++) {
    const sx = Math.floor(noise(seed + i * 53, i * 47, 4100) * tileSize);
    const sy = Math.floor(noise2(seed + i * 51, i * 49, 4101) * tileSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + sx, py + sy, pixelSize / 2, pixelSize / 2);
  }
  
  // Shadow depressions
  if (variant % 3 === 0) {
    const dx = pixelSize * (3 + (seed % 6));
    const dy = pixelSize * (5 + (seed % 4));
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(px + dx, py + dy, pixelSize * 3, pixelSize);
  }
  
  // Frost crystal
  if (variant % 6 === 1) {
    const cx = pixelSize * (5 + (seed % 4));
    const cy = pixelSize * (4 + (seed % 5));
    ctx.fillStyle = '#e8f4ff';
    ctx.fillRect(px + cx, py + cy - pixelSize, pixelSize, pixelSize * 3);
    ctx.fillRect(px + cx - pixelSize, py + cy, pixelSize * 3, pixelSize);
  }
};

// Draw detailed lava tile
const drawLavaTile = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  worldX: number,
  worldY: number,
  palette: typeof TILE_PALETTES.lava,
  orientation: number,
  variant: number
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  const seed = worldX * 1000 + worldY;
  
  // Base lava with flow patterns
  for (let ly = 0; ly < tileSize; ly += pixelSize) {
    for (let lx = 0; lx < tileSize; lx += pixelSize) {
      const { x: tx, y: ty } = transformCoord(lx, ly, tileSize, orientation);
      const flow = Math.sin((tx * 0.08 + ty * 0.05 + variant * 0.4) * 0.7) * 0.3;
      const n = noise(seed + tx * 0.1, ty * 0.1, 4800 + variant) + flow;
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + lx, py + ly, pixelSize, pixelSize);
    }
  }
  
  // Bright veins
  const veinCount = 2 + (variant % 3);
  for (let i = 0; i < veinCount; i++) {
    const vx = Math.floor(noise(seed + i * 61, i * 59, 4900) * (tileSize - pixelSize * 4));
    const vy = Math.floor(noise2(seed + i * 63, i * 57, 4901) * (tileSize - pixelSize * 2));
    const vlen = pixelSize * (2 + (i % 3));
    
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(px + vx, py + vy, vlen, pixelSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + vx + pixelSize, py + vy, pixelSize, pixelSize);
  }
  
  // Dark crust
  if (variant % 4 === 0) {
    const cx = pixelSize * (4 + (seed % 5));
    const cy = pixelSize * (3 + (seed % 6));
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(px + cx, py + cy, pixelSize * 2, pixelSize * 2);
  }
  
  // Glowing ember
  if (variant % 5 === 2) {
    const ex = pixelSize * (6 + (seed % 4));
    const ey = pixelSize * (8 + (seed % 3));
    ctx.fillStyle = '#ffff80';
    ctx.fillRect(px + ex, py + ey, pixelSize, pixelSize);
  }
};

// Generic tile drawer for less common tile types
const drawGenericTile = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  worldX: number,
  worldY: number,
  type: TileType,
  palette: typeof TILE_PALETTES.grass,
  orientation: number,
  variant: number
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  const seed = worldX * 1000 + worldY;
  const typeSeed = type.charCodeAt(0) * 100;
  
  // Base layer
  for (let ly = 0; ly < tileSize; ly += pixelSize) {
    for (let lx = 0; lx < tileSize; lx += pixelSize) {
      const { x: tx, y: ty } = transformCoord(lx, ly, tileSize, orientation);
      const n = noise(seed + tx * 0.12, ty * 0.12, typeSeed + variant);
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + lx, py + ly, pixelSize, pixelSize);
    }
  }
  
  // Add texture details
  const detailCount = 4 + (variant % 4);
  for (let i = 0; i < detailCount; i++) {
    const dx = Math.floor(noise(seed + i * 71, i * 67, typeSeed + 10) * tileSize);
    const dy = Math.floor(noise2(seed + i * 73, i * 69, typeSeed + 11) * tileSize);
    ctx.fillStyle = i % 2 === 0 ? palette.highlight : palette.colors[4];
    ctx.fillRect(px + dx, py + dy, pixelSize, pixelSize);
  }
  
  // Accent
  if (variant % 3 === 0) {
    const ax = pixelSize * (4 + (seed % 6));
    const ay = pixelSize * (5 + (seed % 5));
    ctx.fillStyle = palette.accent;
    ctx.fillRect(px + ax, py + ay, pixelSize * 2, pixelSize);
  }
};

// Draw a single tile
const drawTile = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: TileType,
  tileSize: number,
  worldX: number,
  worldY: number
) => {
  const palette = TILE_PALETTES[type];
  const px = x * tileSize;
  const py = y * tileSize;
  const orientation = getTileOrientation(worldX, worldY);
  const variant = getTileVariant(worldX, worldY);
  
  // Draw tile based on type with orientation and variant
  switch (type) {
    case 'grass':
      drawGrassTile(ctx, px, py, tileSize, worldX, worldY, palette, orientation, variant);
      break;
    case 'water':
      drawWaterTile(ctx, px, py, tileSize, worldX, worldY, palette, orientation, variant);
      break;
    case 'sand':
      drawSandTile(ctx, px, py, tileSize, worldX, worldY, palette, orientation, variant);
      break;
    case 'forest':
    case 'jungle':
      drawForestTile(ctx, px, py, tileSize, worldX, worldY, palette, orientation, variant);
      break;
    case 'stone':
    case 'mountain':
      drawStoneTile(ctx, px, py, tileSize, worldX, worldY, palette, orientation, variant);
      break;
    case 'snow':
    case 'ice':
      drawSnowTile(ctx, px, py, tileSize, worldX, worldY, palette, orientation, variant);
      break;
    case 'lava':
      drawLavaTile(ctx, px, py, tileSize, worldX, worldY, palette, orientation, variant);
      break;
    default:
      drawGenericTile(ctx, px, py, tileSize, worldX, worldY, type, palette, orientation, variant);
  }
  
  // Minimal edge highlight only (no blending)
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Subtle inner shadow on top and left
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(px, py, tileSize, pixelSize);
  ctx.fillRect(px, py, pixelSize, tileSize);
  
  // Subtle highlight on bottom and right
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(px, py + tileSize - pixelSize, tileSize, pixelSize);
  ctx.fillRect(px + tileSize - pixelSize, py, pixelSize, tileSize);
};

const CanvasTileRenderer = ({
  map,
  viewportOffset,
  viewportSize,
  tileSize,
}: CanvasTileRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const canvasWidth = viewportSize.tilesX * tileSize;
  const canvasHeight = viewportSize.tilesY * tileSize;
  
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
  
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;
    
    for (const tile of visibleTilesData) {
      drawTile(ctx, tile.x, tile.y, tile.type, tileSize, tile.worldX, tile.worldY);
    }
  }, [visibleTilesData, tileSize, canvasWidth, canvasHeight]);
  
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

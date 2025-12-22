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
    colors: ['#3d8c40', '#4a9e4d', '#5ab85d', '#6bc96c', '#4d8b4f', '#3a7a3c', '#2d6930'],
    highlight: '#8ed890',
    shadow: '#2a5a2c',
    accent: '#7cc97f'
  },
  water: { 
    colors: ['#2878a8', '#3a90c0', '#4da8d8', '#60c0f0', '#3580b0', '#2068a0', '#185090'],
    highlight: '#90e0ff',
    shadow: '#103860',
    accent: '#70d0ff'
  },
  sand: { 
    colors: ['#d4b070', '#e0c080', '#ecd090', '#f8e0a0', '#c8a060', '#b89050', '#a88040'],
    highlight: '#fff0c0',
    shadow: '#8a6830',
    accent: '#f0d898'
  },
  stone: { 
    colors: ['#606878', '#707888', '#808898', '#9098a8', '#585868', '#484858', '#383848'],
    highlight: '#b0b8c8',
    shadow: '#282830',
    accent: '#a0a8b8'
  },
  dirt: { 
    colors: ['#8a6040', '#9a7050', '#aa8060', '#ba9070', '#7a5030', '#6a4020', '#5a3010'],
    highlight: '#c8a080',
    shadow: '#3a2008',
    accent: '#b89068'
  },
  forest: { 
    colors: ['#1a4828', '#2a5838', '#3a6848', '#4a7858', '#204030', '#183828', '#102820'],
    highlight: '#6a9868',
    shadow: '#081810',
    accent: '#5a8858'
  },
  snow: { 
    colors: ['#d8e8f8', '#e0f0ff', '#e8f8ff', '#f0ffff', '#d0e0f0', '#c8d8e8', '#c0d0e0'],
    highlight: '#ffffff',
    shadow: '#a0b8d0',
    accent: '#f8ffff'
  },
  ice: { 
    colors: ['#80c8e8', '#90d8f0', '#a0e8f8', '#b0f0ff', '#70b8e0', '#60a8d8', '#5098c8'],
    highlight: '#e0ffff',
    shadow: '#4080a0',
    accent: '#c0f0ff'
  },
  swamp: { 
    colors: ['#3a5030', '#4a6040', '#5a7050', '#6a8060', '#304828', '#284020', '#203818'],
    highlight: '#7a9868',
    shadow: '#182810',
    accent: '#608050'
  },
  lava: { 
    colors: ['#c02000', '#e03010', '#f04820', '#ff6030', '#a01000', '#800800', '#600000'],
    highlight: '#ffa060',
    shadow: '#400000',
    accent: '#ff8040'
  },
  mountain: { 
    colors: ['#505058', '#606068', '#707078', '#808088', '#404048', '#303038', '#202028'],
    highlight: '#a0a0a8',
    shadow: '#101018',
    accent: '#909098'
  },
  jungle: { 
    colors: ['#0a3818', '#1a4828', '#2a5838', '#3a6848', '#083010', '#062808', '#042000'],
    highlight: '#5a8858',
    shadow: '#021008',
    accent: '#4a7848'
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

// Multi-octave fractal noise
const fractalNoise = (x: number, y: number, seed: number, octaves: number = 4): number => {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += noise(x * frequency, y * frequency, seed + i * 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return value / maxValue;
};

// Draw detailed grass tile
const drawGrassTile = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  worldX: number,
  worldY: number,
  palette: typeof TILE_PALETTES.grass
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Base layer with varied greens
  for (let py2 = 0; py2 < tileSize; py2 += pixelSize) {
    for (let px2 = 0; px2 < tileSize; px2 += pixelSize) {
      const n1 = fractalNoise(worldX * 4 + px2 * 0.3, worldY * 4 + py2 * 0.3, 100);
      const colorIndex = Math.floor(n1 * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.min(colorIndex, palette.colors.length - 1)];
      ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
    }
  }
  
  // Add grass blade details
  const bladeCount = Math.floor(tileSize / pixelSize * 1.5);
  for (let i = 0; i < bladeCount; i++) {
    const n = noise(worldX * 20 + i, worldY * 20, 200);
    const n2 = noise2(worldX + i, worldY, 300);
    
    if (n > 0.4) continue;
    
    const bx = (n * 1000) % tileSize;
    const by = ((n2 * 1000) % (tileSize * 0.6)) + tileSize * 0.4;
    const bladeHeight = pixelSize * (2 + Math.floor(n2 * 3));
    
    // Blade with gradient
    for (let h = 0; h < bladeHeight; h += pixelSize) {
      const shade = h / bladeHeight;
      ctx.fillStyle = shade < 0.3 ? palette.highlight : 
                      shade < 0.6 ? palette.colors[1] : palette.colors[3];
      ctx.fillRect(px + bx, py + by - h, pixelSize, pixelSize);
    }
  }
  
  // Add flowers occasionally
  const flowerNoise = noise(worldX * 5, worldY * 5, 400);
  if (flowerNoise > 0.85) {
    const fx = (flowerNoise * 500) % (tileSize - pixelSize * 4) + pixelSize * 2;
    const fy = (noise2(worldX, worldY, 500) * 500) % (tileSize - pixelSize * 4) + pixelSize * 2;
    const flowerColors = ['#ff6688', '#ffaa44', '#ffff66', '#aaddff', '#ffaaff'];
    const flowerColor = flowerColors[Math.floor(flowerNoise * 100) % flowerColors.length];
    
    // Flower petals in cross pattern
    ctx.fillStyle = flowerColor;
    ctx.fillRect(px + fx, py + fy - pixelSize, pixelSize, pixelSize);
    ctx.fillRect(px + fx, py + fy + pixelSize, pixelSize, pixelSize);
    ctx.fillRect(px + fx - pixelSize, py + fy, pixelSize, pixelSize);
    ctx.fillRect(px + fx + pixelSize, py + fy, pixelSize, pixelSize);
    ctx.fillStyle = '#ffee00';
    ctx.fillRect(px + fx, py + fy, pixelSize, pixelSize);
  }
  
  // Add clover patches
  const cloverNoise = noise(worldX * 3, worldY * 3, 600);
  if (cloverNoise > 0.9) {
    const cx = (cloverNoise * 300) % (tileSize - pixelSize * 6) + pixelSize * 3;
    const cy = (noise2(worldX * 2, worldY * 2, 700) * 300) % (tileSize - pixelSize * 6) + pixelSize * 3;
    ctx.fillStyle = '#2a6a2c';
    // Three leaves
    ctx.fillRect(px + cx - pixelSize, py + cy - pixelSize, pixelSize * 2, pixelSize);
    ctx.fillRect(px + cx - pixelSize * 2, py + cy, pixelSize * 2, pixelSize);
    ctx.fillRect(px + cx + pixelSize, py + cy, pixelSize * 2, pixelSize);
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
  palette: typeof TILE_PALETTES.water
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Base water with depth variation
  for (let py2 = 0; py2 < tileSize; py2 += pixelSize) {
    for (let px2 = 0; px2 < tileSize; px2 += pixelSize) {
      const depth = py2 / tileSize;
      const wave = Math.sin((worldX * 0.5 + px2 * 0.1 + worldY * 0.3) * Math.PI) * 0.3;
      const n = fractalNoise(worldX * 3 + px2 * 0.2, worldY * 3 + py2 * 0.2, 800) + wave;
      
      const colorIndex = Math.floor((n + depth * 0.3) * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
    }
  }
  
  // Add wave highlights
  for (let i = 0; i < 6; i++) {
    const n = noise(worldX + i * 3, worldY, 900);
    const n2 = noise2(worldX, worldY + i * 3, 1000);
    
    if (n < 0.6) continue;
    
    const wx = (n * 800) % (tileSize - pixelSize * 4);
    const wy = (n2 * 800) % (tileSize - pixelSize * 2);
    const waveLength = pixelSize * (2 + Math.floor(n2 * 4));
    
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(px + wx, py + wy, waveLength, pixelSize);
    ctx.fillStyle = palette.colors[4];
    ctx.fillRect(px + wx, py + wy + pixelSize, waveLength * 0.8, pixelSize);
  }
  
  // Add sparkle reflections
  const sparkleNoise = noise(worldX * 8, worldY * 8, 1100);
  if (sparkleNoise > 0.85) {
    ctx.fillStyle = '#ffffff';
    const sx = (sparkleNoise * 500) % (tileSize - pixelSize * 2);
    const sy = (noise2(worldX * 4, worldY * 4, 1200) * 500) % (tileSize * 0.4);
    ctx.fillRect(px + sx, py + sy, pixelSize, pixelSize);
    if (sparkleNoise > 0.92) {
      ctx.fillRect(px + sx + pixelSize, py + sy, pixelSize / 2, pixelSize / 2);
    }
  }
  
  // Add subtle foam/bubble
  if (noise(worldX * 6, worldY * 6, 1300) > 0.88) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const bx = noise(worldX * 7, worldY * 7, 1400) * (tileSize - pixelSize * 4) + pixelSize * 2;
    const by = noise2(worldX * 7, worldY * 7, 1500) * (tileSize - pixelSize * 4) + pixelSize * 2;
    ctx.beginPath();
    ctx.arc(px + bx, py + by, pixelSize, 0, Math.PI * 2);
    ctx.fill();
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
  palette: typeof TILE_PALETTES.sand
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Base sand with dune patterns
  for (let py2 = 0; py2 < tileSize; py2 += pixelSize) {
    for (let px2 = 0; px2 < tileSize; px2 += pixelSize) {
      const dune = Math.sin((worldX * 0.3 + px2 * 0.08) * Math.PI) * 0.3;
      const n = fractalNoise(worldX * 5 + px2 * 0.25, worldY * 5 + py2 * 0.25, 1600) + dune;
      
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
    }
  }
  
  // Add grain texture
  for (let i = 0; i < 12; i++) {
    const n = noise(worldX * 15 + i, worldY * 15, 1700);
    if (n < 0.7) continue;
    
    const gx = (n * 1000) % tileSize;
    const gy = (noise2(worldX + i, worldY, 1800) * 1000) % tileSize;
    
    ctx.fillStyle = n > 0.9 ? palette.highlight : palette.colors[5];
    ctx.fillRect(px + gx, py + gy, pixelSize / 2, pixelSize / 2);
  }
  
  // Add shells
  const shellNoise = noise(worldX * 4, worldY * 4, 1900);
  if (shellNoise > 0.88) {
    const sx = (shellNoise * 400) % (tileSize - pixelSize * 4) + pixelSize * 2;
    const sy = (noise2(worldX * 3, worldY * 3, 2000) * 400) % (tileSize - pixelSize * 4) + pixelSize * 2;
    
    ctx.fillStyle = shellNoise > 0.94 ? '#f8e8e0' : '#d8c8b8';
    ctx.fillRect(px + sx, py + sy, pixelSize * 2, pixelSize);
    ctx.fillRect(px + sx + pixelSize / 2, py + sy - pixelSize, pixelSize, pixelSize);
  }
  
  // Add small pebbles
  if (noise(worldX * 7, worldY * 7, 2100) > 0.9) {
    const pbx = noise(worldX * 8, worldY * 8, 2200) * (tileSize - pixelSize * 3);
    const pby = noise2(worldX * 8, worldY * 8, 2300) * (tileSize - pixelSize * 3);
    ctx.fillStyle = '#a08070';
    ctx.fillRect(px + pbx, py + pby, pixelSize, pixelSize);
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
  palette: typeof TILE_PALETTES.forest
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Dark base layer
  for (let py2 = 0; py2 < tileSize; py2 += pixelSize) {
    for (let px2 = 0; px2 < tileSize; px2 += pixelSize) {
      const n = fractalNoise(worldX * 3 + px2 * 0.2, worldY * 3 + py2 * 0.2, 2400);
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
    }
  }
  
  // Add dense foliage clusters
  const clusterCount = 8;
  for (let i = 0; i < clusterCount; i++) {
    const n = noise(worldX * 10 + i, worldY * 10, 2500);
    const n2 = noise2(worldX + i * 2, worldY, 2600);
    
    const cx = (n * 800) % tileSize;
    const cy = (n2 * 800) % tileSize;
    const size = pixelSize * (2 + Math.floor(n * 2));
    
    // Foliage blob
    ctx.fillStyle = n > 0.5 ? palette.colors[2] : palette.colors[4];
    ctx.fillRect(px + cx, py + cy, size, size);
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(px + cx, py + cy, pixelSize, pixelSize);
  }
  
  // Add dappled light
  for (let i = 0; i < 4; i++) {
    const n = noise(worldX * 6 + i * 5, worldY * 6, 2700);
    if (n < 0.75) continue;
    
    const lx = (n * 600) % (tileSize - pixelSize * 2);
    const ly = (noise2(worldX + i, worldY, 2800) * 600) % (tileSize - pixelSize * 2);
    
    ctx.fillStyle = palette.accent;
    ctx.fillRect(px + lx, py + ly, pixelSize * 2, pixelSize * 2);
  }
  
  // Add mushrooms
  if (noise(worldX * 4, worldY * 4, 2900) > 0.9) {
    const mx = noise(worldX * 5, worldY * 5, 3000) * (tileSize - pixelSize * 4) + pixelSize * 2;
    const my = tileSize - pixelSize * 4;
    
    // Stem
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(px + mx, py + my + pixelSize, pixelSize, pixelSize * 2);
    // Cap
    ctx.fillStyle = '#c84040';
    ctx.fillRect(px + mx - pixelSize, py + my, pixelSize * 3, pixelSize);
    ctx.fillRect(px + mx, py + my - pixelSize, pixelSize, pixelSize);
    // Spots
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + mx, py + my, pixelSize, pixelSize);
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
  palette: typeof TILE_PALETTES.stone
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Base stone with layers
  for (let py2 = 0; py2 < tileSize; py2 += pixelSize) {
    for (let px2 = 0; px2 < tileSize; px2 += pixelSize) {
      const strata = Math.sin((py2 * 0.15 + worldY * 0.5) * Math.PI) * 0.2;
      const n = fractalNoise(worldX * 4 + px2 * 0.2, worldY * 4 + py2 * 0.2, 3100) + strata;
      
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
    }
  }
  
  // Add cracks
  for (let i = 0; i < 3; i++) {
    const n = noise(worldX * 3 + i * 7, worldY * 3, 3200);
    if (n < 0.7) continue;
    
    const startX = (n * 500) % tileSize;
    const startY = (noise2(worldX + i, worldY, 3300) * 500) % (tileSize / 2);
    
    ctx.fillStyle = palette.shadow;
    let crackX = startX;
    let crackY = startY;
    for (let j = 0; j < 6; j++) {
      ctx.fillRect(px + crackX, py + crackY, pixelSize, pixelSize);
      crackX += (noise(i, j, 3400) - 0.5) * pixelSize * 2;
      crackY += pixelSize;
      if (crackY >= tileSize) break;
    }
  }
  
  // Add mineral flecks
  for (let i = 0; i < 5; i++) {
    const n = noise(worldX * 12 + i, worldY * 12, 3500);
    if (n < 0.85) continue;
    
    const fx = (n * 800) % tileSize;
    const fy = (noise2(worldX + i * 3, worldY, 3600) * 800) % tileSize;
    
    ctx.fillStyle = n > 0.95 ? '#d0d8e8' : palette.highlight;
    ctx.fillRect(px + fx, py + fy, pixelSize / 2, pixelSize / 2);
  }
  
  // Add moss patches
  if (noise(worldX * 2, worldY * 2, 3700) > 0.88) {
    const mx = noise(worldX * 3, worldY * 3, 3800) * (tileSize - pixelSize * 4);
    const my = noise2(worldX * 3, worldY * 3, 3900) * (tileSize - pixelSize * 4);
    
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
  palette: typeof TILE_PALETTES.snow
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Base snow with subtle undulation
  for (let py2 = 0; py2 < tileSize; py2 += pixelSize) {
    for (let px2 = 0; px2 < tileSize; px2 += pixelSize) {
      const drift = Math.sin((worldX * 0.4 + px2 * 0.1) * Math.PI) * 0.15;
      const n = fractalNoise(worldX * 3 + px2 * 0.15, worldY * 3 + py2 * 0.15, 4000) + drift;
      
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
    }
  }
  
  // Add sparkles
  for (let i = 0; i < 8; i++) {
    const n = noise(worldX * 15 + i, worldY * 15, 4100);
    if (n < 0.7) continue;
    
    const sx = (n * 900) % tileSize;
    const sy = (noise2(worldX + i * 2, worldY, 4200) * 900) % tileSize;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + sx, py + sy, pixelSize / 2, pixelSize / 2);
  }
  
  // Add shadow depressions
  for (let i = 0; i < 3; i++) {
    const n = noise(worldX * 4 + i * 3, worldY * 4, 4300);
    if (n < 0.75) continue;
    
    const dx = (n * 500) % (tileSize - pixelSize * 4);
    const dy = (noise2(worldX + i, worldY, 4400) * 500) % (tileSize - pixelSize * 2);
    
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(px + dx, py + dy, pixelSize * 3, pixelSize);
  }
  
  // Add frost crystals
  if (noise(worldX * 6, worldY * 6, 4500) > 0.9) {
    const cx = noise(worldX * 7, worldY * 7, 4600) * (tileSize - pixelSize * 4) + pixelSize * 2;
    const cy = noise2(worldX * 7, worldY * 7, 4700) * (tileSize - pixelSize * 4) + pixelSize * 2;
    
    ctx.fillStyle = '#e8f4ff';
    // Crystal shape
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
  palette: typeof TILE_PALETTES.lava
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Base lava with flow patterns
  for (let py2 = 0; py2 < tileSize; py2 += pixelSize) {
    for (let px2 = 0; px2 < tileSize; px2 += pixelSize) {
      const flow = Math.sin((worldX * 0.3 + worldY * 0.2 + px2 * 0.05) * Math.PI) * 0.3;
      const n = fractalNoise(worldX * 4 + px2 * 0.2, worldY * 4 + py2 * 0.2, 4800) + flow;
      
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
    }
  }
  
  // Add bright veins
  for (let i = 0; i < 5; i++) {
    const n = noise(worldX * 5 + i * 4, worldY * 5, 4900);
    if (n < 0.6) continue;
    
    const vx = (n * 700) % tileSize;
    const vy = (noise2(worldX + i, worldY, 5000) * 700) % tileSize;
    const vlen = pixelSize * (2 + Math.floor(n * 3));
    
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(px + vx, py + vy, vlen, pixelSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + vx + pixelSize, py + vy, pixelSize, pixelSize);
  }
  
  // Add dark crust patches
  for (let i = 0; i < 4; i++) {
    const n = noise(worldX * 6 + i * 5, worldY * 6, 5100);
    if (n < 0.7) continue;
    
    const cx = (n * 600) % (tileSize - pixelSize * 3);
    const cy = (noise2(worldX + i * 2, worldY, 5200) * 600) % (tileSize - pixelSize * 3);
    
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(px + cx, py + cy, pixelSize * 2, pixelSize * 2);
    ctx.fillStyle = palette.colors[5];
    ctx.fillRect(px + cx + pixelSize, py + cy + pixelSize, pixelSize, pixelSize);
  }
  
  // Add glowing embers
  if (noise(worldX * 8, worldY * 8, 5300) > 0.88) {
    const ex = noise(worldX * 9, worldY * 9, 5400) * (tileSize - pixelSize * 2);
    const ey = noise2(worldX * 9, worldY * 9, 5500) * (tileSize - pixelSize * 2);
    
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
  palette: typeof TILE_PALETTES.grass
) => {
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Base layer
  for (let py2 = 0; py2 < tileSize; py2 += pixelSize) {
    for (let px2 = 0; px2 < tileSize; px2 += pixelSize) {
      const n = fractalNoise(worldX * 4 + px2 * 0.2, worldY * 4 + py2 * 0.2, type.charCodeAt(0) * 100);
      const colorIndex = Math.floor(n * palette.colors.length);
      ctx.fillStyle = palette.colors[Math.max(0, Math.min(colorIndex, palette.colors.length - 1))];
      ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
    }
  }
  
  // Add texture details
  for (let i = 0; i < 6; i++) {
    const n = noise(worldX * 10 + i, worldY * 10, type.charCodeAt(0) * 10);
    if (n < 0.7) continue;
    
    const dx = (n * 800) % tileSize;
    const dy = (noise2(worldX + i, worldY, type.charCodeAt(0) * 20) * 800) % tileSize;
    
    ctx.fillStyle = n > 0.85 ? palette.highlight : palette.colors[4];
    ctx.fillRect(px + dx, py + dy, pixelSize, pixelSize);
  }
  
  // Add accents
  for (let i = 0; i < 3; i++) {
    const n = noise(worldX * 6 + i * 4, worldY * 6, type.charCodeAt(0) * 30);
    if (n < 0.8) continue;
    
    const ax = (n * 600) % (tileSize - pixelSize * 2);
    const ay = (noise2(worldX + i * 2, worldY, type.charCodeAt(0) * 40) * 600) % (tileSize - pixelSize * 2);
    
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
  map: WorldMap,
  worldX: number,
  worldY: number
) => {
  const palette = TILE_PALETTES[type];
  const px = x * tileSize;
  const py = y * tileSize;
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Draw tile based on type
  switch (type) {
    case 'grass':
      drawGrassTile(ctx, px, py, tileSize, worldX, worldY, palette);
      break;
    case 'water':
      drawWaterTile(ctx, px, py, tileSize, worldX, worldY, palette);
      break;
    case 'sand':
      drawSandTile(ctx, px, py, tileSize, worldX, worldY, palette);
      break;
    case 'forest':
    case 'jungle':
      drawForestTile(ctx, px, py, tileSize, worldX, worldY, palette);
      break;
    case 'stone':
    case 'mountain':
      drawStoneTile(ctx, px, py, tileSize, worldX, worldY, palette);
      break;
    case 'snow':
    case 'ice':
      drawSnowTile(ctx, px, py, tileSize, worldX, worldY, palette);
      break;
    case 'lava':
      drawLavaTile(ctx, px, py, tileSize, worldX, worldY, palette);
      break;
    default:
      drawGenericTile(ctx, px, py, tileSize, worldX, worldY, type, palette);
  }
  
  // Get neighbor types for transitions
  const getNeighbor = (dx: number, dy: number): TileType | null => {
    const tile = map.tiles[worldY + dy]?.[worldX + dx];
    return tile?.type || null;
  };
  
  const top = getNeighbor(0, -1);
  const bottom = getNeighbor(0, 1);
  const left = getNeighbor(-1, 0);
  const right = getNeighbor(1, 0);
  const topLeft = getNeighbor(-1, -1);
  const topRight = getNeighbor(1, -1);
  const bottomLeft = getNeighbor(-1, 1);
  const bottomRight = getNeighbor(1, 1);
  
  // Draw edge transitions with dithered blending
  const edgeSize = pixelSize * 3;
  
  const drawEdgeTransition = (
    edge: 'top' | 'bottom' | 'left' | 'right',
    neighborType: TileType | null
  ) => {
    if (!neighborType || neighborType === type) return;
    
    const neighborPalette = TILE_PALETTES[neighborType];
    if (!neighborPalette) return;
    
    for (let i = 0; i < tileSize; i += pixelSize) {
      const noiseVal = noise(worldX * 100 + i, worldY * 100 + i, edge.charCodeAt(0) * 10);
      const fadeDepth = edgeSize * (0.5 + noiseVal * 0.5);
      
      if (noiseVal > 0.5) continue;
      
      const blendColor = neighborPalette.colors[Math.floor(noiseVal * neighborPalette.colors.length)];
      ctx.fillStyle = blendColor;
      
      switch (edge) {
        case 'top':
          ctx.fillRect(px + i, py, pixelSize, fadeDepth);
          break;
        case 'bottom':
          ctx.fillRect(px + i, py + tileSize - fadeDepth, pixelSize, fadeDepth);
          break;
        case 'left':
          ctx.fillRect(px, py + i, fadeDepth, pixelSize);
          break;
        case 'right':
          ctx.fillRect(px + tileSize - fadeDepth, py + i, fadeDepth, pixelSize);
          break;
      }
    }
  };
  
  drawEdgeTransition('top', top);
  drawEdgeTransition('bottom', bottom);
  drawEdgeTransition('left', left);
  drawEdgeTransition('right', right);
  
  // Corner transitions
  const cornerSize = pixelSize * 4;
  
  const drawCornerTransition = (
    cornerX: number,
    cornerY: number,
    neighborType: TileType | null,
    corner: 'tl' | 'tr' | 'bl' | 'br'
  ) => {
    if (!neighborType || neighborType === type) return;
    
    const neighborPalette = TILE_PALETTES[neighborType];
    if (!neighborPalette) return;
    
    const grd = ctx.createRadialGradient(
      px + cornerX, py + cornerY, 0,
      px + cornerX, py + cornerY, cornerSize
    );
    grd.addColorStop(0, neighborPalette.colors[3]);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    
    ctx.beginPath();
    switch (corner) {
      case 'tl':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX + cornerSize, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY + cornerSize);
        break;
      case 'tr':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX - cornerSize, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY + cornerSize);
        break;
      case 'bl':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX + cornerSize, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY - cornerSize);
        break;
      case 'br':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX - cornerSize, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY - cornerSize);
        break;
    }
    ctx.closePath();
    ctx.fill();
  };
  
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
  
  // Ambient occlusion
  const aoSize = pixelSize * 2;
  
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  if (top && top !== type) {
    ctx.fillRect(px, py, tileSize, aoSize);
  }
  if (left && left !== type) {
    ctx.fillRect(px, py, aoSize, tileSize);
  }
  
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  if (bottom && bottom !== type) {
    ctx.fillRect(px, py + tileSize - aoSize, tileSize, aoSize);
  }
  if (right && right !== type) {
    ctx.fillRect(px + tileSize - aoSize, py, aoSize, tileSize);
  }
  
  // Corner shadows
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  if (top && top !== type && left && left !== type) {
    ctx.fillRect(px, py, aoSize * 2, aoSize * 2);
  }
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
      drawTile(ctx, tile.x, tile.y, tile.type, tileSize, map, tile.worldX, tile.worldY);
    }
  }, [visibleTilesData, tileSize, canvasWidth, canvasHeight, map]);
  
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

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { WorldMap, TileType } from '@/types/game';

interface CanvasTileRendererProps {
  map: WorldMap;
  viewportOffset: { x: number; y: number };
  viewportSize: { tilesX: number; tilesY: number };
  tileSize: number;
}

// Stardew Valley-inspired palette with richer color variation
const TILE_PALETTES: Record<TileType, { 
  base: string; 
  light: string; 
  lighter: string;
  dark: string; 
  darker: string;
  accent: string;
  accent2: string;
}> = {
  grass: { 
    base: '#5a9b5e', 
    light: '#6eb872', 
    lighter: '#8ed090',
    dark: '#4a8550', 
    darker: '#3a6840',
    accent: '#7cc97f', 
    accent2: '#4a7850'
  },
  water: { 
    base: '#4a9fc4', 
    light: '#6bb8d8', 
    lighter: '#8cd0eb',
    dark: '#3a7fa0', 
    darker: '#2a6080',
    accent: '#9be0ff', 
    accent2: '#357090'
  },
  sand: { 
    base: '#e0c890', 
    light: '#f0dca8', 
    lighter: '#fff0c0',
    dark: '#c8b078', 
    darker: '#a89058',
    accent: '#fff5d0', 
    accent2: '#d0b080'
  },
  stone: { 
    base: '#7a8590', 
    light: '#95a0ab', 
    lighter: '#b0bbc5',
    dark: '#5a6570', 
    darker: '#404a55',
    accent: '#c0cad5', 
    accent2: '#6a7580'
  },
  dirt: { 
    base: '#9a7855', 
    light: '#b8906a', 
    lighter: '#d0a880',
    dark: '#7a5840', 
    darker: '#5a4030',
    accent: '#c8a070', 
    accent2: '#8a6848'
  },
  forest: { 
    base: '#3a6848', 
    light: '#4a8058', 
    lighter: '#5a9868',
    dark: '#2a5038', 
    darker: '#1a3828',
    accent: '#5aa068', 
    accent2: '#2a4838'
  },
  snow: { 
    base: '#e8f0f8', 
    light: '#f0f8ff', 
    lighter: '#ffffff',
    dark: '#d0e0f0', 
    darker: '#b8d0e8',
    accent: '#ffffff', 
    accent2: '#c8d8e8'
  },
  ice: { 
    base: '#b0e0f0', 
    light: '#c8f0ff', 
    lighter: '#e0ffff',
    dark: '#90c8e0', 
    darker: '#70a8c8',
    accent: '#e8ffff', 
    accent2: '#80b8d0'
  },
  swamp: { 
    base: '#5a6848', 
    light: '#6a7858', 
    lighter: '#7a8868',
    dark: '#4a5838', 
    darker: '#3a4828',
    accent: '#708060', 
    accent2: '#506040'
  },
  lava: { 
    base: '#e05020', 
    light: '#ff7040', 
    lighter: '#ff9060',
    dark: '#c03810', 
    darker: '#a02808',
    accent: '#ffb080', 
    accent2: '#ff5030'
  },
  mountain: { 
    base: '#686878', 
    light: '#808898', 
    lighter: '#98a0b0',
    dark: '#505060', 
    darker: '#383848',
    accent: '#a8b0c0', 
    accent2: '#585868'
  },
  jungle: { 
    base: '#2a5838', 
    light: '#3a7048', 
    lighter: '#4a8858',
    dark: '#1a4028', 
    darker: '#0a2818',
    accent: '#4a9058', 
    accent2: '#204830'
  },
};

// Improved noise with multiple octaves for natural variation
const noise = (x: number, y: number, seed: number = 0): number => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
};

const noise2 = (x: number, y: number, seed: number = 0): number => {
  const n = Math.sin(x * 7.432 + y * 45.123 + seed * 2.5) * 23421.631;
  return n - Math.floor(n);
};

// Fractal noise for more organic patterns
const fractalNoise = (x: number, y: number, seed: number, octaves: number = 3): number => {
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

// Draw decorative elements on tiles
const drawDecorations = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  type: TileType,
  tileSize: number,
  worldX: number,
  worldY: number,
  palette: typeof TILE_PALETTES.grass
) => {
  const decorSeed = worldX * 1000 + worldY;
  const decorNoise = noise(worldX * 3.7, worldY * 3.7, decorSeed);
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  if (type === 'grass') {
    // Draw grass tufts
    if (decorNoise > 0.7) {
      const tufts = Math.floor(noise2(worldX, worldY, 50) * 4) + 2;
      for (let i = 0; i < tufts; i++) {
        const tx = noise(worldX + i, worldY, 10) * (tileSize - pixelSize * 3) + pixelSize;
        const ty = noise(worldX, worldY + i, 20) * (tileSize - pixelSize * 4) + pixelSize * 2;
        const height = pixelSize * (2 + Math.floor(noise(worldX + i, worldY + i, 30) * 2));
        
        // Grass blade with gradient
        ctx.fillStyle = palette.accent;
        ctx.fillRect(px + tx, py + ty - height, pixelSize, height);
        ctx.fillStyle = palette.lighter;
        ctx.fillRect(px + tx, py + ty - height, pixelSize, pixelSize);
      }
    }
    
    // Small flowers occasionally
    if (decorNoise > 0.92) {
      const fx = noise(worldX * 2, worldY * 2, 100) * (tileSize - pixelSize * 4) + pixelSize * 2;
      const fy = noise(worldX * 2, worldY * 2, 200) * (tileSize - pixelSize * 4) + pixelSize * 2;
      const flowerColor = ['#ff8888', '#ffff88', '#88aaff', '#ffffff'][Math.floor(decorNoise * 100) % 4];
      ctx.fillStyle = flowerColor;
      ctx.fillRect(px + fx, py + fy, pixelSize, pixelSize);
      ctx.fillRect(px + fx - pixelSize, py + fy, pixelSize, pixelSize);
      ctx.fillRect(px + fx + pixelSize, py + fy, pixelSize, pixelSize);
      ctx.fillRect(px + fx, py + fy - pixelSize, pixelSize, pixelSize);
      ctx.fillStyle = '#ffee00';
      ctx.fillRect(px + fx, py + fy, pixelSize, pixelSize);
    }
  } else if (type === 'sand') {
    // Shells and pebbles
    if (decorNoise > 0.85) {
      const sx = noise(worldX * 5, worldY * 5, 300) * (tileSize - pixelSize * 3) + pixelSize;
      const sy = noise(worldX * 5, worldY * 5, 400) * (tileSize - pixelSize * 3) + pixelSize;
      ctx.fillStyle = decorNoise > 0.92 ? '#f8e8d8' : palette.darker;
      ctx.fillRect(px + sx, py + sy, pixelSize, pixelSize);
      if (decorNoise > 0.92) {
        ctx.fillRect(px + sx + pixelSize, py + sy, pixelSize, pixelSize);
      }
    }
  } else if (type === 'forest' || type === 'jungle') {
    // Leaf clusters and undergrowth
    if (decorNoise > 0.5) {
      const clusters = Math.floor(decorNoise * 5) + 1;
      for (let i = 0; i < clusters; i++) {
        const cx = noise(worldX + i * 3, worldY, 500) * (tileSize - pixelSize * 2);
        const cy = noise(worldX, worldY + i * 3, 600) * (tileSize - pixelSize * 2);
        ctx.fillStyle = i % 2 === 0 ? palette.accent : palette.lighter;
        ctx.fillRect(px + cx, py + cy, pixelSize, pixelSize);
      }
    }
    
    // Mushrooms occasionally
    if (decorNoise > 0.88 && type === 'forest') {
      const mx = noise(worldX * 4, worldY * 4, 700) * (tileSize - pixelSize * 4) + pixelSize * 2;
      const my = tileSize - pixelSize * 3;
      // Stem
      ctx.fillStyle = '#e8dcd0';
      ctx.fillRect(px + mx, py + my, pixelSize, pixelSize * 2);
      // Cap
      ctx.fillStyle = '#c83030';
      ctx.fillRect(px + mx - pixelSize, py + my - pixelSize, pixelSize * 3, pixelSize);
      ctx.fillRect(px + mx, py + my - pixelSize * 2, pixelSize, pixelSize);
      // Spots
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + mx, py + my - pixelSize, pixelSize, pixelSize);
    }
  } else if (type === 'stone' || type === 'mountain') {
    // Rocks and mineral veins
    if (decorNoise > 0.8) {
      const rx = noise(worldX * 6, worldY * 6, 800) * (tileSize - pixelSize * 4) + pixelSize * 2;
      const ry = noise(worldX * 6, worldY * 6, 900) * (tileSize - pixelSize * 4) + pixelSize * 2;
      const rockSize = pixelSize * (decorNoise > 0.9 ? 2 : 1);
      ctx.fillStyle = palette.lighter;
      ctx.fillRect(px + rx, py + ry, rockSize, rockSize);
      ctx.fillStyle = palette.darker;
      ctx.fillRect(px + rx + rockSize, py + ry + rockSize / 2, pixelSize, pixelSize);
    }
    
    // Mineral sparkles
    if (decorNoise > 0.95) {
      ctx.fillStyle = '#c8d0e0';
      const sparkles = 2;
      for (let i = 0; i < sparkles; i++) {
        const spx = noise(worldX + i, worldY, 1000) * tileSize;
        const spy = noise(worldX, worldY + i, 1100) * tileSize;
        ctx.fillRect(px + spx, py + spy, pixelSize / 2, pixelSize / 2);
      }
    }
  } else if (type === 'snow') {
    // Snow sparkles
    if (decorNoise > 0.7) {
      const sparkles = Math.floor(decorNoise * 6);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < sparkles; i++) {
        const spx = noise(worldX + i * 2, worldY, 1200) * tileSize;
        const spy = noise(worldX, worldY + i * 2, 1300) * tileSize;
        ctx.fillRect(px + spx, py + spy, pixelSize / 2, pixelSize / 2);
      }
    }
  } else if (type === 'water') {
    // Foam/bubbles near surface
    if (decorNoise > 0.9) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      const bx = noise(worldX * 8, worldY * 8, 1400) * (tileSize - pixelSize * 2);
      const by = noise(worldX * 8, worldY * 8, 1500) * (tileSize - pixelSize * 2);
      ctx.beginPath();
      ctx.arc(px + bx + pixelSize, py + by + pixelSize, pixelSize, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'swamp') {
    // Lily pads and bubbles
    if (decorNoise > 0.8) {
      const lx = noise(worldX * 3, worldY * 3, 1600) * (tileSize - pixelSize * 6) + pixelSize * 3;
      const ly = noise(worldX * 3, worldY * 3, 1700) * (tileSize - pixelSize * 6) + pixelSize * 3;
      ctx.fillStyle = '#4a8848';
      ctx.beginPath();
      ctx.arc(px + lx, py + ly, pixelSize * 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Lily flower
      if (decorNoise > 0.92) {
        ctx.fillStyle = '#ffaacc';
        ctx.fillRect(px + lx - pixelSize / 2, py + ly - pixelSize / 2, pixelSize, pixelSize);
      }
    }
  }
};

// Draw a single tile with Stardew Valley-style pixel art
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
  
  // Pixel size for the 32-bit look
  const pixelSize = Math.max(2, Math.floor(tileSize / 16));
  
  // Draw base gradient fill for depth
  const gradient = ctx.createLinearGradient(px, py, px, py + tileSize);
  gradient.addColorStop(0, palette.light);
  gradient.addColorStop(0.3, palette.base);
  gradient.addColorStop(0.7, palette.base);
  gradient.addColorStop(1, palette.dark);
  ctx.fillStyle = gradient;
  ctx.fillRect(px, py, tileSize, tileSize);
  
  // Add rich texture based on tile type
  for (let py2 = 0; py2 < tileSize; py2 += pixelSize) {
    for (let px2 = 0; px2 < tileSize; px2 += pixelSize) {
      const noiseVal = fractalNoise(worldX * 8 + px2 / pixelSize, worldY * 8 + py2 / pixelSize, type.charCodeAt(0));
      const noiseVal2 = noise2(worldX * 16 + px2, worldY * 16 + py2, type.charCodeAt(0) * 2);
      
      if (type === 'grass') {
        // Rich grass texture with multiple shades
        if (noiseVal > 0.65) {
          ctx.fillStyle = palette.lighter;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.35) {
          ctx.fillStyle = noiseVal < 0.2 ? palette.darker : palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Add subtle horizontal striation
        if (noiseVal2 > 0.85 && py2 % (pixelSize * 2) === 0) {
          ctx.fillStyle = palette.accent2;
          ctx.fillRect(px + px2, py + py2, pixelSize * 2, pixelSize / 2);
        }
      } else if (type === 'water') {
        // Animated-style water with depth layers
        const wave = Math.sin((worldX * 0.5 + worldY * 0.3 + px2 / tileSize * 2) * Math.PI) * 0.5 + 0.5;
        const depth = py2 / tileSize;
        
        if (noiseVal * wave > 0.55) {
          ctx.fillStyle = depth < 0.3 ? palette.lighter : palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize * 2, pixelSize);
        } else if (noiseVal < 0.25 + depth * 0.2) {
          ctx.fillStyle = palette.darker;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Specular highlights
        if (noiseVal > 0.9 && depth < 0.4) {
          ctx.fillStyle = palette.accent;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize / 2);
        }
      } else if (type === 'sand') {
        // Dunes and texture variation
        const dunePattern = Math.sin((worldX + px2 / tileSize) * 1.5) * 0.3;
        if (noiseVal + dunePattern > 0.7) {
          ctx.fillStyle = palette.lighter;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.25) {
          ctx.fillStyle = noiseVal < 0.12 ? palette.darker : palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Subtle grain
        if (noiseVal2 > 0.9) {
          ctx.fillStyle = palette.accent;
          ctx.fillRect(px + px2, py + py2, pixelSize / 2, pixelSize / 2);
        }
      } else if (type === 'stone' || type === 'mountain') {
        // Rocky texture with cracks and layers
        if (noiseVal > 0.7) {
          ctx.fillStyle = palette.lighter;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.2) {
          ctx.fillStyle = palette.darker;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Rock strata lines
        if (noiseVal2 > 0.88 && noiseVal > 0.4 && noiseVal < 0.6) {
          ctx.fillStyle = palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize * 3, pixelSize / 2);
        }
        // Mineral flecks
        if (noiseVal2 > 0.96) {
          ctx.fillStyle = type === 'mountain' ? '#8090a0' : palette.accent;
          ctx.fillRect(px + px2, py + py2, pixelSize / 2, pixelSize / 2);
        }
      } else if (type === 'forest') {
        // Dense canopy look
        if (noiseVal > 0.6) {
          ctx.fillStyle = noiseVal > 0.8 ? palette.lighter : palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.3) {
          ctx.fillStyle = noiseVal < 0.15 ? palette.darker : palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Dappled sunlight effect
        if (noiseVal2 > 0.92) {
          ctx.fillStyle = palette.accent;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
      } else if (type === 'jungle') {
        // Very dense tropical foliage
        if (noiseVal > 0.55) {
          ctx.fillStyle = noiseVal > 0.75 ? palette.lighter : palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.35) {
          ctx.fillStyle = noiseVal < 0.18 ? palette.darker : palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Bright accent foliage
        if (noiseVal2 > 0.88) {
          ctx.fillStyle = palette.accent;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
      } else if (type === 'snow') {
        // Soft snow texture
        if (noiseVal > 0.6) {
          ctx.fillStyle = palette.lighter;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.25) {
          ctx.fillStyle = palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Snow crystals
        if (noiseVal2 > 0.94) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px + px2, py + py2, pixelSize / 2, pixelSize / 2);
        }
      } else if (type === 'ice') {
        // Crystalline ice
        if (noiseVal > 0.6) {
          ctx.fillStyle = noiseVal > 0.8 ? palette.lighter : palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.3) {
          ctx.fillStyle = palette.darker;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Ice cracks
        if (noiseVal2 > 0.9 && noiseVal > 0.4 && noiseVal < 0.5) {
          ctx.fillStyle = palette.accent;
          ctx.fillRect(px + px2, py + py2, pixelSize * 2, pixelSize / 2);
        }
      } else if (type === 'dirt') {
        // Rich soil texture
        if (noiseVal > 0.65) {
          ctx.fillStyle = palette.lighter;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.3) {
          ctx.fillStyle = noiseVal < 0.15 ? palette.darker : palette.dark;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Pebbles
        if (noiseVal2 > 0.92) {
          ctx.fillStyle = '#8a8070';
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
      } else if (type === 'swamp') {
        // Murky water patches
        const murk = Math.sin(worldX * 0.8 + worldY * 0.6) * 0.2;
        if (noiseVal + murk > 0.6) {
          ctx.fillStyle = palette.light;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.35) {
          ctx.fillStyle = palette.darker;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Algae spots
        if (noiseVal2 > 0.88) {
          ctx.fillStyle = '#5a8050';
          ctx.fillRect(px + px2, py + py2, pixelSize * 1.5, pixelSize);
        }
      } else if (type === 'lava') {
        // Glowing lava with crust
        const glow = Math.sin(worldX * 0.5 + worldY * 0.4) * 0.3 + 0.5;
        if (noiseVal * glow > 0.45) {
          ctx.fillStyle = noiseVal > 0.75 ? palette.accent : palette.lighter;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        } else if (noiseVal < 0.25) {
          ctx.fillStyle = palette.darker;
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
        // Hot spots
        if (noiseVal2 > 0.9) {
          ctx.fillStyle = '#ffcc60';
          ctx.fillRect(px + px2, py + py2, pixelSize, pixelSize);
        }
      }
    }
  }
  
  // Draw decorative elements
  drawDecorations(ctx, px, py, type, tileSize, worldX, worldY, palette);
  
  // Draw corner and edge blending
  const cornerSize = Math.max(pixelSize * 2, tileSize / 8);
  
  const top = getNeighbor(0, -1);
  const bottom = getNeighbor(0, 1);
  const left = getNeighbor(-1, 0);
  const right = getNeighbor(1, 0);
  const topLeft = getNeighbor(-1, -1);
  const topRight = getNeighbor(1, -1);
  const bottomLeft = getNeighbor(-1, 1);
  const bottomRight = getNeighbor(1, 1);
  
  // Helper to draw smooth corner transition
  const drawCornerTransition = (
    cornerX: number,
    cornerY: number,
    neighborType: TileType | null,
    corner: 'tl' | 'tr' | 'bl' | 'br'
  ) => {
    if (!neighborType || neighborType === type) return;
    
    const neighborPalette = TILE_PALETTES[neighborType];
    if (!neighborPalette) return;
    
    const blendSize = cornerSize;
    
    // Draw gradient corner blend for smoother transition
    const grd = ctx.createRadialGradient(
      px + cornerX, py + cornerY, 0,
      px + cornerX, py + cornerY, blendSize
    );
    grd.addColorStop(0, neighborPalette.base);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    
    ctx.beginPath();
    switch (corner) {
      case 'tl':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX + blendSize * 1.2, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY + blendSize * 1.2);
        break;
      case 'tr':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX - blendSize * 1.2, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY + blendSize * 1.2);
        break;
      case 'bl':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX + blendSize * 1.2, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY - blendSize * 1.2);
        break;
      case 'br':
        ctx.moveTo(px + cornerX, py + cornerY);
        ctx.lineTo(px + cornerX - blendSize * 1.2, py + cornerY);
        ctx.lineTo(px + cornerX, py + cornerY - blendSize * 1.2);
        break;
    }
    ctx.closePath();
    ctx.fill();
  };
  
  // Draw edge transitions with dithered blending
  const drawEdgeTransition = (
    edge: 'top' | 'bottom' | 'left' | 'right',
    neighborType: TileType | null
  ) => {
    if (!neighborType || neighborType === type) return;
    
    const neighborPalette = TILE_PALETTES[neighborType];
    if (!neighborPalette) return;
    
    const edgeSize = pixelSize * 3;
    
    // Dithered edge blend
    for (let i = 0; i < tileSize; i += pixelSize) {
      const noiseVal = noise(worldX * 100 + i, worldY * 100 + i, edge.charCodeAt(0) * 10);
      const fadeDepth = edgeSize * (1 - noiseVal * 0.5);
      
      if (noiseVal > 0.4) continue;
      
      ctx.fillStyle = neighborPalette.base;
      
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
  
  // Inner corner blends
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
  
  // Enhanced ambient occlusion
  const aoSize = pixelSize * 1.5;
  
  // Top/left edge shadows
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  if (top && top !== type) {
    ctx.fillRect(px, py, tileSize, aoSize);
  }
  if (left && left !== type) {
    ctx.fillRect(px, py, aoSize, tileSize);
  }
  
  // Bottom/right edge highlights
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  if (bottom && bottom !== type) {
    ctx.fillRect(px, py + tileSize - aoSize, tileSize, aoSize);
  }
  if (right && right !== type) {
    ctx.fillRect(px + tileSize - aoSize, py, aoSize, tileSize);
  }
  
  // Inner corner shadows
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
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

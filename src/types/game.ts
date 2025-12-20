export type TileType = 'grass' | 'water' | 'sand' | 'stone' | 'dirt' | 'forest' | 'snow' | 'swamp' | 'lava' | 'ice' | 'mountain' | 'jungle';

export interface Position {
  x: number;
  y: number;
}

export interface RecipeIngredient {
  resourceId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  outputQuantity: number;
}

export interface Resource {
  id: string;
  name: string;
  icon: string;
  iconType?: 'emoji' | 'image'; // 'emoji' (default) or 'image' (URL)
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description: string;
  gatherTime: number;
  spawnTiles: TileType[];
  spawnChance: number;
  coinValue: number;
  recipes?: Recipe[];
  consumable?: boolean;
  healthGain?: number;
  canInflictDamage?: boolean;
  damage?: number;
  isContainer?: boolean; // Can hold inventory
  isFloating?: boolean; // Visible on tile, gathered when entering
  placeable?: boolean; // Can be placed on a tile
  passable?: boolean; // If placeable, can players walk through it
  category?: string; // Resource category for filtering
  hasLimitedLifetime?: boolean; // If true, resource expires after lifetime hours
  lifetimeHours?: number; // Number of game hours before resource expires
  tileWidth?: number; // Width in tiles (0 = smaller than tile, 1 = default, 2+ = multi-tile)
  tileHeight?: number; // Height in tiles (0 = smaller than tile, 1 = default, 2+ = multi-tile)
  useLife?: boolean; // If true, using the item decreases its life
  lifeDecreasePerUse?: number; // Amount of life decreased per use (default 100 = full consumption)
}

export interface MapTile {
  type: TileType;
  resources: string[];
  walkable: boolean;
  claimedBy?: string;
  name?: string;
}

export interface WorldMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: MapTile[][];
  spawnPoint: Position;
}

export interface InventorySlot {
  resourceId: string | null;
  quantity: number;
}

export interface Sovereignty {
  name: string;
  flag: string;
  motto: string;
  foundedAt: number;
}

export interface Market {
  id: string;
  position: Position; // Top-left corner of the 3x3 market
  name: string;
}

export interface GameWorld {
  id: string;
  name: string;
  map: WorldMap;
  resources: Resource[];
  inventory: InventorySlot[];
  playerPosition: Position;
  userId: string;
  userColor: string;
  coins: number;
  sovereignty?: Sovereignty;
  createdAt: string;
  health: number;
  xp: number; // Experience points - gains 1 per game day
  joinCode?: string;
  enableMarkets?: boolean;
  markets?: Market[];
}

export const TILE_TYPES: { type: TileType; label: string; walkable: boolean; color: string; baseValue: number }[] = [
  { type: 'grass', label: 'Grass', walkable: true, color: 'bg-green-600', baseValue: 5 },
  { type: 'forest', label: 'Forest', walkable: true, color: 'bg-green-900', baseValue: 10 },
  { type: 'jungle', label: 'Jungle', walkable: true, color: 'bg-emerald-800', baseValue: 15 },
  { type: 'dirt', label: 'Dirt', walkable: true, color: 'bg-amber-800', baseValue: 3 },
  { type: 'sand', label: 'Sand', walkable: true, color: 'bg-yellow-500', baseValue: 4 },
  { type: 'stone', label: 'Stone', walkable: true, color: 'bg-gray-500', baseValue: 8 },
  { type: 'mountain', label: 'Mountain', walkable: true, color: 'bg-gray-700', baseValue: 20 },
  { type: 'snow', label: 'Snow', walkable: true, color: 'bg-slate-100', baseValue: 6 },
  { type: 'ice', label: 'Ice', walkable: true, color: 'bg-cyan-200', baseValue: 7 },
  { type: 'swamp', label: 'Swamp', walkable: true, color: 'bg-lime-800', baseValue: 8 },
  { type: 'water', label: 'Water', walkable: false, color: 'bg-blue-500', baseValue: 0 },
  { type: 'lava', label: 'Lava', walkable: false, color: 'bg-orange-600', baseValue: 50 },
];

export const TILE_COLORS: Record<TileType, string> = {
  grass: 'tile-grass',
  water: 'tile-water',
  sand: 'tile-sand',
  stone: 'tile-stone',
  dirt: 'tile-dirt',
  forest: 'tile-forest',
  snow: 'tile-snow',
  ice: 'tile-ice',
  swamp: 'tile-swamp',
  lava: 'tile-lava',
  mountain: 'tile-mountain',
  jungle: 'tile-jungle',
};

export const RARITY_COLORS: Record<Resource['rarity'], string> = {
  common: 'text-gray-300',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-amber-400',
};

export const USER_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export const DEFAULT_RESOURCES: Resource[] = [
  { id: 'wood', name: 'Wood', icon: '🪵', rarity: 'common', description: 'Basic building material', gatherTime: 2, spawnTiles: ['forest', 'grass', 'jungle'], spawnChance: 0.4, coinValue: 5 },
  { id: 'stone', name: 'Stone', icon: '🪨', rarity: 'common', description: 'Hard construction material', gatherTime: 3, spawnTiles: ['stone', 'dirt', 'mountain'], spawnChance: 0.5, coinValue: 8 },
  { id: 'iron', name: 'Iron Ore', icon: '⛏️', rarity: 'uncommon', description: 'Raw iron for smelting', gatherTime: 5, spawnTiles: ['stone', 'mountain'], spawnChance: 0.2, coinValue: 25 },
  { id: 'gold', name: 'Gold Ore', icon: '✨', rarity: 'rare', description: 'Precious golden ore', gatherTime: 8, spawnTiles: ['stone', 'mountain'], spawnChance: 0.08, coinValue: 100 },
  { id: 'coal', name: 'Coal', icon: '⚫', rarity: 'common', description: 'Fuel for smelting', gatherTime: 2, spawnTiles: ['stone', 'dirt', 'mountain'], spawnChance: 0.3, coinValue: 6 },
  { id: 'fiber', name: 'Fiber', icon: '🌿', rarity: 'common', description: 'Plant fibers', gatherTime: 1, spawnTiles: ['grass', 'forest', 'jungle', 'swamp'], spawnChance: 0.35, coinValue: 3 },
  { id: 'fish', name: 'Fish', icon: '🐟', rarity: 'common', description: 'Fresh catch', gatherTime: 3, spawnTiles: ['sand'], spawnChance: 0.3, coinValue: 12 },
  { id: 'crystal', name: 'Crystal', icon: '💎', rarity: 'epic', description: 'Magical crystal', gatherTime: 10, spawnTiles: ['stone', 'ice', 'mountain'], spawnChance: 0.03, coinValue: 500 },
  { id: 'mushroom', name: 'Mushroom', icon: '🍄', rarity: 'uncommon', description: 'Forest fungus', gatherTime: 2, spawnTiles: ['forest', 'dirt', 'swamp', 'jungle'], spawnChance: 0.2, coinValue: 15 },
  { id: 'cactus', name: 'Cactus', icon: '🌵', rarity: 'uncommon', description: 'Desert plant', gatherTime: 3, spawnTiles: ['sand'], spawnChance: 0.25, coinValue: 18 },
  { id: 'shell', name: 'Shell', icon: '🐚', rarity: 'common', description: 'Sea shell', gatherTime: 1, spawnTiles: ['sand'], spawnChance: 0.3, coinValue: 8 },
  { id: 'flower', name: 'Flower', icon: '🌸', rarity: 'common', description: 'Pretty flower', gatherTime: 1, spawnTiles: ['grass', 'jungle'], spawnChance: 0.2, coinValue: 4 },
  // New biome resources
  { id: 'snowball', name: 'Snowball', icon: '❄️', rarity: 'common', description: 'Packed snow', gatherTime: 1, spawnTiles: ['snow', 'ice'], spawnChance: 0.4, coinValue: 3 },
  { id: 'ice-shard', name: 'Ice Shard', icon: '🧊', rarity: 'uncommon', description: 'Frozen crystal', gatherTime: 3, spawnTiles: ['ice'], spawnChance: 0.25, coinValue: 20 },
  { id: 'obsidian', name: 'Obsidian', icon: '🖤', rarity: 'rare', description: 'Volcanic glass', gatherTime: 6, spawnTiles: ['lava', 'mountain'], spawnChance: 0.15, coinValue: 80 },
  { id: 'sulfur', name: 'Sulfur', icon: '💛', rarity: 'uncommon', description: 'Volcanic mineral', gatherTime: 4, spawnTiles: ['lava'], spawnChance: 0.3, coinValue: 35 },
  { id: 'swamp-moss', name: 'Swamp Moss', icon: '🌱', rarity: 'common', description: 'Damp vegetation', gatherTime: 1, spawnTiles: ['swamp'], spawnChance: 0.4, coinValue: 5 },
  { id: 'frog', name: 'Frog', icon: '🐸', rarity: 'uncommon', description: 'Swamp creature', gatherTime: 2, spawnTiles: ['swamp'], spawnChance: 0.15, coinValue: 22 },
  { id: 'vine', name: 'Vine', icon: '🪴', rarity: 'common', description: 'Jungle vine', gatherTime: 2, spawnTiles: ['jungle'], spawnChance: 0.35, coinValue: 7 },
  { id: 'exotic-fruit', name: 'Exotic Fruit', icon: '🥭', rarity: 'uncommon', description: 'Tropical delicacy', gatherTime: 3, spawnTiles: ['jungle'], spawnChance: 0.2, coinValue: 25 },
  { id: 'parrot-feather', name: 'Parrot Feather', icon: '🪶', rarity: 'rare', description: 'Colorful plume', gatherTime: 4, spawnTiles: ['jungle'], spawnChance: 0.08, coinValue: 60 },
  // Craftable resources
  { 
    id: 'iron-bar', 
    name: 'Iron Bar', 
    icon: '🔩', 
    rarity: 'uncommon', 
    description: 'Smelted iron', 
    gatherTime: 0, 
    spawnTiles: [], 
    spawnChance: 0, 
    coinValue: 60,
    recipes: [{ id: 'iron-bar-1', name: 'Smelt Iron', ingredients: [{ resourceId: 'iron', quantity: 2 }, { resourceId: 'coal', quantity: 1 }], outputQuantity: 1 }]
  },
  { 
    id: 'gold-bar', 
    name: 'Gold Bar', 
    icon: '🥇', 
    rarity: 'rare', 
    description: 'Smelted gold', 
    gatherTime: 0, 
    spawnTiles: [], 
    spawnChance: 0, 
    coinValue: 250,
    recipes: [{ id: 'gold-bar-1', name: 'Smelt Gold', ingredients: [{ resourceId: 'gold', quantity: 2 }, { resourceId: 'coal', quantity: 2 }], outputQuantity: 1 }]
  },
  { 
    id: 'plank', 
    name: 'Plank', 
    icon: '🪵', 
    rarity: 'common', 
    description: 'Processed wood', 
    gatherTime: 0, 
    spawnTiles: [], 
    spawnChance: 0, 
    coinValue: 12,
    recipes: [{ id: 'plank-1', name: 'Cut Planks', ingredients: [{ resourceId: 'wood', quantity: 2 }], outputQuantity: 2 }]
  },
  { 
    id: 'rope', 
    name: 'Rope', 
    icon: '🪢', 
    rarity: 'common', 
    description: 'Woven rope', 
    gatherTime: 0, 
    spawnTiles: [], 
    spawnChance: 0, 
    coinValue: 15,
    recipes: [{ id: 'rope-1', name: 'Weave Rope', ingredients: [{ resourceId: 'fiber', quantity: 3 }], outputQuantity: 1 }]
  },
];

export const calculateTileValue = (tile: MapTile, resources: Resource[]): number => {
  const tileInfo = TILE_TYPES.find(t => t.type === tile.type);
  const baseValue = tileInfo?.baseValue || 0;
  
  const resourceValue = tile.resources.reduce((sum, resId) => {
    const resource = resources.find(r => r.id === resId);
    return sum + (resource?.coinValue || 0);
  }, 0);
  
  return baseValue + resourceValue;
};

// Simplex-like noise generator for natural terrain
const createNoise = (seed: number) => {
  const permutation = new Array(512);
  const p = new Array(256);
  
  // Initialize permutation with seed
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) permutation[i] = p[i & 255];
  
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  
  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    
    const aa = permutation[permutation[X] + Y];
    const ab = permutation[permutation[X] + Y + 1];
    const ba = permutation[permutation[X + 1] + Y];
    const bb = permutation[permutation[X + 1] + Y + 1];
    
    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  };
};

// Multi-octave noise for natural terrain
const fractalNoise = (noise: (x: number, y: number) => number, x: number, y: number, octaves: number = 4, persistence: number = 0.5): number => {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    total += noise(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  
  return total / maxValue;
};

export const generateMap = (width: number, height: number, resources: Resource[]): WorldMap => {
  const tiles: MapTile[][] = [];
  const seed = Math.floor(Math.random() * 2147483647);
  
  // Create different noise layers for terrain features
  const elevationNoise = createNoise(seed);
  const moistureNoise = createNoise(seed + 1000);
  const temperatureNoise = createNoise(seed + 2000);
  const detailNoise = createNoise(seed + 3000);
  
  // Scale factors for natural-looking terrain
  const elevationScale = 0.02;
  const moistureScale = 0.015;
  const temperatureScale = 0.01;
  const detailScale = 0.08;
  
  for (let y = 0; y < height; y++) {
    const row: MapTile[] = [];
    for (let x = 0; x < width; x++) {
      // Generate multi-layered noise values
      const elevation = fractalNoise(elevationNoise, x * elevationScale, y * elevationScale, 5, 0.5);
      const moisture = fractalNoise(moistureNoise, x * moistureScale, y * moistureScale, 4, 0.6);
      const detail = fractalNoise(detailNoise, x * detailScale, y * detailScale, 2, 0.4);
      
      // Temperature based on latitude (y position) with noise variation
      const latitudeTemp = 1 - Math.abs(y / height - 0.5) * 2; // Warmer in middle
      const tempVariation = fractalNoise(temperatureNoise, x * temperatureScale, y * temperatureScale, 3, 0.5) * 0.3;
      const temperature = latitudeTemp + tempVariation;
      
      // Determine tile type based on biome logic
      let type: TileType = determineBiome(elevation, moisture, temperature, detail);
      
      const tileInfo = TILE_TYPES.find(t => t.type === type)!;
      row.push({ type, walkable: tileInfo.walkable, resources: [] });
    }
    tiles.push(row);
  }
  
  // Apply cellular automata smoothing for more natural edges
  smoothTerrain(tiles, 2);
  
  seedResources(tiles, resources);
  
  // Find a valid spawn point (walkable tile near center)
  const spawnPoint = findSpawnPoint(tiles, width, height);
  
  return {
    id: 'main-map',
    name: 'World',
    width,
    height,
    tiles,
    spawnPoint,
  };
};

const determineBiome = (elevation: number, moisture: number, temperature: number, detail: number): TileType => {
  // Ocean and water bodies (low elevation)
  if (elevation < -0.3) return 'water';
  if (elevation < -0.15) return moisture > 0.2 ? 'water' : 'sand';
  
  // Beach/coast (just above water level)
  if (elevation < -0.05) return 'sand';
  
  // Frozen biomes (cold temperature)
  if (temperature < 0.25) {
    if (elevation < -0.1) return 'ice';
    if (elevation > 0.4) return 'mountain';
    if (elevation > 0.25) return 'stone';
    return 'snow';
  }
  
  // Hot biomes (high temperature)
  if (temperature > 0.75) {
    if (elevation > 0.5 && detail > 0.3) return 'lava';
    if (moisture > 0.5) return 'jungle';
    if (moisture > 0.3) return 'swamp';
    if (moisture < 0) return 'sand';
    return 'grass';
  }
  
  // Temperate biomes (moderate temperature)
  if (elevation > 0.55) return 'mountain';
  if (elevation > 0.35) return 'stone';
  if (elevation > 0.2) {
    return moisture > 0.2 ? 'forest' : 'dirt';
  }
  
  // Lowlands
  if (moisture > 0.4) return 'forest';
  if (moisture > 0.2) return 'grass';
  if (moisture < -0.2) return 'sand';
  if (detail < -0.2 && moisture > 0) return 'swamp';
  
  return 'grass';
};

const smoothTerrain = (tiles: MapTile[][], iterations: number) => {
  const height = tiles.length;
  const width = tiles[0].length;
  
  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const neighbors: TileType[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx !== 0 || dy !== 0) {
              neighbors.push(tiles[y + dy][x + dx].type);
            }
          }
        }
        
        // Count occurrences of each type
        const counts = new Map<TileType, number>();
        neighbors.forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
        
        // If current tile is isolated (surrounded by different types), smooth it
        const currentCount = counts.get(tiles[y][x].type) || 0;
        if (currentCount < 2) {
          // Find most common neighbor type that's similar
          let maxCount = 0;
          let dominantType = tiles[y][x].type;
          counts.forEach((count, type) => {
            if (count > maxCount && areSimilarTiles(tiles[y][x].type, type)) {
              maxCount = count;
              dominantType = type;
            }
          });
          if (maxCount >= 4) {
            const tileInfo = TILE_TYPES.find(t => t.type === dominantType)!;
            tiles[y][x] = { type: dominantType, walkable: tileInfo.walkable, resources: [] };
          }
        }
      }
    }
  }
};

const areSimilarTiles = (a: TileType, b: TileType): boolean => {
  const groups: TileType[][] = [
    ['water', 'ice'],
    ['sand', 'dirt'],
    ['grass', 'forest', 'jungle'],
    ['stone', 'mountain'],
    ['snow', 'ice'],
    ['swamp', 'grass'],
  ];
  return groups.some(group => group.includes(a) && group.includes(b));
};

const findSpawnPoint = (tiles: MapTile[][], width: number, height: number): { x: number; y: number } => {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  // Spiral outward from center to find walkable tile
  for (let radius = 0; radius < Math.max(width, height); radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
          const x = centerX + dx;
          const y = centerY + dy;
          if (x >= 0 && x < width && y >= 0 && y < height && tiles[y][x].walkable) {
            return { x, y };
          }
        }
      }
    }
  }
  
  return { x: centerX, y: centerY };
};

export const seedResources = (tiles: MapTile[][], resources: Resource[]) => {
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      const tile = tiles[y][x];
      tile.resources = [];
      
      const validResources = resources.filter(r => r.spawnTiles.includes(tile.type));
      
      for (const resource of validResources) {
        if (Math.random() < resource.spawnChance) {
          tile.resources.push(resource.id);
        }
      }
    }
  }
};

export const createEmptyInventory = (size: number = 30): InventorySlot[] =>
  Array.from({ length: size }, () => ({ resourceId: null, quantity: 0 }));

export const STARTING_COINS = 500;
export const STARTING_HEALTH = 80;
export const MAX_HEALTH = 100;
export const HEALTH_DECAY_PER_DAY = 5;

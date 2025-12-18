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
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description: string;
  gatherTime: number;
  spawnTiles: TileType[];
  spawnChance: number;
  coinValue: number;
  recipes?: Recipe[];
}

export interface MapTile {
  type: TileType;
  resources: string[];
  walkable: boolean;
  claimedBy?: string;
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
}

export const TILE_TYPES: { type: TileType; label: string; walkable: boolean; color: string; baseValue: number }[] = [
  { type: 'grass', label: 'Grass', walkable: true, color: 'bg-green-600', baseValue: 5 },
  { type: 'forest', label: 'Forest', walkable: true, color: 'bg-green-900', baseValue: 10 },
  { type: 'jungle', label: 'Jungle', walkable: true, color: 'bg-emerald-800', baseValue: 15 },
  { type: 'dirt', label: 'Dirt', walkable: true, color: 'bg-amber-800', baseValue: 3 },
  { type: 'sand', label: 'Sand', walkable: true, color: 'bg-yellow-500', baseValue: 4 },
  { type: 'stone', label: 'Stone', walkable: true, color: 'bg-gray-500', baseValue: 8 },
  { type: 'mountain', label: 'Mountain', walkable: false, color: 'bg-gray-700', baseValue: 20 },
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

export const generateMap = (width: number, height: number, resources: Resource[]): WorldMap => {
  const tiles: MapTile[][] = [];
  
  for (let y = 0; y < height; y++) {
    const row: MapTile[] = [];
    for (let x = 0; x < width; x++) {
      const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.random() * 0.5;
      const noise2 = Math.sin(x * 0.05 + 100) * Math.cos(y * 0.08) + Math.random() * 0.3;
      let type: TileType = 'grass';
      
      // Temperature gradient (colder at top, hotter at bottom)
      const tempFactor = y / height;
      
      if (noise < -0.4) type = 'water';
      else if (noise < -0.25) type = 'sand';
      else if (noise < 0.1) type = 'grass';
      else if (noise < 0.3) type = 'forest';
      else if (noise < 0.5) type = 'dirt';
      else if (noise < 0.7) type = 'stone';
      else type = 'mountain';
      
      // Apply temperature variations
      if (tempFactor < 0.2 && type === 'grass') type = 'snow';
      if (tempFactor < 0.15 && type === 'water') type = 'ice';
      if (tempFactor < 0.25 && type === 'forest') type = 'snow';
      if (tempFactor > 0.8 && type === 'forest') type = 'jungle';
      if (tempFactor > 0.85 && noise2 > 0.4 && type !== 'water') type = 'lava';
      if (noise2 < -0.3 && type === 'grass') type = 'swamp';
      
      const tileInfo = TILE_TYPES.find(t => t.type === type)!;
      row.push({ type, walkable: tileInfo.walkable, resources: [] });
    }
    tiles.push(row);
  }
  
  seedResources(tiles, resources);
  
  return {
    id: 'main-map',
    name: 'World',
    width,
    height,
    tiles,
    spawnPoint: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
  };
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

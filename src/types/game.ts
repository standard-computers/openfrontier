export type TileType = 'grass' | 'water' | 'sand' | 'stone' | 'dirt' | 'forest';

export interface Position {
  x: number;
  y: number;
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
}

export interface MapTile {
  type: TileType;
  resources: string[]; // Array of resource IDs available on this tile
  walkable: boolean;
  claimedBy?: string; // User ID who claimed this tile
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
}

export const TILE_TYPES: { type: TileType; label: string; walkable: boolean; color: string }[] = [
  { type: 'grass', label: 'Grass', walkable: true, color: 'bg-green-600' },
  { type: 'forest', label: 'Forest', walkable: true, color: 'bg-green-900' },
  { type: 'dirt', label: 'Dirt', walkable: true, color: 'bg-amber-800' },
  { type: 'sand', label: 'Sand', walkable: true, color: 'bg-yellow-500' },
  { type: 'stone', label: 'Stone', walkable: true, color: 'bg-gray-500' },
  { type: 'water', label: 'Water', walkable: false, color: 'bg-blue-500' },
];

export const TILE_COLORS: Record<TileType, string> = {
  grass: 'tile-grass',
  water: 'tile-water',
  sand: 'tile-sand',
  stone: 'tile-stone',
  dirt: 'tile-dirt',
  forest: 'tile-forest',
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
  { id: 'wood', name: 'Wood', icon: '🪵', rarity: 'common', description: 'Basic building material', gatherTime: 2, spawnTiles: ['forest', 'grass'], spawnChance: 0.4 },
  { id: 'stone', name: 'Stone', icon: '🪨', rarity: 'common', description: 'Hard construction material', gatherTime: 3, spawnTiles: ['stone', 'dirt'], spawnChance: 0.5 },
  { id: 'iron', name: 'Iron Ore', icon: '⛏️', rarity: 'uncommon', description: 'Raw iron for smelting', gatherTime: 5, spawnTiles: ['stone'], spawnChance: 0.2 },
  { id: 'gold', name: 'Gold Ore', icon: '✨', rarity: 'rare', description: 'Precious golden ore', gatherTime: 8, spawnTiles: ['stone'], spawnChance: 0.08 },
  { id: 'coal', name: 'Coal', icon: '⚫', rarity: 'common', description: 'Fuel for smelting', gatherTime: 2, spawnTiles: ['stone', 'dirt'], spawnChance: 0.3 },
  { id: 'fiber', name: 'Fiber', icon: '🌿', rarity: 'common', description: 'Plant fibers', gatherTime: 1, spawnTiles: ['grass', 'forest'], spawnChance: 0.35 },
  { id: 'fish', name: 'Fish', icon: '🐟', rarity: 'common', description: 'Fresh catch', gatherTime: 3, spawnTiles: ['sand'], spawnChance: 0.3 },
  { id: 'crystal', name: 'Crystal', icon: '💎', rarity: 'epic', description: 'Magical crystal', gatherTime: 10, spawnTiles: ['stone'], spawnChance: 0.03 },
  { id: 'mushroom', name: 'Mushroom', icon: '🍄', rarity: 'uncommon', description: 'Forest fungus', gatherTime: 2, spawnTiles: ['forest', 'dirt'], spawnChance: 0.2 },
  { id: 'cactus', name: 'Cactus', icon: '🌵', rarity: 'uncommon', description: 'Desert plant', gatherTime: 3, spawnTiles: ['sand'], spawnChance: 0.25 },
  { id: 'shell', name: 'Shell', icon: '🐚', rarity: 'common', description: 'Sea shell', gatherTime: 1, spawnTiles: ['sand'], spawnChance: 0.3 },
  { id: 'flower', name: 'Flower', icon: '🌸', rarity: 'common', description: 'Pretty flower', gatherTime: 1, spawnTiles: ['grass'], spawnChance: 0.2 },
];

export const generateMap = (width: number, height: number, resources: Resource[]): WorldMap => {
  const tiles: MapTile[][] = [];
  
  for (let y = 0; y < height; y++) {
    const row: MapTile[] = [];
    for (let x = 0; x < width; x++) {
      const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.random() * 0.5;
      let type: TileType = 'grass';
      
      if (noise < -0.3) type = 'water';
      else if (noise < -0.1) type = 'sand';
      else if (noise < 0.2) type = 'grass';
      else if (noise < 0.5) type = 'forest';
      else if (noise < 0.7) type = 'dirt';
      else type = 'stone';
      
      const tileInfo = TILE_TYPES.find(t => t.type === type)!;
      row.push({ type, walkable: tileInfo.walkable, resources: [] });
    }
    tiles.push(row);
  }
  
  // Seed resources based on tile types
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
      
      // Find resources that can spawn on this tile type
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

export type TileType = 'grass' | 'water' | 'sand' | 'stone' | 'dirt';

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
}

export interface PlacedResource {
  resourceId: string;
  position: Position;
}

export interface RecipeIngredient {
  resourceId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  name: string;
  outputResourceId: string;
  outputQuantity: number;
  ingredients: RecipeIngredient[];
  craftTime: number;
}

export interface MapTile {
  type: TileType;
  resource?: string;
  walkable: boolean;
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
  maps: WorldMap[];
  resources: Resource[];
  recipes: Recipe[];
  currentMapId: string;
  inventory: InventorySlot[];
  playerPosition: Position;
}

export const TILE_COLORS: Record<TileType, string> = {
  grass: 'tile-grass',
  water: 'tile-water',
  sand: 'tile-sand',
  stone: 'tile-stone',
  dirt: 'tile-dirt',
};

export const RARITY_COLORS: Record<Resource['rarity'], string> = {
  common: 'text-foreground',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-accent',
};

export const DEFAULT_RESOURCES: Resource[] = [
  { id: 'wood', name: 'Wood', icon: '🪵', rarity: 'common', description: 'Basic building material', gatherTime: 2 },
  { id: 'stone', name: 'Stone', icon: '🪨', rarity: 'common', description: 'Hard construction material', gatherTime: 3 },
  { id: 'iron', name: 'Iron Ore', icon: '⛏️', rarity: 'uncommon', description: 'Raw iron for smelting', gatherTime: 5 },
  { id: 'gold', name: 'Gold Ore', icon: '✨', rarity: 'rare', description: 'Precious golden ore', gatherTime: 8 },
  { id: 'coal', name: 'Coal', icon: '⚫', rarity: 'common', description: 'Fuel for smelting', gatherTime: 2 },
  { id: 'copper', name: 'Copper Ore', icon: '🔶', rarity: 'uncommon', description: 'Soft metal ore', gatherTime: 4 },
  { id: 'fiber', name: 'Fiber', icon: '🌿', rarity: 'common', description: 'Plant fibers', gatherTime: 1 },
  { id: 'fish', name: 'Fish', icon: '🐟', rarity: 'common', description: 'Fresh catch', gatherTime: 3 },
  { id: 'crystal', name: 'Crystal', icon: '💎', rarity: 'epic', description: 'Magical crystal', gatherTime: 10 },
  { id: 'mushroom', name: 'Mushroom', icon: '🍄', rarity: 'uncommon', description: 'Forest fungus', gatherTime: 2 },
];

export const DEFAULT_RECIPES: Recipe[] = [
  { id: 'plank', name: 'Wooden Plank', outputResourceId: 'plank', outputQuantity: 4, ingredients: [{ resourceId: 'wood', quantity: 1 }], craftTime: 2 },
  { id: 'iron-bar', name: 'Iron Bar', outputResourceId: 'iron-bar', outputQuantity: 1, ingredients: [{ resourceId: 'iron', quantity: 2 }, { resourceId: 'coal', quantity: 1 }], craftTime: 5 },
];

export const createEmptyMap = (width: number, height: number, name: string): WorldMap => {
  const tiles: MapTile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: MapTile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ type: 'grass', walkable: true });
    }
    tiles.push(row);
  }
  return {
    id: `map-${Date.now()}`,
    name,
    width,
    height,
    tiles,
    spawnPoint: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
  };
};

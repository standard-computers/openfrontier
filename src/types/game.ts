export interface Resource {
  id: string;
  name: string;
  icon: string;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description: string;
  baseValue: number;
  stackSize: number;
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
  craftTime: number; // in seconds
}

export interface InventorySlot {
  resourceId: string | null;
  quantity: number;
}

export interface WorldData {
  id: string;
  name: string;
  resources: Resource[];
  recipes: Recipe[];
  inventory: InventorySlot[];
}

export const RARITY_COLORS: Record<Resource['rarity'], string> = {
  common: 'text-foreground',
  uncommon: 'text-game-grass',
  rare: 'text-game-water',
  epic: 'text-purple-400',
  legendary: 'text-game-gold',
};

export const DEFAULT_RESOURCES: Resource[] = [
  { id: 'wood', name: 'Wood', icon: '🪵', color: 'bg-game-wood', rarity: 'common', description: 'Basic building material from trees', baseValue: 5, stackSize: 99 },
  { id: 'stone', name: 'Stone', icon: '🪨', color: 'bg-game-stone', rarity: 'common', description: 'Hard material for construction', baseValue: 8, stackSize: 99 },
  { id: 'iron', name: 'Iron Ore', icon: '⛏️', color: 'bg-slate-500', rarity: 'uncommon', description: 'Raw iron for smelting', baseValue: 25, stackSize: 50 },
  { id: 'gold', name: 'Gold Ore', icon: '✨', color: 'bg-game-gold', rarity: 'rare', description: 'Precious golden ore', baseValue: 100, stackSize: 30 },
  { id: 'coal', name: 'Coal', icon: '⚫', color: 'bg-slate-800', rarity: 'common', description: 'Fuel for smelting', baseValue: 10, stackSize: 99 },
  { id: 'copper', name: 'Copper Ore', icon: '🔶', color: 'bg-orange-600', rarity: 'uncommon', description: 'Soft metal ore', baseValue: 20, stackSize: 50 },
  { id: 'fiber', name: 'Fiber', icon: '🌿', color: 'bg-game-grass', rarity: 'common', description: 'Plant fibers for crafting', baseValue: 3, stackSize: 99 },
  { id: 'water', name: 'Water', icon: '💧', color: 'bg-game-water', rarity: 'common', description: 'Essential for life', baseValue: 1, stackSize: 99 },
];

export const DEFAULT_RECIPES: Recipe[] = [
  { id: 'plank', name: 'Wooden Plank', outputResourceId: 'plank', outputQuantity: 4, ingredients: [{ resourceId: 'wood', quantity: 1 }], craftTime: 2 },
  { id: 'iron-bar', name: 'Iron Bar', outputResourceId: 'iron-bar', outputQuantity: 1, ingredients: [{ resourceId: 'iron', quantity: 2 }, { resourceId: 'coal', quantity: 1 }], craftTime: 5 },
  { id: 'copper-bar', name: 'Copper Bar', outputResourceId: 'copper-bar', outputQuantity: 1, ingredients: [{ resourceId: 'copper', quantity: 2 }, { resourceId: 'coal', quantity: 1 }], craftTime: 4 },
];

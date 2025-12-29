import { Resource, TileType } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';

// Type for the database resource_marketplace row
export interface RepositoryResource {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  description: string | null;
  spawn_tiles: string[];
  spawn_chance: number;
  base_value: number;
  recipe: any;
  download_count: number;
  created_by: string | null;
  is_container: boolean;
  is_floating: boolean;
  can_float_on_water: boolean;
  holds_player: boolean;
  display: boolean;
  placeable: boolean;
  passable: boolean;
  consumable: boolean;
  health_gain: number;
  can_inflict_damage: boolean;
  damage: number;
  category: string | null;
  gather_time: number;
  has_limited_lifetime: boolean;
  lifetime_hours: number | null;
  tile_width: number;
  tile_height: number;
  use_life: boolean;
  life_decrease_per_use: number;
  destructible: boolean;
  max_life: number;
  destroyed_by: string[] | null;
  produce_tile: boolean;
  produce_tile_type: string | null;
  produces_resource: string | null;
  produces_amount: number;
  produces_interval_hours: number;
  emits_light: boolean;
}

/**
 * Convert a repository resource (database row) to a game Resource
 */
export const repositoryToGameResource = (repoResource: RepositoryResource): Resource => {
  return {
    id: repoResource.id,
    name: repoResource.name,
    icon: repoResource.icon,
    iconType: repoResource.icon?.startsWith('http') ? 'image' : 'emoji',
    rarity: repoResource.rarity as Resource['rarity'],
    description: repoResource.description || '',
    gatherTime: repoResource.gather_time || 1000,
    spawnTiles: repoResource.spawn_tiles as TileType[],
    spawnChance: Number(repoResource.spawn_chance),
    coinValue: repoResource.base_value,
    consumable: repoResource.consumable || false,
    healthGain: repoResource.health_gain || 0,
    canInflictDamage: repoResource.can_inflict_damage || false,
    damage: repoResource.damage || 0,
    recipes: repoResource.recipe ? (Array.isArray(repoResource.recipe) ? repoResource.recipe : [repoResource.recipe]) : [],
    isContainer: repoResource.is_container || false,
    isFloating: repoResource.is_floating || false,
    canFloatOnWater: repoResource.can_float_on_water || false,
    holdsPlayer: repoResource.holds_player || false,
    display: repoResource.display || false,
    placeable: repoResource.placeable || false,
    passable: repoResource.passable || false,
    category: repoResource.category || undefined,
    hasLimitedLifetime: repoResource.has_limited_lifetime || false,
    lifetimeHours: repoResource.lifetime_hours ?? undefined,
    tileWidth: repoResource.tile_width ?? 1,
    tileHeight: repoResource.tile_height ?? 1,
    useLife: repoResource.use_life || false,
    lifeDecreasePerUse: repoResource.life_decrease_per_use ?? 100,
    destructible: repoResource.destructible || false,
    maxLife: repoResource.max_life ?? 100,
    destroyedBy: repoResource.destroyed_by || undefined,
    produceTile: repoResource.produce_tile || false,
    produceTileType: repoResource.produce_tile_type as TileType | undefined,
    producesResource: repoResource.produces_resource || undefined,
    producesAmount: repoResource.produces_amount ?? 1,
    producesIntervalHours: repoResource.produces_interval_hours ?? 24,
    emitsLight: repoResource.emits_light || false,
  };
};

/**
 * Convert a game Resource to repository format for insertion/update
 */
export const gameResourceToRepository = (resource: Resource, userId?: string) => {
  return {
    name: resource.name,
    icon: resource.icon,
    rarity: resource.rarity,
    description: resource.description,
    spawn_tiles: resource.spawnTiles,
    spawn_chance: resource.spawnChance,
    base_value: resource.coinValue,
    recipe: resource.recipes && resource.recipes.length > 0 
      ? JSON.parse(JSON.stringify(resource.recipes)) 
      : null,
    created_by: userId || null,
    is_container: resource.isContainer || false,
    is_floating: resource.isFloating || false,
    can_float_on_water: resource.canFloatOnWater || false,
    holds_player: resource.holdsPlayer || false,
    display: resource.display || false,
    placeable: resource.placeable || false,
    passable: resource.passable || false,
    consumable: resource.consumable || false,
    health_gain: resource.healthGain || 0,
    can_inflict_damage: resource.canInflictDamage || false,
    damage: resource.damage || 0,
    category: resource.category || null,
    gather_time: resource.gatherTime || 1000,
    has_limited_lifetime: resource.hasLimitedLifetime || false,
    lifetime_hours: resource.lifetimeHours ?? null,
    tile_width: resource.tileWidth ?? 1,
    tile_height: resource.tileHeight ?? 1,
    use_life: resource.useLife || false,
    life_decrease_per_use: resource.lifeDecreasePerUse ?? 100,
    destructible: resource.destructible || false,
    max_life: resource.maxLife ?? 100,
    destroyed_by: resource.destroyedBy || null,
    produce_tile: resource.produceTile || false,
    produce_tile_type: resource.produceTileType || null,
    produces_resource: resource.producesResource || null,
    produces_amount: resource.producesAmount ?? 1,
    produces_interval_hours: resource.producesIntervalHours ?? 24,
    emits_light: resource.emitsLight || false,
  };
};

/**
 * Fetch resources for a world by their IDs from the repository
 */
export const fetchWorldResources = async (resourceIds: string[]): Promise<Resource[]> => {
  if (!resourceIds || resourceIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('resource_marketplace')
    .select('*')
    .in('id', resourceIds);

  if (error) {
    console.error('Failed to fetch world resources:', error);
    return [];
  }

  return (data as RepositoryResource[]).map(repositoryToGameResource);
};

/**
 * Add a resource to the repository and return the new ID
 */
export const addResourceToRepository = async (resource: Resource, userId: string): Promise<string | null> => {
  const repoData = gameResourceToRepository(resource, userId);

  const { data, error } = await supabase
    .from('resource_marketplace')
    .insert([repoData])
    .select('id')
    .single();

  if (error) {
    console.error('Failed to add resource to repository:', error);
    return null;
  }

  return data.id;
};

/**
 * Update a resource in the repository
 */
export const updateResourceInRepository = async (resourceId: string, resource: Resource, userId?: string): Promise<boolean> => {
  const repoData = gameResourceToRepository(resource, userId);

  const { error } = await supabase
    .from('resource_marketplace')
    .update(repoData)
    .eq('id', resourceId);

  if (error) {
    console.error('Failed to update resource in repository:', error);
    return false;
  }

  return true;
};

/**
 * Delete a resource from the repository
 */
export const deleteResourceFromRepository = async (resourceId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('resource_marketplace')
    .delete()
    .eq('id', resourceId);

  if (error) {
    console.error('Failed to delete resource from repository:', error);
    return false;
  }

  return true;
};

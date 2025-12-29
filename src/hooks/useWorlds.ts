import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateMap, Resource, TileProbabilities } from '@/types/game';
import { addResourceToRepository } from '@/utils/resourceConverter';

interface WorldMembership {
  id: string;
  world_id: string;
  role: 'owner' | 'player';
  joined_at: string;
  worlds: {
    id: string;
    name: string;
    join_code: string;
    created_at: string;
  };
}

export interface WorldWithRole {
  id: string;
  name: string;
  joinCode: string;
  role: 'owner' | 'player';
  createdAt: string;
}

export const useWorlds = (userId: string | undefined) => {
  const [worlds, setWorlds] = useState<WorldWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorlds = useCallback(async () => {
    if (!userId) {
      setWorlds([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('world_members')
        .select(`
          id,
          world_id,
          role,
          joined_at,
          worlds (
            id,
            name,
            join_code,
            created_at
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const worldsWithRoles: WorldWithRole[] = (data as unknown as WorldMembership[])
        .filter(m => m.worlds)
        .map(m => ({
          id: m.worlds.id,
          name: m.worlds.name,
          joinCode: m.worlds.join_code,
          role: m.role as 'owner' | 'player',
          createdAt: m.worlds.created_at,
        }));

      setWorlds(worldsWithRoles);
    } catch (error) {
      console.error('Error fetching worlds:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  const createWorld = async (
    name: string, 
    width: number, 
    height: number, 
    customResources: Resource[] = [],
    options?: {
      enableMarkets?: boolean;
      enableNpcs?: boolean;
      npcCount?: number;
      enableStrangers?: boolean;
      strangerDensity?: number;
      tileProbabilities?: TileProbabilities;
    }
  ) => {
    if (!userId) throw new Error('Not authenticated');

    // Auto-publish resources to repository and collect their IDs
    // Also build a mapping from old IDs to new repository IDs
    const resourceIds: string[] = [];
    const idMapping: Record<string, string> = {};
    
    for (const resource of customResources) {
      // Check if this resource already exists in repository by ID (it's a UUID from repo)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resource.id);
      
      if (isUuid) {
        // Resource already exists in repository, just use its ID
        resourceIds.push(resource.id);
        idMapping[resource.id] = resource.id;
      } else {
        // New resource, add to repository
        const newId = await addResourceToRepository(resource, userId);
        if (newId) {
          resourceIds.push(newId);
          idMapping[resource.id] = newId;
        }
      }
    }

    // Create resources with updated IDs for map generation
    const resourcesWithNewIds = customResources.map(r => ({
      ...r,
      id: idMapping[r.id] || r.id
    }));

    // Generate map with resources using the new repository IDs
    const map = generateMap(width, height, resourcesWithNewIds, options?.tileProbabilities);

    const playerData = {
      position: map.spawnPoint,
      inventory: [],
      coins: 500,
      userColor: '#22c55e',
    };

    // Use the database function to create world and membership atomically
    const { data: worldId, error } = await supabase
      .rpc('create_world_with_owner', {
        _name: name,
        _map_data: JSON.parse(JSON.stringify(map)),
        _resource_ids: resourceIds,
        _user_id: userId,
        _player_data: JSON.parse(JSON.stringify(playerData)),
      });

    if (error) throw error;

    // Update world with additional settings if provided
    if (options && worldId) {
      const updateData: Record<string, any> = {};
      if (options.enableMarkets !== undefined) updateData.enable_markets = options.enableMarkets;
      if (options.enableNpcs !== undefined) updateData.enable_npcs = options.enableNpcs;
      if (options.npcCount !== undefined) updateData.npc_count = options.npcCount;
      if (options.enableStrangers !== undefined) updateData.enable_strangers = options.enableStrangers;
      if (options.strangerDensity !== undefined) updateData.stranger_density = options.strangerDensity;

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('worlds')
          .update(updateData)
          .eq('id', worldId);
      }
    }

    await fetchWorlds();
    return worldId as string;
  };

  const joinWorld = async (joinCode: string) => {
    if (!userId) throw new Error('Not authenticated');

    // Use the database function to join atomically
    const { data: worldId, error } = await supabase
      .rpc('join_world_by_code', {
        _join_code: joinCode.toLowerCase(),
        _user_id: userId,
        _user_color: '#3b82f6',
      });

    if (error) {
      // Parse the error message from the database function
      if (error.message.includes('World not found')) {
        throw new Error('World not found. Check the code and try again.');
      }
      if (error.message.includes('already a member')) {
        throw new Error('You are already a member of this world');
      }
      throw error;
    }

    await fetchWorlds();
    return worldId as string;
  };

  const deleteWorld = async (worldId: string) => {
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('worlds')
      .delete()
      .eq('id', worldId);

    if (error) throw error;
    await fetchWorlds();
  };

  const leaveWorld = async (worldId: string) => {
    if (!userId) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('world_members')
      .delete()
      .eq('world_id', worldId)
      .eq('user_id', userId);

    if (error) throw error;
    await fetchWorlds();
  };

  return {
    worlds,
    loading,
    createWorld,
    joinWorld,
    deleteWorld,
    leaveWorld,
    refreshWorlds: fetchWorlds,
  };
};
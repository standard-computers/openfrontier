import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_RESOURCES, generateMap } from '@/types/game';
import type { Json } from '@/integrations/supabase/types';

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

  const createWorld = async (name: string, width: number, height: number) => {
    if (!userId) throw new Error('Not authenticated');

    const resources = [...DEFAULT_RESOURCES];
    const map = generateMap(width, height, resources);

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
        _resources: JSON.parse(JSON.stringify(resources)),
        _user_id: userId,
        _player_data: JSON.parse(JSON.stringify(playerData)),
      });

    if (error) throw error;

    await fetchWorlds();
    return worldId as string;
  };

  const joinWorld = async (joinCode: string) => {
    if (!userId) throw new Error('Not authenticated');

    // Find world by join code
    const { data: worldData, error: findError } = await supabase
      .rpc('get_world_by_join_code', { code: joinCode.toLowerCase() });

    if (findError) throw findError;
    if (!worldData || worldData.length === 0) {
      throw new Error('World not found. Check the code and try again.');
    }

    const world = worldData[0];

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('world_members')
      .select('id')
      .eq('world_id', world.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      throw new Error('You are already a member of this world');
    }

    // Get world map to find spawn point
    const { data: fullWorld, error: worldError } = await supabase
      .from('worlds')
      .select('map_data')
      .eq('id', world.id)
      .single();

    if (worldError) throw worldError;

    const mapData = fullWorld.map_data as { tiles: { claimedBy?: string; walkable: boolean }[][]; width: number; height: number };
    
    // Find an unclaimed, walkable spawn point
    let spawnX = Math.floor(mapData.width / 2);
    let spawnY = Math.floor(mapData.height / 2);
    
    // Try to find an unclaimed tile
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Math.floor(Math.random() * mapData.width);
      const y = Math.floor(Math.random() * mapData.height);
      const tile = mapData.tiles[y]?.[x];
      if (tile && tile.walkable && !tile.claimedBy) {
        spawnX = x;
        spawnY = y;
        break;
      }
    }

    // Join as player
    const { error: joinError } = await supabase
      .from('world_members')
      .insert([{
        world_id: world.id,
        user_id: userId,
        role: 'player',
        player_data: JSON.parse(JSON.stringify({
          position: { x: spawnX, y: spawnY },
          inventory: [],
          coins: 500,
          userColor: '#3b82f6',
        })) as Json,
      }]);

    if (joinError) throw joinError;

    await fetchWorlds();
    return world.id;
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
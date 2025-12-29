-- Change worlds.resources from storing full resource objects to storing an array of resource IDs
-- First, we'll rename the old column and add a new one for resource IDs

-- Step 1: Add new column for resource IDs (references to resource_marketplace)
ALTER TABLE public.worlds ADD COLUMN resource_ids uuid[] NOT NULL DEFAULT '{}';

-- Step 2: Update the create_world_with_owner function to use resource_ids instead of resources
CREATE OR REPLACE FUNCTION public.create_world_with_owner(
  _name text, 
  _map_data jsonb, 
  _resource_ids uuid[],  -- Changed from _resources jsonb
  _user_id uuid, 
  _player_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _world_id uuid;
BEGIN
  -- Insert the world with resource IDs
  INSERT INTO public.worlds (name, map_data, resource_ids, resources)
  VALUES (_name, _map_data, _resource_ids, '[]'::jsonb)
  RETURNING id INTO _world_id;
  
  -- Add the creator as owner
  INSERT INTO public.world_members (world_id, user_id, role, player_data)
  VALUES (_world_id, _user_id, 'owner', _player_data);
  
  RETURN _world_id;
END;
$$;

-- Step 3: Create a function to get full resource data for a world by joining with resource_marketplace
CREATE OR REPLACE FUNCTION public.get_world_resources(_world_id uuid)
RETURNS SETOF resource_marketplace
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT rm.* 
  FROM public.resource_marketplace rm
  WHERE rm.id = ANY(
    SELECT unnest(w.resource_ids) 
    FROM public.worlds w 
    WHERE w.id = _world_id
  );
$$;
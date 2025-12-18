-- Create a function to create a world and add the creator as owner atomically
CREATE OR REPLACE FUNCTION public.create_world_with_owner(
  _name text,
  _map_data jsonb,
  _resources jsonb,
  _user_id uuid,
  _player_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _world_id uuid;
BEGIN
  -- Insert the world
  INSERT INTO public.worlds (name, map_data, resources)
  VALUES (_name, _map_data, _resources)
  RETURNING id INTO _world_id;
  
  -- Add the creator as owner
  INSERT INTO public.world_members (world_id, user_id, role, player_data)
  VALUES (_world_id, _user_id, 'owner', _player_data);
  
  RETURN _world_id;
END;
$$;
-- Create a function to join a world by code
CREATE OR REPLACE FUNCTION public.join_world_by_code(
  _join_code text,
  _user_id uuid,
  _user_color text DEFAULT '#3b82f6'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _world_id uuid;
  _world_name text;
  _map_data jsonb;
  _spawn_x int;
  _spawn_y int;
  _map_width int;
  _map_height int;
  _existing_member uuid;
BEGIN
  -- Find the world by join code
  SELECT id, name, map_data INTO _world_id, _world_name, _map_data
  FROM public.worlds
  WHERE join_code = _join_code;
  
  IF _world_id IS NULL THEN
    RAISE EXCEPTION 'World not found. Check the code and try again.';
  END IF;
  
  -- Check if already a member
  SELECT id INTO _existing_member
  FROM public.world_members
  WHERE world_id = _world_id AND user_id = _user_id;
  
  IF _existing_member IS NOT NULL THEN
    RAISE EXCEPTION 'You are already a member of this world';
  END IF;
  
  -- Get map dimensions
  _map_width := (_map_data->>'width')::int;
  _map_height := (_map_data->>'height')::int;
  
  -- Simple spawn point at center
  _spawn_x := _map_width / 2;
  _spawn_y := _map_height / 2;
  
  -- Add user as player
  INSERT INTO public.world_members (world_id, user_id, role, player_data)
  VALUES (
    _world_id, 
    _user_id, 
    'player', 
    jsonb_build_object(
      'position', jsonb_build_object('x', _spawn_x, 'y', _spawn_y),
      'inventory', '[]'::jsonb,
      'coins', 500,
      'userColor', _user_color
    )
  );
  
  RETURN _world_id;
END;
$$;
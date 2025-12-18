-- Function to get all members of a world (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_world_members(_world_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  username text,
  role text,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    wm.id,
    wm.user_id,
    p.username,
    wm.role,
    wm.joined_at
  FROM public.world_members wm
  LEFT JOIN public.profiles p ON p.id = wm.user_id
  WHERE wm.world_id = _world_id
$$;

-- Update worlds RLS policy to allow members to update map_data (for claiming tiles)
DROP POLICY IF EXISTS "World owners can update their worlds" ON public.worlds;
CREATE POLICY "World members can update map data"
ON public.worlds
FOR UPDATE
USING (is_world_member(auth.uid(), id));
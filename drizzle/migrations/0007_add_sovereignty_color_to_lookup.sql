DROP FUNCTION IF EXISTS public.get_world_sovereignties(uuid);

CREATE OR REPLACE FUNCTION public.get_world_sovereignties(_world_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  sovereignty_name text,
  sovereignty_flag text,
  sovereignty_motto text,
  sovereignty_founded_at bigint,
  user_color text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wm.user_id,
    p.username,
    NULLIF(wm.player_data -> 'sovereignty' ->> 'name', ''),
    COALESCE(NULLIF(wm.player_data -> 'sovereignty' ->> 'flag', ''), '🏴'),
    COALESCE(wm.player_data -> 'sovereignty' ->> 'motto', ''),
    (wm.player_data -> 'sovereignty' ->> 'foundedAt')::double precision::bigint,
    COALESCE(NULLIF(wm.player_data ->> 'userColor', ''), '#888888')
  FROM public.world_members wm
  LEFT JOIN public.profiles p ON p.id = wm.user_id
  WHERE wm.world_id = _world_id
    AND jsonb_typeof(wm.player_data -> 'sovereignty') = 'object'
    AND NULLIF(wm.player_data -> 'sovereignty' ->> 'name', '') IS NOT NULL
    AND public.is_world_member(auth.uid(), _world_id);
$$;

REVOKE EXECUTE ON FUNCTION public.get_world_sovereignties(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_world_sovereignties(uuid) TO authenticated;
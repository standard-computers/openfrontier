DROP FUNCTION public.get_world_sovereignties_with_home(uuid);

CREATE FUNCTION public.get_world_sovereignties_with_home(_world_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  sovereignty_name text,
  sovereignty_flag text,
  sovereignty_motto text,
  sovereignty_founded_at bigint,
  user_color text,
  home jsonb,
  open_borders boolean,
  allow_outsider_gathering boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.user_id,
    s.username,
    s.sovereignty_name,
    s.sovereignty_flag,
    s.sovereignty_motto,
    s.sovereignty_founded_at,
    s.user_color,
    wm.player_data -> 'sovereignty' -> 'home' AS home,
    COALESCE((wm.player_data -> 'sovereignty' ->> 'openBorders')::boolean, false) AS open_borders,
    COALESCE((wm.player_data -> 'sovereignty' ->> 'allowOutsiderGathering')::boolean, false) AS allow_outsider_gathering
  FROM public.get_world_sovereignties(_world_id) s
  JOIN public.world_members wm
    ON wm.world_id = _world_id AND wm.user_id = s.user_id;
$$;
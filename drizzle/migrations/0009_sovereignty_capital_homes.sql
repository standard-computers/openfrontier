CREATE OR REPLACE FUNCTION public.get_world_sovereignties_with_home(_world_id uuid)
RETURNS TABLE(user_id uuid, username text, sovereignty_name text, sovereignty_flag text, sovereignty_motto text, sovereignty_founded_at bigint, user_color text, home jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
 SELECT s.*, wm.player_data -> 'sovereignty' -> 'home'
 FROM public.get_world_sovereignties(_world_id) s
 JOIN public.world_members wm ON wm.world_id = _world_id AND wm.user_id = s.user_id
 WHERE public.is_world_member(auth.uid(), _world_id);
$$;
REVOKE EXECUTE ON FUNCTION public.get_world_sovereignties_with_home(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_world_sovereignties_with_home(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.get_world_sovereignties(uuid) IS 'DEPRECATED for application lookup: replaced by get_world_sovereignties_with_home; retained as its compatibility helper.';
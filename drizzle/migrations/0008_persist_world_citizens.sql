CREATE TABLE public.world_citizens (
 world_id uuid PRIMARY KEY REFERENCES public.worlds(id) ON DELETE CASCADE,
 strangers jsonb,
 revision bigint NOT NULL DEFAULT 0,
 CONSTRAINT citizens_array CHECK (strangers IS NULL OR jsonb_typeof(strangers) = 'array')
);
GRANT SELECT ON public.world_citizens TO authenticated;
GRANT ALL ON public.world_citizens TO service_role;
ALTER TABLE public.world_citizens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read world citizens" ON public.world_citizens FOR SELECT TO authenticated USING (public.is_world_member(auth.uid(), world_id));
CREATE FUNCTION public.get_world_citizens(_world_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE snapshot jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_world_member(auth.uid(), _world_id) THEN RAISE EXCEPTION 'Not a world member'; END IF;
 INSERT INTO public.world_citizens(world_id) VALUES (_world_id) ON CONFLICT DO NOTHING;
 SELECT jsonb_build_object('strangers', strangers, 'revision', revision) INTO snapshot FROM public.world_citizens WHERE world_id = _world_id;
 RETURN snapshot;
END $$;
CREATE FUNCTION public.save_world_citizens(_world_id uuid, _revision bigint, _strangers jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE snapshot jsonb; did_save boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_world_member(auth.uid(), _world_id) THEN RAISE EXCEPTION 'Not a world member'; END IF;
 IF _strangers IS NULL OR jsonb_typeof(_strangers) <> 'array' THEN RAISE EXCEPTION 'Citizens must be an array'; END IF;
 PERFORM 1 FROM public.world_citizens WHERE world_id = _world_id FOR UPDATE;
 UPDATE public.world_citizens SET strangers = _strangers, revision = revision + 1 WHERE world_id = _world_id AND revision = _revision;
 did_save := FOUND;
 SELECT jsonb_build_object('saved', did_save, 'strangers', strangers, 'revision', revision) INTO snapshot FROM public.world_citizens WHERE world_id = _world_id;
 RETURN snapshot;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_world_citizens(uuid), public.save_world_citizens(uuid,bigint,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_world_citizens(uuid), public.save_world_citizens(uuid,bigint,jsonb) TO authenticated;
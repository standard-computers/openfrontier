CREATE TYPE public.app_role AS ENUM ('resource_editor');
CREATE TABLE public.user_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role public.app_role NOT NULL,
 UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE FUNCTION public.can_edit_all_resources() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'resource_editor');
$$;
REVOKE ALL ON FUNCTION public.can_edit_all_resources() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_all_resources() TO authenticated, service_role;
CREATE POLICY "Resource editors update all resources" ON public.resource_marketplace FOR UPDATE TO authenticated USING (public.can_edit_all_resources()) WITH CHECK (public.can_edit_all_resources());
CREATE FUNCTION public.preserve_resource_creator() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
 BEGIN
 IF current_user IN ('authenticated', 'anon') AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
 RAISE EXCEPTION 'The original resource creator cannot be changed';
 END IF;
 RETURN NEW;
 END;
$$;
CREATE TRIGGER preserve_resource_creator BEFORE UPDATE ON public.resource_marketplace FOR EACH ROW EXECUTE FUNCTION public.preserve_resource_creator();
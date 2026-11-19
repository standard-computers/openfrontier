DROP POLICY IF EXISTS "Authenticated users can add resources" ON public.resource_marketplace;
CREATE POLICY "Users can add their own resources" ON public.resource_marketplace FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can update resource icons" ON storage.objects;
CREATE POLICY "Owners can update resource icons" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'resource-icons' AND owner_id = (select auth.uid()::text)) WITH CHECK (bucket_id = 'resource-icons' AND owner_id = (select auth.uid()::text));

DROP POLICY IF EXISTS "Authenticated users can delete resource icons" ON storage.objects;
CREATE POLICY "Owners can delete resource icons" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resource-icons' AND owner_id = (select auth.uid()::text));
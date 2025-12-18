-- Create storage bucket for resource icons
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resource-icons', 'resource-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view resource icons (public bucket)
CREATE POLICY "Resource icons are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'resource-icons');

-- Allow authenticated users to upload resource icons
CREATE POLICY "Authenticated users can upload resource icons" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'resource-icons' AND auth.role() = 'authenticated');

-- Allow users to update their uploaded icons
CREATE POLICY "Authenticated users can update resource icons" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'resource-icons' AND auth.role() = 'authenticated');

-- Allow users to delete their uploaded icons  
CREATE POLICY "Authenticated users can delete resource icons"
ON storage.objects FOR DELETE
USING (bucket_id = 'resource-icons' AND auth.role() = 'authenticated');
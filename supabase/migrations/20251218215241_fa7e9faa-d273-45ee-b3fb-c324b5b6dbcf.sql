-- Create resource marketplace table
CREATE TABLE public.resource_marketplace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🔮',
  rarity TEXT NOT NULL DEFAULT 'common',
  base_value INTEGER NOT NULL DEFAULT 10,
  description TEXT,
  spawn_chance NUMERIC NOT NULL DEFAULT 0.1,
  spawn_tiles TEXT[] NOT NULL DEFAULT ARRAY['grass', 'forest'],
  recipe JSONB,
  created_by UUID REFERENCES auth.users(id),
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resource_marketplace ENABLE ROW LEVEL SECURITY;

-- Anyone can view marketplace resources
CREATE POLICY "Anyone can view marketplace resources"
ON public.resource_marketplace
FOR SELECT
USING (true);

-- Authenticated users can add resources
CREATE POLICY "Authenticated users can add resources"
ON public.resource_marketplace
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own resources
CREATE POLICY "Users can update their own resources"
ON public.resource_marketplace
FOR UPDATE
USING (auth.uid() = created_by);

-- Users can delete their own resources
CREATE POLICY "Users can delete their own resources"
ON public.resource_marketplace
FOR DELETE
USING (auth.uid() = created_by);
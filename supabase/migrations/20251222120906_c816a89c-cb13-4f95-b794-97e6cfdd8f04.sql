-- Add produce tile columns to resource_marketplace table
ALTER TABLE public.resource_marketplace 
ADD COLUMN IF NOT EXISTS produce_tile boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS produce_tile_type text DEFAULT NULL;
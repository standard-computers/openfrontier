-- Add new resource properties columns to resource_marketplace
ALTER TABLE public.resource_marketplace 
ADD COLUMN IF NOT EXISTS gather_time integer NOT NULL DEFAULT 1000,
ADD COLUMN IF NOT EXISTS has_limited_lifetime boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS lifetime_hours numeric,
ADD COLUMN IF NOT EXISTS tile_width integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS tile_height integer NOT NULL DEFAULT 1;
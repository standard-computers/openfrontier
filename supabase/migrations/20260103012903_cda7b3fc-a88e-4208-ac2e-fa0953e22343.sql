-- Remove download_count column from resource_marketplace table
ALTER TABLE public.resource_marketplace DROP COLUMN IF EXISTS download_count;
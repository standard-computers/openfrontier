-- Add is_container and is_floating columns to resource_marketplace
ALTER TABLE public.resource_marketplace
ADD COLUMN is_container boolean NOT NULL DEFAULT false,
ADD COLUMN is_floating boolean NOT NULL DEFAULT false;
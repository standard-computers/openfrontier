-- Add holds_player column to resource_marketplace
ALTER TABLE public.resource_marketplace
ADD COLUMN holds_player boolean NOT NULL DEFAULT false;
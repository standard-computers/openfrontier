-- Add use_life properties to resource_marketplace table
ALTER TABLE public.resource_marketplace
ADD COLUMN IF NOT EXISTS use_life boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS life_decrease_per_use numeric NOT NULL DEFAULT 100;
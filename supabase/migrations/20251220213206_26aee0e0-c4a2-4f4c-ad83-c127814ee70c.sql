-- Add missing resource properties columns
ALTER TABLE public.resource_marketplace 
ADD COLUMN consumable boolean NOT NULL DEFAULT false,
ADD COLUMN health_gain integer NOT NULL DEFAULT 0,
ADD COLUMN can_inflict_damage boolean NOT NULL DEFAULT false,
ADD COLUMN damage integer NOT NULL DEFAULT 0;
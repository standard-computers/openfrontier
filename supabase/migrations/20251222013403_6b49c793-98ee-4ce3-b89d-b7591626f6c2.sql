-- Add display column to resource_marketplace for "display on tile" feature
ALTER TABLE public.resource_marketplace 
ADD COLUMN display boolean NOT NULL DEFAULT false;
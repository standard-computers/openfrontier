-- Add placeable and passable columns to resource_marketplace table
ALTER TABLE public.resource_marketplace 
ADD COLUMN placeable boolean NOT NULL DEFAULT false,
ADD COLUMN passable boolean NOT NULL DEFAULT false;
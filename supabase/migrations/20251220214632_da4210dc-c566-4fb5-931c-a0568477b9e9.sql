-- Add category column to resource_marketplace
ALTER TABLE public.resource_marketplace 
ADD COLUMN category text DEFAULT NULL;
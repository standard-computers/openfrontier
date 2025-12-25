-- Add can_float_on_water property to resource_marketplace
ALTER TABLE public.resource_marketplace 
ADD COLUMN can_float_on_water boolean NOT NULL DEFAULT false;
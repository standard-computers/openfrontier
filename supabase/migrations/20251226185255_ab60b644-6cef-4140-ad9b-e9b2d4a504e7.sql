-- Add emits_light column to resource_marketplace
ALTER TABLE public.resource_marketplace
ADD COLUMN emits_light boolean NOT NULL DEFAULT false;
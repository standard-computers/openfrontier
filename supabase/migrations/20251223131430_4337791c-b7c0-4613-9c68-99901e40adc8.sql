-- Add production properties to resources
ALTER TABLE public.resource_marketplace
ADD COLUMN produces_resource text DEFAULT NULL,
ADD COLUMN produces_amount integer NOT NULL DEFAULT 1,
ADD COLUMN produces_interval_hours numeric NOT NULL DEFAULT 24;
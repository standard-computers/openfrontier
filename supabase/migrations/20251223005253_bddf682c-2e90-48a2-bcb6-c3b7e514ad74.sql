-- Add destroyed_by column to resource_marketplace table
-- This stores an array of resource IDs that can destroy this destructible resource
-- If empty/null, any damage-inflicting item can destroy it
ALTER TABLE public.resource_marketplace
ADD COLUMN destroyed_by text[] DEFAULT NULL;
-- Add container spawn settings columns to resource_marketplace
ALTER TABLE public.resource_marketplace
ADD COLUMN container_spawns_resources boolean NOT NULL DEFAULT false,
ADD COLUMN container_spawn_random boolean NOT NULL DEFAULT true,
ADD COLUMN container_spawn_resource_ids text[] DEFAULT '{}'::text[];
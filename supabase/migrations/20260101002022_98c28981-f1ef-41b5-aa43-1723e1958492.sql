-- Add XP gain properties to resources
ALTER TABLE public.resource_marketplace 
ADD COLUMN gives_xp boolean NOT NULL DEFAULT false,
ADD COLUMN xp_amount integer NOT NULL DEFAULT 0;
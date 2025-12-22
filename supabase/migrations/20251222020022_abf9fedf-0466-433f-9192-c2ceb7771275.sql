-- Add destructible and max_life columns to resource_marketplace table
ALTER TABLE public.resource_marketplace 
ADD COLUMN IF NOT EXISTS destructible boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS max_life integer NOT NULL DEFAULT 100;
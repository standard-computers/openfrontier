-- Add enable_markets column to worlds table
ALTER TABLE public.worlds 
ADD COLUMN enable_markets boolean NOT NULL DEFAULT false;

-- Add markets array to store market positions
ALTER TABLE public.worlds 
ADD COLUMN markets jsonb NOT NULL DEFAULT '[]'::jsonb;
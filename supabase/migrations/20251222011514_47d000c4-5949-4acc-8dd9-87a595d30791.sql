-- Add strangers configuration to worlds table
ALTER TABLE public.worlds ADD COLUMN IF NOT EXISTS enable_strangers boolean NOT NULL DEFAULT false;
ALTER TABLE public.worlds ADD COLUMN IF NOT EXISTS stranger_density numeric NOT NULL DEFAULT 0.02;
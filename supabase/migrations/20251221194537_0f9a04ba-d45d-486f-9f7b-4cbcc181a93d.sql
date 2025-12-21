-- Add NPC configuration columns to worlds table
ALTER TABLE public.worlds 
ADD COLUMN enable_npcs boolean NOT NULL DEFAULT false,
ADD COLUMN npc_count integer NOT NULL DEFAULT 0;

-- Add check constraint for max 12 NPCs
ALTER TABLE public.worlds 
ADD CONSTRAINT npc_count_range CHECK (npc_count >= 0 AND npc_count <= 12);
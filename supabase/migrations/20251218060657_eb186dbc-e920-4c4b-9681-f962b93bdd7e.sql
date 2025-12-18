-- Create worlds table to store world data
CREATE TABLE public.worlds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  map_data JSONB NOT NULL,
  resources JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create world_members table to track membership
CREATE TABLE public.world_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('owner', 'player')),
  player_data JSONB NOT NULL DEFAULT '{}',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (world_id, user_id)
);

-- Enable RLS
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for worlds
CREATE POLICY "Users can view worlds they are members of"
ON public.worlds FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.world_members 
    WHERE world_members.world_id = worlds.id 
    AND world_members.user_id = auth.uid()
  )
);

CREATE POLICY "World owners can update their worlds"
ON public.worlds FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.world_members 
    WHERE world_members.world_id = worlds.id 
    AND world_members.user_id = auth.uid()
    AND world_members.role = 'owner'
  )
);

CREATE POLICY "Authenticated users can create worlds"
ON public.worlds FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "World owners can delete their worlds"
ON public.worlds FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.world_members 
    WHERE world_members.world_id = worlds.id 
    AND world_members.user_id = auth.uid()
    AND world_members.role = 'owner'
  )
);

-- RLS policies for world_members
CREATE POLICY "Users can view their own memberships"
ON public.world_members FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view other members of their worlds"
ON public.world_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.world_members AS my_membership
    WHERE my_membership.world_id = world_members.world_id
    AND my_membership.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join worlds (insert membership)"
ON public.world_members FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own player data"
ON public.world_members FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can leave worlds (delete membership)"
ON public.world_members FOR DELETE
USING (user_id = auth.uid());

-- Function to update world timestamp
CREATE OR REPLACE FUNCTION public.update_world_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for world updates
CREATE TRIGGER update_worlds_timestamp
BEFORE UPDATE ON public.worlds
FOR EACH ROW
EXECUTE FUNCTION public.update_world_timestamp();

-- Function to find world by join code (for joining)
CREATE OR REPLACE FUNCTION public.get_world_by_join_code(code TEXT)
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT worlds.id, worlds.name
  FROM public.worlds
  WHERE worlds.join_code = code;
$$;
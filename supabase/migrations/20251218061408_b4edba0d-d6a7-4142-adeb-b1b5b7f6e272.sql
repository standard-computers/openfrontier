-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view other members of their worlds" ON public.world_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.world_members;
DROP POLICY IF EXISTS "Users can view worlds they are members of" ON public.worlds;

-- Create simpler, non-recursive SELECT policy for world_members
-- Users can view memberships where they are the user OR where they share a world
CREATE POLICY "Users can view world memberships"
ON public.world_members
FOR SELECT
USING (
  user_id = auth.uid() 
  OR world_id IN (
    SELECT wm.world_id FROM public.world_members wm WHERE wm.user_id = auth.uid()
  )
);

-- Create simpler SELECT policy for worlds using a direct subquery
CREATE POLICY "Users can view worlds they are members of"
ON public.worlds
FOR SELECT
USING (
  id IN (SELECT wm.world_id FROM public.world_members wm WHERE wm.user_id = auth.uid())
);
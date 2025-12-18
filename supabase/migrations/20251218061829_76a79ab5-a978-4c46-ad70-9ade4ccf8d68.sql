-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view world memberships" ON public.world_members;
DROP POLICY IF EXISTS "Users can view worlds they are members of" ON public.worlds;
DROP POLICY IF EXISTS "World owners can delete their worlds" ON public.worlds;
DROP POLICY IF EXISTS "World owners can update their worlds" ON public.worlds;

-- Create security definer function to check world membership (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_world_member(_user_id uuid, _world_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.world_members
    WHERE user_id = _user_id AND world_id = _world_id
  )
$$;

-- Create security definer function to check if user is world owner
CREATE OR REPLACE FUNCTION public.is_world_owner(_user_id uuid, _world_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.world_members
    WHERE user_id = _user_id AND world_id = _world_id AND role = 'owner'
  )
$$;

-- Create security definer function to get user's world IDs
CREATE OR REPLACE FUNCTION public.get_user_world_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT world_id FROM public.world_members WHERE user_id = _user_id
$$;

-- Simple policy for world_members: users can only see their own memberships
CREATE POLICY "Users can view their own memberships"
ON public.world_members
FOR SELECT
USING (user_id = auth.uid());

-- Worlds SELECT policy using security definer function
CREATE POLICY "Users can view worlds they are members of"
ON public.worlds
FOR SELECT
USING (public.is_world_member(auth.uid(), id));

-- Worlds UPDATE policy using security definer function
CREATE POLICY "World owners can update their worlds"
ON public.worlds
FOR UPDATE
USING (public.is_world_owner(auth.uid(), id));

-- Worlds DELETE policy using security definer function  
CREATE POLICY "World owners can delete their worlds"
ON public.worlds
FOR DELETE
USING (public.is_world_owner(auth.uid(), id));
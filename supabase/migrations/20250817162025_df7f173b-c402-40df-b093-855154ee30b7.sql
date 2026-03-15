-- Fix infinite recursion issue in user_roles RLS policies
-- Drop the problematic policy that references user_roles from within itself
DROP POLICY IF EXISTS "Admins can view all roles in their organization" ON public.user_roles;

-- Keep the simple policy that works correctly
-- "Users can view their own roles" policy should remain as it doesn't cause recursion

-- Add a comment explaining the policy structure
COMMENT ON TABLE public.user_roles IS 'User roles table with simplified RLS policies to avoid infinite recursion';
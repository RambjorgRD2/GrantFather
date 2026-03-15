-- Fix RLS policies for user_roles table to allow user role creation during onboarding
-- Currently users can't INSERT their own roles, which breaks onboarding

-- Add policy to allow users to insert their own roles (needed for onboarding)
CREATE POLICY "Users can create their own roles during onboarding" 
ON public.user_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Add policy to allow admins to create roles for their organization
CREATE POLICY "Admins can create roles for their organization" 
ON public.user_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = user_roles.organization_id 
    AND ur.role = 'admin'
  )
);

-- Add policy to allow admins to update roles in their organization
CREATE POLICY "Admins can update roles in their organization" 
ON public.user_roles 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = user_roles.organization_id 
    AND ur.role = 'admin'
  )
);

-- Add policy to allow admins to delete roles in their organization
CREATE POLICY "Admins can delete roles in their organization" 
ON public.user_roles 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = user_roles.organization_id 
    AND ur.role = 'admin'
  )
  AND user_id != auth.uid() -- Admins can't delete their own role
);
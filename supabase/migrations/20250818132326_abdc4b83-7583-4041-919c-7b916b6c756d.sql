-- Phase 1: Fix Database Issues - Update RLS policies and add comprehensive error logging

-- Drop existing conflicting policies first
DROP POLICY IF EXISTS "Users can create their own roles during onboarding" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can create roles for their organization" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles in their organization" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles in their organization" ON public.user_roles;

-- Recreate user_roles policies with proper logic
CREATE POLICY "Users can insert their own roles during onboarding" 
ON public.user_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Admins can create roles for their org members" 
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

CREATE POLICY "Admins can update roles in their org" 
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

CREATE POLICY "Admins can delete non-admin roles in their org" 
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
  AND user_id != auth.uid()
);

-- Fix organizations RLS policies to allow proper access
DROP POLICY IF EXISTS "Authenticated users can view their own organizations" ON public.organizations;
CREATE POLICY "Users can view organizations they belong to" 
ON public.organizations 
FOR SELECT 
TO authenticated 
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = organizations.id
  )
);

-- Fix organization invitations security (Phase 3 partial)
DROP POLICY IF EXISTS "Organization members can view invitations" ON public.organization_invitations;
CREATE POLICY "Only admins can view invitations for their org" 
ON public.organization_invitations 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = organization_invitations.organization_id 
    AND ur.role = 'admin'
  )
);

-- Add update policy for invitations
CREATE POLICY "System can update invitations during acceptance" 
ON public.organization_invitations 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Create logging table for debugging (Phase 1 - comprehensive error logging)
CREATE TABLE IF NOT EXISTS public.debug_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  details jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on debug logs
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own logs
CREATE POLICY "Users can view their own debug logs" 
ON public.debug_logs 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Allow anyone to insert debug logs (for error tracking)
CREATE POLICY "Anyone can create debug logs" 
ON public.debug_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);
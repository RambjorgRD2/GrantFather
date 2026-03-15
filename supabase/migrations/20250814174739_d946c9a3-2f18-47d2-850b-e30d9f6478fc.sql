-- Fix security issue: Ensure anonymous users cannot access organization data
-- Current policies only apply to 'authenticated' role, but we need to explicitly deny access to 'anon' role

-- Drop existing policies and recreate with explicit role restrictions
DROP POLICY IF EXISTS "Org: users can view their own organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org: users can insert their own organizations" ON public.organizations;  
DROP POLICY IF EXISTS "Org: users can update their own organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org: users can delete their own organizations" ON public.organizations;

-- Recreate policies with explicit authenticated role requirement and deny anonymous access
CREATE POLICY "Authenticated users can view their own organizations" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can insert their own organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update their own organizations" 
ON public.organizations 
FOR UPDATE 
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can delete their own organizations" 
ON public.organizations 
FOR DELETE 
TO authenticated
USING (created_by = auth.uid());

-- Explicitly deny all access to anonymous users
CREATE POLICY "Deny anonymous access to organizations" 
ON public.organizations 
FOR ALL 
TO anon
USING (false);

-- Fix scrape_cache table - add basic RLS policies  
-- This table should only be accessible by the application (service role) and not by users
CREATE POLICY "Only service role can access scrape cache" 
ON public.scrape_cache 
FOR ALL 
TO service_role
USING (true);

-- Deny all access to authenticated and anonymous users for scrape_cache
CREATE POLICY "Deny user access to scrape cache" 
ON public.scrape_cache 
FOR ALL 
TO authenticated, anon
USING (false);
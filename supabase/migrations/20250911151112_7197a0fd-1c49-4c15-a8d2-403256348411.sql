-- Fix RLS policy for organization creation
-- The issue is that the INSERT policy may have an incorrect WITH CHECK condition

-- Drop existing problematic policies and recreate them correctly
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

-- Create a proper INSERT policy that works with auth.uid()
CREATE POLICY "Users can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Ensure the policy is properly formatted and auth.uid() is accessible
-- Add a helper function to validate session before organization creation
CREATE OR REPLACE FUNCTION public.validate_user_session()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user ID from auth context
    current_user_id := auth.uid();
    
    -- Ensure user is authenticated
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated - auth.uid() returned NULL'
            USING ERRCODE = '42501';
    END IF;
    
    RETURN current_user_id;
END;
$$;

-- Create an enhanced INSERT policy that validates session first
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (
    created_by = validate_user_session() 
    AND auth.uid() IS NOT NULL 
    AND created_by IS NOT NULL
);

-- Also ensure the SELECT policy allows users to see organizations they created
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
CREATE POLICY "Users can view organizations they belong to" 
ON public.organizations 
FOR SELECT 
USING (
    id IN (
        SELECT ur.organization_id 
        FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid()
    )
    OR created_by = auth.uid()
);

-- Add debug logging function for RLS policy violations
CREATE OR REPLACE FUNCTION public.log_rls_violation(
    p_table_name TEXT,
    p_operation TEXT,
    p_user_id UUID DEFAULT NULL,
    p_data JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.debug_logs (
        user_id,
        level,
        source,
        message,
        data
    ) VALUES (
        COALESCE(p_user_id, auth.uid()),
        'error',
        'rls_policy',
        format('RLS policy violation on table %s for operation %s', p_table_name, p_operation),
        p_data || jsonb_build_object(
            'table_name', p_table_name,
            'operation', p_operation,
            'auth_uid', auth.uid(),
            'timestamp', now()
        )
    );
END;
$$;
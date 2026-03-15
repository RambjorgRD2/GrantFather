-- Fix Organization Invitation Access Control
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Organization members can view invitations" ON public.organization_invitations;

-- Create new restrictive policies
CREATE POLICY "Organization admins can view all invitations" 
ON public.organization_invitations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND organization_id = organization_invitations.organization_id 
    AND role = 'admin'::app_role
  )
);

CREATE POLICY "Users can view their own accepted invitations" 
ON public.organization_invitations 
FOR SELECT 
USING (
  accepted_by = auth.uid() AND accepted_at IS NOT NULL
);

-- Fix Debug Logs Access Control
-- Drop existing permissive insert policy
DROP POLICY IF EXISTS "Anyone can create debug logs" ON public.debug_logs;

-- Create new authenticated-only insert policy
CREATE POLICY "Authenticated users can create debug logs" 
ON public.debug_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Update debug logs select to be admin-only for security
DROP POLICY IF EXISTS "Users can view their own debug logs" ON public.debug_logs;

CREATE POLICY "Admins can view debug logs" 
ON public.debug_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin'::app_role, 'superadmin'::app_role)
  )
);

-- Secure Foundation Contact Information
-- Drop existing public read policy
DROP POLICY IF EXISTS "Norwegian foundations are publicly readable" ON public.norwegian_foundations;

-- Create authenticated-only access for foundation data
CREATE POLICY "Authenticated users can view foundation basic info" 
ON public.norwegian_foundations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL
);

-- Create separate policy for contact information (admin-only)
CREATE POLICY "Organization admins can view foundation contact info" 
ON public.norwegian_foundations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role IN ('admin'::app_role, 'superadmin'::app_role)
  )
) WITH (contact_email, contact_phone);

-- Add audit logging table for sensitive data access
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Superadmins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'::app_role
  )
);

-- System can insert audit logs
CREATE POLICY "System can create audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  action_type TEXT,
  table_name TEXT,
  record_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, 
    action, 
    table_name, 
    record_id
  ) VALUES (
    auth.uid(), 
    action_type, 
    table_name, 
    record_id
  );
END;
$$;
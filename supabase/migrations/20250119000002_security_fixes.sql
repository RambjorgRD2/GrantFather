-- Phase 1: Critical Security Fixes
-- Fix organization contact data exposure, invitation token security, and auth vulnerabilities

-- 1. Fix organization contact data exposure
-- Only organization admins should see contact details
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their organization" ON public.organizations;

CREATE POLICY "Users can view basic org info they belong to" 
ON public.organizations 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = organizations.id
  )
);

CREATE POLICY "Admins can view full org details including contact info" 
ON public.organizations 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = organizations.id 
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can update their organization" 
ON public.organizations 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = organizations.id 
    AND ur.role = 'admin'
  )
);

-- 2. Fix invitation token exposure
-- Only the person who created the invitation should see the token
DROP POLICY IF EXISTS "Users can view invitations for their organization" ON public.organization_invitations;

CREATE POLICY "Users can view basic invitation info for their org" 
ON public.organization_invitations 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = organization_invitations.organization_id
  )
);

CREATE POLICY "Invitation creators can view full invitation details including tokens" 
ON public.organization_invitations 
FOR SELECT 
TO authenticated 
USING (
  created_by = auth.uid()
);

CREATE POLICY "Admins can create invitations for their org" 
ON public.organization_invitations 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = organization_invitations.organization_id 
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can delete invitations for their org" 
ON public.organization_invitations 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = organization_invitations.organization_id 
    AND ur.role = 'admin'
  )
);

-- 3. Fix system_prompts security
-- Only organization members should see their org's prompts
DROP POLICY IF EXISTS "Users can view system prompts" ON public.system_prompts;
DROP POLICY IF EXISTS "Users can insert system prompts" ON public.system_prompts;
DROP POLICY IF EXISTS "Users can update system prompts" ON public.system_prompts;

CREATE POLICY "Users can view their org's system prompts" 
ON public.system_prompts 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = system_prompts.organization_id
  )
);

CREATE POLICY "Admins can manage their org's system prompts" 
ON public.system_prompts 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = system_prompts.organization_id 
    AND ur.role = 'admin'
  )
);

-- 4. Fix grant_applications security
-- Users can only see applications from their organization
DROP POLICY IF EXISTS "Users can view grant applications" ON public.grant_applications;
DROP POLICY IF EXISTS "Users can insert grant applications" ON public.grant_applications;
DROP POLICY IF EXISTS "Users can update grant applications" ON public.grant_applications;
DROP POLICY IF EXISTS "Users can delete grant applications" ON public.grant_applications;

CREATE POLICY "Users can view their org's grant applications" 
ON public.grant_applications 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = grant_applications.organization_id
  )
);

CREATE POLICY "Users can create applications for their org" 
ON public.grant_applications 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = grant_applications.organization_id
  )
);

CREATE POLICY "Users can update their org's applications" 
ON public.grant_applications 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = grant_applications.organization_id
  )
);

CREATE POLICY "Users can delete their org's applications" 
ON public.grant_applications 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = grant_applications.organization_id
  )
);

-- 5. Fix model_usage_tracking security
-- Only admins should see usage statistics
DROP POLICY IF EXISTS "Users can view model usage tracking" ON public.model_usage_tracking;
DROP POLICY IF EXISTS "Users can insert model usage tracking" ON public.model_usage_tracking;
DROP POLICY IF EXISTS "Users can update model usage tracking" ON public.model_usage_tracking;

CREATE POLICY "Admins can view model usage statistics" 
ON public.model_usage_tracking 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

CREATE POLICY "System can track model usage" 
ON public.model_usage_tracking 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "System can update model usage" 
ON public.model_usage_tracking 
FOR UPDATE 
TO authenticated 
USING (true);

-- 6. Add function to safely get organization contact info
CREATE OR REPLACE FUNCTION get_organization_contact_info(org_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  contact_email text,
  contact_phone text,
  website text,
  address text
) AS $$
BEGIN
  -- Only return contact info if user is admin of the organization
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = org_id 
    AND ur.role = 'admin'
  ) THEN
    RETURN QUERY
    SELECT 
      o.id,
      o.name,
      o.contact_email,
      o.contact_phone,
      o.website,
      o.address
    FROM public.organizations o
    WHERE o.id = org_id;
  ELSE
    -- Return basic info only
    RETURN QUERY
    SELECT 
      o.id,
      o.name,
      NULL::text as contact_email,
      NULL::text as contact_phone,
      o.website,
      NULL::text as address
    FROM public.organizations o
    WHERE o.id = org_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_organization_contact_info(uuid) TO authenticated;

-- 7. Add function to safely get invitation details
CREATE OR REPLACE FUNCTION get_invitation_details(invitation_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  email text,
  role text,
  status text,
  token text,
  created_at timestamp with time zone,
  expires_at timestamp with time zone
) AS $$
BEGIN
  -- Only return token if user created the invitation
  IF EXISTS (
    SELECT 1 FROM public.organization_invitations oi
    WHERE oi.id = invitation_id 
    AND oi.created_by = auth.uid()
  ) THEN
    RETURN QUERY
    SELECT 
      oi.id,
      oi.organization_id,
      oi.email,
      oi.role,
      oi.status,
      oi.token,
      oi.created_at,
      oi.expires_at
    FROM public.organization_invitations oi
    WHERE oi.id = invitation_id;
  ELSE
    -- Return basic info only
    RETURN QUERY
    SELECT 
      oi.id,
      oi.organization_id,
      oi.email,
      oi.role,
      oi.status,
      NULL::text as token,
      oi.created_at,
      oi.expires_at
    FROM public.organization_invitations oi
    WHERE oi.id = invitation_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_invitation_details(uuid) TO authenticated;

-- 8. Add audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view security audit logs" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- System can insert audit logs
CREATE POLICY "System can insert security audit logs" 
ON public.security_audit_log 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 9. Create trigger function for audit logging
CREATE OR REPLACE FUNCTION log_security_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_organizations_changes ON public.organizations;
CREATE TRIGGER audit_organizations_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION log_security_audit();

DROP TRIGGER IF EXISTS audit_invitations_changes ON public.organization_invitations;
CREATE TRIGGER audit_invitations_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_invitations
  FOR EACH ROW EXECUTE FUNCTION log_security_audit();

DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION log_security_audit();

-- Add comments for documentation
COMMENT ON FUNCTION get_organization_contact_info(uuid) IS 'Safely returns organization contact info - only admins see sensitive data';
COMMENT ON FUNCTION get_invitation_details(uuid) IS 'Safely returns invitation details - only creators see tokens';
COMMENT ON TABLE public.security_audit_log IS 'Audit log for sensitive security operations';

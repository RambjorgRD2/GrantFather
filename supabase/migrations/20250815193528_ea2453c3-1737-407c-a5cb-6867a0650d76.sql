-- Fix grant_applications table to require organization_id
ALTER TABLE public.grant_applications 
ALTER COLUMN organization_id SET NOT NULL;

-- Add foreign key constraint between grant_applications and organizations
ALTER TABLE public.grant_applications 
ADD CONSTRAINT fk_grant_applications_organization 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create invitation tokens table for member invitations
CREATE TABLE public.organization_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'member'::app_role,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone NULL,
  accepted_by uuid NULL
);

-- Enable RLS on invitations table
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for organization invitations
CREATE POLICY "Admins can create invitations for their organization"
ON public.organization_invitations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = organization_invitations.organization_id 
    AND role = 'admin'::app_role
  )
);

CREATE POLICY "Organization members can view invitations"
ON public.organization_invitations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND organization_id = organization_invitations.organization_id
  )
);

-- Create function to automatically create user role when organization is created
CREATE OR REPLACE FUNCTION public.create_organization_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (NEW.created_by, NEW.id, 'admin'::app_role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically assign admin role
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.create_organization_admin_role();

-- Create function to handle invitation acceptance
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(invitation_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record public.organization_invitations;
  result jsonb;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record
  FROM public.organization_invitations
  WHERE token = invitation_token
    AND expires_at > now()
    AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND organization_id = invitation_record.organization_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this organization');
  END IF;

  -- Create user role
  INSERT INTO public.user_roles (user_id, organization_id, role)
  VALUES (auth.uid(), invitation_record.organization_id, invitation_record.role);

  -- Mark invitation as accepted
  UPDATE public.organization_invitations
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = invitation_record.id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', invitation_record.organization_id,
    'role', invitation_record.role
  );
END;
$$;
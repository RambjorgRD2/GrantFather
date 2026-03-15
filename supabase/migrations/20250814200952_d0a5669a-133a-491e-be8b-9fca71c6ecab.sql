-- Create user roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles in their organization"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.organization_id = user_roles.organization_id 
    AND ur.role = 'admin'
  )
);

-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public) VALUES ('organization-logos', 'organization-logos', true);

-- Create storage policies for logos
CREATE POLICY "Organization logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'organization-logos');

CREATE POLICY "Users can upload their organization logo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their organization logo" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
);

-- Add logo_url column to organizations table
ALTER TABLE public.organizations ADD COLUMN logo_url TEXT;

-- Create function to get user role in organization
CREATE OR REPLACE FUNCTION public.get_user_role_in_org(_user_id UUID, _org_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id AND organization_id = _org_id;
$$;
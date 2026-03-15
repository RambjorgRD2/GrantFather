-- PHASE 1: DATABASE INFRASTRUCTURE FIXES

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles RLS policies
CREATE POLICY "Users can view profiles in their organizations"
ON public.profiles
FOR SELECT
USING (
    user_id = auth.uid() 
    OR user_id IN (
        SELECT ur.user_id 
        FROM public.user_roles ur1
        JOIN public.user_roles ur ON ur1.organization_id = ur.organization_id
        WHERE ur1.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

-- Create application_suggestions table
CREATE TABLE public.application_suggestions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('event_based', 'mission_based', 'recurring')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    suggested_funding_amount INTEGER,
    funding_sources TEXT[],
    application_deadline DATE,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_period TEXT,
    status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'applied', 'dismissed')),
    applied_application_id UUID REFERENCES public.grant_applications(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on application_suggestions
ALTER TABLE public.application_suggestions ENABLE ROW LEVEL SECURITY;

-- Create application_suggestions RLS policies
CREATE POLICY "Users can view their organization's suggestions"
ON public.application_suggestions
FOR SELECT
USING (user_belongs_to_organization(organization_id));

CREATE POLICY "System can create suggestions"
ON public.application_suggestions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update suggestions in their organization"
ON public.application_suggestions
FOR UPDATE
USING (user_belongs_to_organization(organization_id));

CREATE POLICY "Users can delete suggestions in their organization"
ON public.application_suggestions
FOR DELETE
USING (user_belongs_to_organization(organization_id));

-- Fix organizations RLS policy for updates (allow organization members, not just creators)
DROP POLICY IF EXISTS "Users can update organizations they created" ON public.organizations;

CREATE POLICY "Users can update organizations they belong to"
ON public.organizations
FOR UPDATE
USING (user_belongs_to_organization(id));

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for application_suggestions updated_at
CREATE TRIGGER update_application_suggestions_updated_at
    BEFORE UPDATE ON public.application_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
        NEW.email
    );
    RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_profile();

-- Add primary_contact_user_id to organizations table
ALTER TABLE public.organizations 
ADD COLUMN primary_contact_user_id UUID REFERENCES auth.users(id);

-- Create storage policies for organization-logos bucket
INSERT INTO storage.objects (bucket_id, name, owner, metadata) 
SELECT 'organization-logos', 'test', auth.uid(), '{}' 
WHERE NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'organization-logos' LIMIT 1);

-- Delete the test object
DELETE FROM storage.objects WHERE bucket_id = 'organization-logos' AND name = 'test';

-- Create comprehensive storage policies for organization logos
CREATE POLICY "Users can view organization logos"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'organization-logos'
    AND (
        auth.uid() IS NOT NULL
        OR true -- logos are public
    )
);

CREATE POLICY "Organization members can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'organization-logos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.organization_id::text = (storage.foldername(name))[1]
    )
);

CREATE POLICY "Organization members can update logos"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'organization-logos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.organization_id::text = (storage.foldername(name))[1]
    )
);

CREATE POLICY "Organization members can delete logos"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'organization-logos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.organization_id::text = (storage.foldername(name))[1]
    )
);
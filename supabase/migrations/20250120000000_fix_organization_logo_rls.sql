-- Fix organization logo storage RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can delete logos" ON storage.objects;

-- Create simplified storage policies for organization logos
CREATE POLICY "Anyone can view organization logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'organization-logos');

CREATE POLICY "Authenticated users can upload organization logos"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'organization-logos'
    AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update organization logos"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'organization-logos'
    AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete organization logos"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'organization-logos'
    AND auth.uid() IS NOT NULL
);

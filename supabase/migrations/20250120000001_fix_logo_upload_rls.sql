-- Fix organization logo upload RLS policies

-- First, ensure the organization-logos bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete organization logos" ON storage.objects;

-- Create simple, working storage policies
CREATE POLICY "Allow public read access to organization logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'organization-logos');

CREATE POLICY "Allow authenticated users to upload organization logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated users to update organization logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated users to delete organization logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
);

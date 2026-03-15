-- Storage Bucket Configuration for organization-logos
-- Run this in your Supabase SQL Editor

-- Create the organization-logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'organization-logos',
    'organization-logos',
    true, -- Make it public for easier access
    2097152, -- 2MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policies for organization-logos bucket
-- Allow authenticated users to upload logos
CREATE POLICY IF NOT EXISTS "Allow authenticated users to upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'organization-logos');

-- Allow authenticated users to view logos
CREATE POLICY IF NOT EXISTS "Allow authenticated users to view logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'organization-logos');

-- Allow authenticated users to update logos
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'organization-logos');

-- Allow authenticated users to delete logos
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'organization-logos');

-- Allow public access to view logos (since bucket is public)
CREATE POLICY IF NOT EXISTS "Allow public access to view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organization-logos');

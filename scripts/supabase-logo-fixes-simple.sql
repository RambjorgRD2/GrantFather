-- =====================================================
-- SIMPLE LOGO FIXES - Run this first
-- =====================================================

-- 1. CREATE STORAGE BUCKET (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'organization-logos',
    'organization-logos',
    true,
    2097152,
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- 2. CREATE RLS POLICIES
DROP POLICY IF EXISTS "Allow authenticated users to upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to view logos" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'organization-logos');

CREATE POLICY "Allow authenticated users to view logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'organization-logos');

CREATE POLICY "Allow public access to view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organization-logos');

-- 3. VERIFY SETUP
SELECT 'Bucket created/updated' as status, name, public FROM storage.buckets WHERE name = 'organization-logos';
SELECT 'Policies created' as status, count(*) as policy_count FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

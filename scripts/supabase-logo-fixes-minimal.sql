-- =====================================================
-- MINIMAL LOGO FIXES - Essential fixes only
-- =====================================================

-- 1. CREATE/UPDATE STORAGE BUCKET
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

-- 2. CREATE ESSENTIAL RLS POLICIES
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
SELECT 'Bucket Status' as check_type, name, public FROM storage.buckets WHERE name = 'organization-logos';
SELECT 'Policy Count' as check_type, count(*) as policy_count FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
SELECT 'Organizations' as check_type, count(*) as org_count, count(logo_url) as with_logos FROM organizations;

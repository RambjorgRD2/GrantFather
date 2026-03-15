-- =====================================================
-- CORRECTED LOGO FIXES - Run this instead
-- =====================================================

-- 1. CREATE STORAGE BUCKET (if it doesn't exist)
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

-- 2. CREATE RLS POLICIES FOR STORAGE
-- ===================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to view logos" ON storage.objects;

-- Create new policies
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'organization-logos');

CREATE POLICY "Allow authenticated users to view logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'organization-logos');

CREATE POLICY "Allow authenticated users to update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'organization-logos');

CREATE POLICY "Allow authenticated users to delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'organization-logos');

-- Allow public access to view logos (since bucket is public)
CREATE POLICY "Allow public access to view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organization-logos');

-- 3. FIX ORGANIZATIONS TABLE
-- ===========================
-- Ensure logo_url column exists
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_logo_url 
ON organizations(logo_url) 
WHERE logo_url IS NOT NULL;

-- 4. CLEAN UP EXISTING DATA
-- ==========================
-- Update any existing organizations with invalid logo URLs
UPDATE organizations 
SET logo_url = NULL 
WHERE logo_url IS NOT NULL 
AND (logo_url = '' OR logo_url NOT LIKE 'http%');

-- 5. CREATE UTILITY FUNCTIONS
-- ============================
-- Function to clean up orphaned logo references
CREATE OR REPLACE FUNCTION cleanup_orphaned_logos()
RETURNS void AS $$
DECLARE
    org_record RECORD;
    logo_exists BOOLEAN;
BEGIN
    FOR org_record IN 
        SELECT id, logo_url FROM organizations 
        WHERE logo_url IS NOT NULL 
        AND logo_url LIKE '%organization-logos%'
    LOOP
        -- Check if the logo file exists in storage
        SELECT EXISTS(
            SELECT 1 FROM storage.objects 
            WHERE bucket_id = 'organization-logos' 
            AND name = split_part(org_record.logo_url, '/', -1)
        ) INTO logo_exists;
        
        -- If logo doesn't exist, clear the reference
        IF NOT logo_exists THEN
            UPDATE organizations 
            SET logo_url = NULL 
            WHERE id = org_record.id;
            
            RAISE NOTICE 'Cleared orphaned logo reference for organization %', org_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get organization logo URL with fallback
CREATE OR REPLACE FUNCTION get_organization_logo_url(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    logo_url TEXT;
BEGIN
    SELECT organizations.logo_url INTO logo_url
    FROM organizations 
    WHERE id = org_id;
    
    -- If no logo URL, return NULL
    IF logo_url IS NULL OR logo_url = '' THEN
        RETURN NULL;
    END IF;
    
    -- If it's already a full URL, return it
    IF logo_url LIKE 'http%' THEN
        RETURN logo_url;
    END IF;
    
    -- If it's a relative path, construct full URL
    RETURN 'https://fjlrplhtgknuulqymsse.supabase.co/storage/v1/object/public/organization-logos/' || logo_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_logo_url(UUID) TO authenticated;

-- 6. RUN CLEANUP
-- ===============
-- Run the cleanup function to remove orphaned references
SELECT cleanup_orphaned_logos();

-- 7. VERIFY SETUP
-- ================
-- Check bucket configuration
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'organization-logos';

-- Check RLS policies (using correct table)
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND (policyname LIKE '%logo%' OR policyname LIKE '%organization%');

-- Check organizations with logos
SELECT 
    id,
    name,
    logo_url,
    CASE 
        WHEN logo_url IS NULL THEN 'No logo'
        WHEN logo_url LIKE 'http%' THEN 'Valid URL'
        ELSE 'Invalid URL'
    END as logo_status
FROM organizations 
ORDER BY created_at DESC;

-- Test storage access (using correct column names)
SELECT 
    name,
    metadata->>'size' as size,
    metadata->>'mimetype' as content_type,
    created_at
FROM storage.objects 
WHERE bucket_id = 'organization-logos'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- SCRIPT COMPLETED
-- =====================================================
-- 
-- Next steps:
-- 1. Verify the output above shows no errors
-- 2. Check that the organization-logos bucket is public
-- 3. Verify RLS policies are created
-- 4. Test logo upload in your application
-- 5. Check that existing logos are accessible
--
-- If you see any errors, please check:
-- - Your user has admin privileges
-- - The storage service is enabled
-- - The organizations table exists
-- =====================================================

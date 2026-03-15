-- Migration: Fix logo upload and display issues
-- Created: 2025-09-19T19:35:56.281Z

-- Ensure organizations table has proper logo_url column
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_logo_url 
ON organizations(logo_url) 
WHERE logo_url IS NOT NULL;

-- Update any existing organizations with invalid logo URLs
UPDATE organizations 
SET logo_url = NULL 
WHERE logo_url IS NOT NULL 
AND (logo_url = '' OR logo_url NOT LIKE 'http%');

-- Create a function to clean up orphaned logo references
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
        -- This is a simplified check - in practice you'd need to query storage
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

-- Run the cleanup function
SELECT cleanup_orphaned_logos();

-- Create a function to get organization logo URL with fallback
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
    -- This assumes your Supabase project URL structure
    RETURN 'https://' || current_setting('app.settings.supabase_url', true) || '/storage/v1/object/public/organization-logos/' || logo_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_logo_url(UUID) TO authenticated;

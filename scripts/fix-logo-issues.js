#!/usr/bin/env node

/**
 * Logo Issues Fix Script
 *
 * This script provides comprehensive fixes for logo upload and display issues.
 * It includes database fixes, storage configuration, and code improvements.
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Logo Issues Fix Script');
console.log('========================\n');

// 1. Database Migration for Logo Issues
const createDatabaseMigration = () => {
  const migration = `-- Migration: Fix logo upload and display issues
-- Created: ${new Date().toISOString()}

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
`;

  fs.writeFileSync(
    'supabase/migrations/20250117000000_fix_logo_issues.sql',
    migration
  );
  console.log(
    '✅ Created database migration: supabase/migrations/20250117000000_fix_logo_issues.sql'
  );
};

// 2. Storage Bucket Configuration
const createStorageConfig = () => {
  const storageConfig = `-- Storage Bucket Configuration for organization-logos
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
`;

  fs.writeFileSync(
    'supabase/migrations/20250117000001_storage_logo_config.sql',
    storageConfig
  );
  console.log(
    '✅ Created storage configuration: supabase/migrations/20250117000001_storage_logo_config.sql'
  );
};

// 3. Improved Logo Upload Component
const createImprovedLogoComponent = () => {
  const improvedComponent = `import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, X, AlertCircle } from 'lucide-react';

interface LogoUploadProps {
  organizationId: string;
  currentLogoUrl?: string | null;
  onLogoChange: (logoUrl: string | null) => void;
  disabled?: boolean;
}

export function LogoUpload({ 
  organizationId, 
  currentLogoUrl, 
  onLogoChange, 
  disabled = false 
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update local state when prop changes
  React.useEffect(() => {
    setLogoUrl(currentLogoUrl);
  }, [currentLogoUrl]);

  const uploadLogo = useCallback(async (file: File) => {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload PNG, JPG, or WebP images only.');
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File too large. Please select an image under 2MB.');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = \`\${organizationId}-\${Date.now()}.\${fileExt}\`;

    console.log('Uploading logo:', { fileName, fileSize: file.size, fileType: file.type });

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('organization-logos')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(\`Upload failed: \${uploadError.message}\`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('organization-logos')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;
    console.log('Logo uploaded successfully:', { path: uploadData.path, publicUrl });

    // Update organization in database
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ logo_url: publicUrl })
      .eq('id', organizationId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(\`Failed to update organization: \${updateError.message}\`);
    }

    return publicUrl;
  }, [organizationId]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const newLogoUrl = await uploadLogo(file);
      setLogoUrl(newLogoUrl);
      onLogoChange(newLogoUrl);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      
      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      setUploadError(error.message);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const removeLogo = async () => {
    if (!organizationId) return;

    try {
      // Update database
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', organizationId);

      if (updateError) {
        throw new Error(\`Failed to remove logo: \${updateError.message}\`);
      }

      setLogoUrl(null);
      onLogoChange(null);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      
      toast({
        title: 'Success',
        description: 'Logo removed successfully',
      });
    } catch (error: any) {
      console.error('Logo removal error:', error);
      toast({
        title: 'Removal failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-3">
      <Label>Organization Logo</Label>
      <div className="flex items-center gap-4">
        <div
          className="relative w-20 h-20 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border overflow-hidden"
          data-testid="logo-preview"
        >
          {logoUrl ? (
            <>
              <img
                src={logoUrl}
                alt="Organization logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Logo display error:', logoUrl);
                  setLogoUrl(null);
                  onLogoChange(null);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={removeLogo}
                disabled={disabled || isUploading}
                className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <input
            type="file"
            id="logo-upload"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('logo-upload')?.click()}
            disabled={disabled || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Change Logo
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, JPG up to 2MB
          </p>
          {uploadError && (
            <div className="flex items-center gap-1 mt-1 text-sm text-red-500">
              <AlertCircle className="h-3 w-3" />
              {uploadError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;

  fs.writeFileSync('src/components/ui/LogoUpload.tsx', improvedComponent);
  console.log(
    '✅ Created improved logo upload component: src/components/ui/LogoUpload.tsx'
  );
};

// 4. Debug and Test Script
const createDebugScript = () => {
  const debugScript = `#!/usr/bin/env node

/**
 * Logo Debug and Test Script
 * 
 * This script helps debug logo upload and display issues.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLogoUpload() {
  console.log('🧪 Testing logo upload...');
  
  try {
    // Create a test image (1x1 pixel PNG)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageData, 'base64');
    
    const fileName = \`test-\${Date.now()}.png\`;
    
    const { data, error } = await supabase.storage
      .from('organization-logos')
      .upload(fileName, testImageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (error) {
      console.error('❌ Upload failed:', error.message);
      return;
    }
    
    console.log('✅ Upload successful:', data);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('organization-logos')
      .getPublicUrl(fileName);
    
    console.log('✅ Public URL:', urlData.publicUrl);
    
    // Test URL access
    const response = await fetch(urlData.publicUrl);
    console.log('✅ URL accessible:', response.ok);
    
    // Clean up
    await supabase.storage
      .from('organization-logos')
      .remove([fileName]);
    
    console.log('✅ Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function checkOrganizations() {
  console.log('\\n📊 Checking organizations...');
  
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, logo_url')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(\`Found \${orgs.length} organizations:\`);
  orgs.forEach(org => {
    console.log(\`- \${org.name}: \${org.logo_url || 'No logo'}\`);
  });
}

async function main() {
  console.log('🔍 Logo Debug Script');
  console.log('===================\\n');
  
  await checkOrganizations();
  await testLogoUpload();
  
  console.log('\\n✅ Debug complete!');
}

main().catch(console.error);`;

  fs.writeFileSync('scripts/debug-logo.js', debugScript);
  console.log('✅ Created debug script: scripts/debug-logo.js');
};

// 5. Main execution
const main = () => {
  console.log('Creating comprehensive logo fix...\n');

  createDatabaseMigration();
  createStorageConfig();
  createImprovedLogoComponent();
  createDebugScript();

  console.log('\n🎉 Logo fix package created successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Apply database migrations in Supabase dashboard');
  console.log('2. Run: node scripts/debug-logo.js');
  console.log('3. Test logo upload functionality');
  console.log('4. Replace existing logo upload code with improved component');
  console.log('5. Monitor browser console for any remaining issues');

  console.log('\n🔧 Files created:');
  console.log('- supabase/migrations/20250117000000_fix_logo_issues.sql');
  console.log('- supabase/migrations/20250117000001_storage_logo_config.sql');
  console.log('- src/components/ui/LogoUpload.tsx');
  console.log('- scripts/debug-logo.js');
};

main();

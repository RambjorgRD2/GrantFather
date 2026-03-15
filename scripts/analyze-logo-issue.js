#!/usr/bin/env node

/**
 * Logo Upload & Display Issue Analysis Script
 *
 * This script analyzes the logo upload and display functionality to identify
 * potential issues with:
 * 1. Database storage of logo URLs
 * 2. Storage bucket configuration and policies
 * 3. URL resolution and display logic
 * 4. Organization data consistency
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from both .env files
const envVars = {};

// Read .env file
try {
  const envContent = readFileSync('.env', 'utf8');
  envContent.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim().replace(/['"]/g, '');
    }
  });
} catch (error) {
  console.warn('⚠️  Could not read .env file');
}

// Read .env.local file
try {
  const envLocalContent = readFileSync('.env.local', 'utf8');
  envLocalContent.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim().replace(/['"]/g, '');
    }
  });
} catch (error) {
  console.warn('⚠️  Could not read .env.local file');
}

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.CYPRESS_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('   CYPRESS_SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Logo Upload & Display Issue Analysis');
console.log('=====================================\n');

async function analyzeOrganizations() {
  console.log('📊 1. ORGANIZATION DATA ANALYSIS');
  console.log('--------------------------------');

  try {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching organizations:', error.message);
      return;
    }

    console.log(`Found ${orgs.length} organizations:`);
    orgs.forEach((org, index) => {
      console.log(`\n${index + 1}. ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Logo URL: ${org.logo_url || 'NULL'}`);
      console.log(`   Created: ${org.created_at}`);
      console.log(`   Updated: ${org.updated_at}`);

      if (org.logo_url) {
        // Check if URL is valid
        try {
          new URL(org.logo_url);
          console.log(`   ✅ Valid URL format`);
        } catch (e) {
          console.log(`   ❌ Invalid URL format: ${e.message}`);
        }
      }
    });

    return orgs;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return [];
  }
}

async function analyzeStorageBucket() {
  console.log('\n🗄️  2. STORAGE BUCKET ANALYSIS');
  console.log('--------------------------------');

  try {
    // Check if organization-logos bucket exists
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error fetching buckets:', bucketsError.message);
      return;
    }

    const logoBucket = buckets.find(
      (bucket) => bucket.name === 'organization-logos'
    );

    if (!logoBucket) {
      console.log('❌ organization-logos bucket not found');
      console.log('Available buckets:', buckets.map((b) => b.name).join(', '));
      return;
    }

    console.log('✅ organization-logos bucket exists');
    console.log(`   Public: ${logoBucket.public}`);
    console.log(`   Created: ${logoBucket.created_at}`);
    console.log(`   Updated: ${logoBucket.updated_at}`);

    // List files in the bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('organization-logos')
      .list('', { limit: 50 });

    if (filesError) {
      console.error('❌ Error listing files:', filesError.message);
      return;
    }

    console.log(`\n📁 Files in organization-logos bucket (${files.length}):`);
    if (files.length === 0) {
      console.log('   No files found');
    } else {
      files.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name}`);
        console.log(`      Size: ${file.metadata?.size || 'Unknown'} bytes`);
        console.log(`      Type: ${file.metadata?.mimetype || 'Unknown'}`);
        console.log(`      Created: ${file.created_at}`);
      });
    }

    return { bucket: logoBucket, files };
  } catch (error) {
    console.error('❌ Storage analysis error:', error.message);
    return null;
  }
}

async function analyzeStoragePolicies() {
  console.log('\n🔒 3. STORAGE RLS POLICIES ANALYSIS');
  console.log('-----------------------------------');

  try {
    // Query storage.objects policies
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'objects')
      .eq('schemaname', 'storage');

    if (error) {
      console.error('❌ Error fetching RLS policies:', error.message);
      return;
    }

    console.log(`Found ${policies.length} RLS policies for storage.objects:`);

    if (policies.length === 0) {
      console.log(
        '❌ No RLS policies found - this will block all storage operations'
      );
      return;
    }

    policies.forEach((policy, index) => {
      console.log(`\n${index + 1}. ${policy.policyname}`);
      console.log(`   Command: ${policy.cmd}`);
      console.log(`   Roles: ${policy.roles?.join(', ') || 'All'}`);
      console.log(`   Qual: ${policy.qual || 'N/A'}`);
      console.log(`   With Check: ${policy.with_check || 'N/A'}`);
    });

    return policies;
  } catch (error) {
    console.error('❌ RLS policies analysis error:', error.message);
    return [];
  }
}

async function testLogoUrlAccess(organizations) {
  console.log('\n🌐 4. LOGO URL ACCESS TESTING');
  console.log('------------------------------');

  const orgsWithLogos = organizations.filter((org) => org.logo_url);

  if (orgsWithLogos.length === 0) {
    console.log('ℹ️  No organizations have logo URLs to test');
    return;
  }

  for (const org of orgsWithLogos) {
    console.log(`\nTesting logo for: ${org.name}`);
    console.log(`URL: ${org.logo_url}`);

    try {
      // Test if URL is accessible
      const response = await fetch(org.logo_url, { method: 'HEAD' });
      console.log(`   Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        console.log(`   ✅ Accessible`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        console.log(
          `   Content-Length: ${response.headers.get('content-length')} bytes`
        );
      } else {
        console.log(`   ❌ Not accessible`);
      }
    } catch (error) {
      console.log(`   ❌ Error accessing URL: ${error.message}`);
    }
  }
}

async function analyzeUserRoles() {
  console.log('\n👥 5. USER ROLES ANALYSIS');
  console.log('-------------------------');

  try {
    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select(
        `
        id,
        user_id,
        organization_id,
        role,
        created_at,
        organizations!inner(id, name)
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching user roles:', error.message);
      return;
    }

    console.log(`Found ${userRoles.length} user role assignments:`);

    // Group by organization
    const orgGroups = userRoles.reduce((acc, role) => {
      const orgName = role.organizations.name;
      if (!acc[orgName]) acc[orgName] = [];
      acc[orgName].push(role);
      return acc;
    }, {});

    Object.entries(orgGroups).forEach(([orgName, roles]) => {
      console.log(`\n${orgName}:`);
      roles.forEach((role) => {
        console.log(`   - User ${role.user_id}: ${role.role}`);
      });
    });

    return userRoles;
  } catch (error) {
    console.error('❌ User roles analysis error:', error.message);
    return [];
  }
}

async function generateRecommendations(organizations, storageData, policies) {
  console.log('\n💡 6. RECOMMENDATIONS');
  console.log('====================');

  const issues = [];
  const recommendations = [];

  // Check for organizations without logos
  const orgsWithoutLogos = organizations.filter((org) => !org.logo_url);
  if (orgsWithoutLogos.length > 0) {
    issues.push(`${orgsWithoutLogos.length} organizations have no logo URLs`);
    recommendations.push('Upload logos for organizations that need them');
  }

  // Check for invalid logo URLs
  const orgsWithInvalidUrls = organizations.filter((org) => {
    if (!org.logo_url) return false;
    try {
      new URL(org.logo_url);
      return false;
    } catch {
      return true;
    }
  });

  if (orgsWithInvalidUrls.length > 0) {
    issues.push(
      `${orgsWithInvalidUrls.length} organizations have invalid logo URLs`
    );
    recommendations.push('Fix invalid logo URLs in the database');
  }

  // Check storage bucket
  if (!storageData?.bucket) {
    issues.push('organization-logos bucket does not exist');
    recommendations.push('Create the organization-logos bucket');
  } else if (!storageData.bucket.public) {
    issues.push(
      'organization-logos bucket is private but may need public access'
    );
    recommendations.push(
      'Consider making organization-logos bucket public for easier access'
    );
  }

  // Check RLS policies
  if (!policies || policies.length === 0) {
    issues.push('No RLS policies found for storage.objects');
    recommendations.push(
      'Create RLS policies to allow logo uploads and access'
    );
  } else {
    const hasInsertPolicy = policies.some((p) => p.cmd === 'INSERT');
    const hasSelectPolicy = policies.some((p) => p.cmd === 'SELECT');

    if (!hasInsertPolicy) {
      issues.push('No INSERT policy for storage.objects');
      recommendations.push('Create INSERT policy to allow logo uploads');
    }

    if (!hasSelectPolicy) {
      issues.push('No SELECT policy for storage.objects');
      recommendations.push('Create SELECT policy to allow logo downloads');
    }
  }

  // Check for files in storage
  if (storageData?.files && storageData.files.length === 0) {
    issues.push('No files found in organization-logos bucket');
    recommendations.push('Upload test logos to verify storage functionality');
  }

  if (issues.length === 0) {
    console.log('✅ No obvious issues found');
  } else {
    console.log('❌ Issues identified:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }

  if (recommendations.length > 0) {
    console.log('\n🔧 Recommended actions:');
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  // Generate SQL fixes
  console.log('\n📝 SQL FIXES TO APPLY:');
  console.log('----------------------');

  if (!policies || policies.length === 0) {
    console.log(`
-- Create basic RLS policies for organization-logos bucket
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
`);
  }

  if (!storageData?.bucket) {
    console.log(`
-- Create organization-logos bucket (run in Supabase dashboard)
-- Go to Storage > Create Bucket
-- Name: organization-logos
-- Public: true (for easier access)
-- File size limit: 2MB
-- Allowed MIME types: image/png, image/jpeg, image/jpg, image/webp
`);
  }
}

async function main() {
  try {
    const organizations = await analyzeOrganizations();
    const storageData = await analyzeStorageBucket();
    const policies = await analyzeStoragePolicies();
    const userRoles = await analyzeUserRoles();

    await testLogoUrlAccess(organizations);
    await generateRecommendations(organizations, storageData, policies);

    console.log('\n✅ Analysis complete!');
    console.log('\nNext steps:');
    console.log('1. Review the issues and recommendations above');
    console.log('2. Apply the SQL fixes in your Supabase dashboard');
    console.log('3. Test logo upload functionality');
    console.log('4. Verify logo display in the UI');
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

main();

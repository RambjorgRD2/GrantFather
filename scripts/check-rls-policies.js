#!/usr/bin/env node

/**
 * Check RLS Policies Script
 *
 * This script directly checks if RLS policies were created properly.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
const envVars = {};

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
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 Checking RLS Policies');
console.log('========================\n');

async function checkPoliciesDirectly() {
  console.log('1. Checking RLS policies directly...');

  try {
    // Try to query the policies table directly
    const { data: policies, error } = await supabase.rpc('exec_sql', {
      query: `
          SELECT 
            policyname,
            cmd,
            roles,
            qual,
            with_check
          FROM pg_policies 
          WHERE schemaname = 'storage' 
          AND tablename = 'objects'
          AND (policyname LIKE '%logo%' OR policyname LIKE '%organization%')
          ORDER BY policyname;
        `,
    });

    if (error) {
      console.error('❌ Error querying policies:', error.message);
      return false;
    }

    console.log(`Found ${policies.length} logo-related policies:`);

    if (policies.length === 0) {
      console.log('❌ No logo policies found');
      return false;
    }

    policies.forEach((policy) => {
      console.log(`   ✅ ${policy.policyname} (${policy.cmd})`);
    });

    return policies.length > 0;
  } catch (error) {
    console.error('❌ Direct policy check failed:', error.message);
    return false;
  }
}

async function testStorageAccess() {
  console.log('\n2. Testing storage access directly...');

  try {
    // Try to list files in the bucket
    const { data: files, error } = await supabase.storage
      .from('organization-logos')
      .list('', { limit: 10 });

    if (error) {
      console.error('❌ Error listing files:', error.message);
      return false;
    }

    console.log(`✅ Can list files: ${files.length} files found`);

    // Try to get a specific file
    if (files.length > 0) {
      const testFile = files[0];
      console.log(`   Testing access to: ${testFile.name}`);

      const { data: urlData } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(testFile.name);

      console.log(`   Public URL: ${urlData.publicUrl}`);

      // Test if the URL is accessible
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('   ✅ File is accessible');
          return true;
        } else {
          console.log(
            `   ❌ File not accessible: ${response.status} ${response.statusText}`
          );
          return false;
        }
      } catch (fetchError) {
        console.log(`   ❌ Error accessing file: ${fetchError.message}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Storage access test failed:', error.message);
    return false;
  }
}

async function checkSpecificLogos() {
  console.log('\n3. Checking specific organization logos...');

  try {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url')
      .not('logo_url', 'is', null);

    if (error) {
      console.error('❌ Error fetching organizations:', error.message);
      return false;
    }

    console.log(`Found ${orgs.length} organizations with logos:`);

    for (const org of orgs) {
      console.log(`\n   Checking ${org.name}:`);
      console.log(`   URL: ${org.logo_url}`);

      // Extract filename from URL
      const filename = org.logo_url.split('/').pop();
      console.log(`   Filename: ${filename}`);

      // Check if file exists in storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from('organization-logos')
        .list('', { search: filename });

      if (fileError) {
        console.log(`   ❌ Error checking file: ${fileError.message}`);
      } else if (fileData && fileData.length > 0) {
        console.log(`   ✅ File exists in storage`);

        // Test direct access
        const { data: urlData } = supabase.storage
          .from('organization-logos')
          .getPublicUrl(filename);

        try {
          const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log(`   ✅ File is accessible via public URL`);
          } else {
            console.log(
              `   ❌ File not accessible: ${response.status} ${response.statusText}`
            );
          }
        } catch (fetchError) {
          console.log(`   ❌ Error accessing file: ${fetchError.message}`);
        }
      } else {
        console.log(`   ❌ File not found in storage`);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Specific logo check failed:', error.message);
    return false;
  }
}

async function main() {
  const results = {
    policies: await checkPoliciesDirectly(),
    storageAccess: await testStorageAccess(),
    specificLogos: await checkSpecificLogos(),
  };

  console.log('\n📊 DIAGNOSTIC RESULTS');
  console.log('======================');
  console.log(`RLS Policies: ${results.policies ? '✅ FOUND' : '❌ MISSING'}`);
  console.log(
    `Storage Access: ${results.storageAccess ? '✅ WORKING' : '❌ FAILED'}`
  );
  console.log(
    `Specific Logos: ${results.specificLogos ? '✅ CHECKED' : '❌ FAILED'}`
  );

  if (!results.policies) {
    console.log('\n🔧 SOLUTION:');
    console.log('The RLS policies were not created properly.');
    console.log('Please run the SQL script again in Supabase SQL Editor.');
    console.log(
      'Make sure you have admin privileges and the script runs without errors.'
    );
  }
}

main().catch(console.error);

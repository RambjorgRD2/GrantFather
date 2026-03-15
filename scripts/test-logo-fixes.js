#!/usr/bin/env node

/**
 * Test Logo Fixes Script
 *
 * This script tests the logo upload and display functionality
 * after applying the database fixes.
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

console.log('🧪 Testing Logo Fixes');
console.log('====================\n');

async function testStorageBucket() {
  console.log('1. Testing Storage Bucket...');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Error fetching buckets:', error.message);
      return false;
    }

    const logoBucket = buckets.find(
      (bucket) => bucket.name === 'organization-logos'
    );

    if (!logoBucket) {
      console.error('❌ organization-logos bucket not found');
      return false;
    }

    console.log('✅ organization-logos bucket exists');
    console.log(`   Public: ${logoBucket.public}`);
    console.log(`   File size limit: ${logoBucket.file_size_limit} bytes`);
    console.log(
      `   Allowed types: ${logoBucket.allowed_mime_types?.join(', ')}`
    );

    return logoBucket.public === true;
  } catch (error) {
    console.error('❌ Storage bucket test failed:', error.message);
    return false;
  }
}

async function testRLSPolicies() {
  console.log('\n2. Testing RLS Policies...');

  try {
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'objects')
      .eq('schemaname', 'storage');

    if (error) {
      console.error('❌ Error fetching RLS policies:', error.message);
      return false;
    }

    const logoPolicies = policies.filter(
      (p) =>
        p.policyname.includes('logo') ||
        p.policyname.includes('organization-logos')
    );

    console.log(`Found ${logoPolicies.length} logo-related policies:`);

    if (logoPolicies.length === 0) {
      console.error('❌ No logo policies found');
      return false;
    }

    logoPolicies.forEach((policy) => {
      console.log(`   ✅ ${policy.policyname} (${policy.cmd})`);
    });

    return logoPolicies.length > 0;
  } catch (error) {
    console.error('❌ RLS policies test failed:', error.message);
    return false;
  }
}

async function testLogoUpload() {
  console.log('\n3. Testing Logo Upload...');

  try {
    // Create a test image (1x1 pixel PNG)
    const testImageData =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageData, 'base64');

    const fileName = `test-${Date.now()}.png`;

    console.log(`   Uploading test file: ${fileName}`);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('organization-logos')
      .upload(fileName, testImageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      return false;
    }

    console.log('✅ Upload successful');

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('organization-logos')
      .getPublicUrl(fileName);

    console.log(`   Public URL: ${urlData.publicUrl}`);

    // Test URL access
    const response = await fetch(urlData.publicUrl);
    if (response.ok) {
      console.log('✅ URL accessible');
    } else {
      console.log(
        `❌ URL not accessible: ${response.status} ${response.statusText}`
      );
      return false;
    }

    // Clean up test file
    await supabase.storage.from('organization-logos').remove([fileName]);

    console.log('✅ Test file cleaned up');

    return true;
  } catch (error) {
    console.error('❌ Logo upload test failed:', error.message);
    return false;
  }
}

async function testExistingLogos() {
  console.log('\n4. Testing Existing Logos...');

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

    let accessibleCount = 0;

    for (const org of orgs) {
      console.log(`\n   Testing ${org.name}:`);
      console.log(`   URL: ${org.logo_url}`);

      try {
        const response = await fetch(org.logo_url, { method: 'HEAD' });
        if (response.ok) {
          console.log('   ✅ Accessible');
          accessibleCount++;
        } else {
          console.log(
            `   ❌ Not accessible: ${response.status} ${response.statusText}`
          );
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log(
      `\n   Summary: ${accessibleCount}/${orgs.length} logos accessible`
    );

    return accessibleCount > 0;
  } catch (error) {
    console.error('❌ Existing logos test failed:', error.message);
    return false;
  }
}

async function main() {
  const results = {
    storageBucket: await testStorageBucket(),
    rlsPolicies: await testRLSPolicies(),
    logoUpload: await testLogoUpload(),
    existingLogos: await testExistingLogos(),
  };

  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(
    `Storage Bucket: ${results.storageBucket ? '✅ PASS' : '❌ FAIL'}`
  );
  console.log(`RLS Policies: ${results.rlsPolicies ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Logo Upload: ${results.logoUpload ? '✅ PASS' : '❌ FAIL'}`);
  console.log(
    `Existing Logos: ${results.existingLogos ? '✅ PASS' : '❌ FAIL'}`
  );

  const allPassed = Object.values(results).every((result) => result);

  if (allPassed) {
    console.log('\n🎉 All tests passed! Logo functionality should be working.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
    console.log('\nNext steps:');
    console.log('1. Run the SQL fixes in Supabase SQL Editor');
    console.log('2. Check your Supabase project settings');
    console.log('3. Verify storage permissions');
  }
}

main().catch(console.error);

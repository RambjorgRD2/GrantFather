#!/usr/bin/env node

/**
 * Fix Orphaned Logos Script
 *
 * This script cleans up orphaned logo references in the database
 * and updates them to point to existing files or clears them.
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

console.log('🔧 Fixing Orphaned Logo References');
console.log('==================================\n');

async function getExistingFiles() {
  console.log('1. Getting existing files in storage...');

  try {
    const { data: files, error } = await supabase.storage
      .from('organization-logos')
      .list('', { limit: 100 });

    if (error) {
      console.error('❌ Error listing files:', error.message);
      return [];
    }

    console.log(`✅ Found ${files.length} files in storage:`);
    files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.name}`);
    });

    return files.map((f) => f.name);
  } catch (error) {
    console.error('❌ Error getting existing files:', error.message);
    return [];
  }
}

async function getOrganizationsWithLogos() {
  console.log('\n2. Getting organizations with logo URLs...');

  try {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url')
      .not('logo_url', 'is', null);

    if (error) {
      console.error('❌ Error fetching organizations:', error.message);
      return [];
    }

    console.log(`✅ Found ${orgs.length} organizations with logo URLs:`);
    orgs.forEach((org, index) => {
      const filename = org.logo_url.split('/').pop();
      console.log(`   ${index + 1}. ${org.name}: ${filename}`);
    });

    return orgs;
  } catch (error) {
    console.error('❌ Error getting organizations:', error.message);
    return [];
  }
}

async function fixOrphanedLogos(organizations, existingFiles) {
  console.log('\n3. Fixing orphaned logo references...');

  let fixedCount = 0;
  let clearedCount = 0;

  for (const org of organizations) {
    const filename = org.logo_url.split('/').pop();
    console.log(`\n   Checking ${org.name}:`);
    console.log(`   Current logo: ${filename}`);

    if (existingFiles.includes(filename)) {
      console.log(`   ✅ Logo file exists - no action needed`);
      continue;
    }

    console.log(`   ❌ Logo file not found - checking for alternatives...`);

    // Look for files that might belong to this organization
    const orgId = org.id;
    const possibleFiles = existingFiles.filter(
      (file) =>
        file.includes(orgId) ||
        file.includes(org.name.toLowerCase().replace(/\s+/g, '-'))
    );

    if (possibleFiles.length > 0) {
      // Found a potential match
      const newFilename = possibleFiles[0];
      const newUrl = `https://fjlrplhtgknuulqymsse.supabase.co/storage/v1/object/public/organization-logos/${newFilename}`;

      console.log(`   🔄 Found potential match: ${newFilename}`);

      try {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ logo_url: newUrl })
          .eq('id', org.id);

        if (updateError) {
          console.log(`   ❌ Failed to update: ${updateError.message}`);
        } else {
          console.log(`   ✅ Updated logo URL`);
          fixedCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error updating: ${error.message}`);
      }
    } else {
      // No matching file found, clear the reference
      console.log(`   🗑️  No matching file found - clearing logo reference`);

      try {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ logo_url: null })
          .eq('id', org.id);

        if (updateError) {
          console.log(`   ❌ Failed to clear: ${updateError.message}`);
        } else {
          console.log(`   ✅ Cleared logo reference`);
          clearedCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error clearing: ${error.message}`);
      }
    }
  }

  console.log(`\n📊 FIX SUMMARY:`);
  console.log(`   Fixed: ${fixedCount} organizations`);
  console.log(`   Cleared: ${clearedCount} organizations`);

  return { fixedCount, clearedCount };
}

async function testFixedLogos() {
  console.log('\n4. Testing fixed logos...');

  try {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name, logo_url')
      .not('logo_url', 'is', null);

    if (error) {
      console.error('❌ Error fetching organizations:', error.message);
      return;
    }

    console.log(`Found ${orgs.length} organizations with logos after fix:`);

    let accessibleCount = 0;

    for (const org of orgs) {
      console.log(`\n   Testing ${org.name}:`);
      console.log(`   URL: ${org.logo_url}`);

      try {
        const response = await fetch(org.logo_url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`   ✅ Accessible`);
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

    if (accessibleCount === orgs.length) {
      console.log(`\n🎉 All logos are now accessible!`);
    } else {
      console.log(`\n⚠️  Some logos are still not accessible.`);
    }
  } catch (error) {
    console.error('❌ Error testing fixed logos:', error.message);
  }
}

async function main() {
  try {
    const existingFiles = await getExistingFiles();
    const organizations = await getOrganizationsWithLogos();

    if (existingFiles.length === 0) {
      console.log(
        '❌ No files found in storage. Cannot fix orphaned references.'
      );
      return;
    }

    if (organizations.length === 0) {
      console.log('ℹ️  No organizations with logo URLs found.');
      return;
    }

    const { fixedCount, clearedCount } = await fixOrphanedLogos(
      organizations,
      existingFiles
    );

    if (fixedCount > 0 || clearedCount > 0) {
      await testFixedLogos();
    }

    console.log('\n✅ Orphaned logo fix completed!');
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

main().catch(console.error);

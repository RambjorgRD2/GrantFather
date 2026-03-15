#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  const envVars = {};

  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            let value = valueParts.join('=');
            // Remove quotes if present
            if (
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))
            ) {
              value = value.slice(1, -1);
            }
            envVars[key] = value;
          }
        }
      }
    }
  }

  return envVars;
}

async function debugApplicationIssue() {
  console.log('🔍 Debugging Application Issue...\n');

  const envVars = loadEnv();
  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseKey = envVars.CYPRESS_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all applications to see what's in the database
    console.log('📋 Fetching all applications...');
    const { data: allApps, error: allAppsError } = await supabase
      .from('grant_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allAppsError) {
      console.error('❌ Error fetching applications:', allAppsError.message);
      return;
    }

    console.log(`✅ Found ${allApps.length} applications:`);
    allApps.forEach((app, index) => {
      console.log(
        `  ${index + 1}. ${app.project_name} (${app.status}) - ID: ${app.id}`
      );
      console.log(`     User ID: ${app.user_id}`);
      console.log(`     Org ID: ${app.organization_id}`);
    });

    // Get all organizations
    console.log('\n🏢 Fetching all organizations...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(10);

    if (orgError) {
      console.error('❌ Error fetching organizations:', orgError.message);
      return;
    }

    console.log(`✅ Found ${orgs.length} organizations:`);
    orgs.forEach((org, index) => {
      console.log(`  ${index + 1}. ${org.name} - ID: ${org.id}`);
    });

    // Test individual application access with a specific user ID
    const testUserId = 'e09e89eb-4e64-4be0-8523-f748266cd340'; // From the logs we saw earlier
    console.log(`\n🧪 Testing access for user: ${testUserId}`);

    const { data: userApps, error: userAppsError } = await supabase
      .from('grant_applications')
      .select('*')
      .eq('user_id', testUserId);

    if (userAppsError) {
      console.error(
        '❌ Error fetching user applications:',
        userAppsError.message
      );
    } else {
      console.log(`✅ Found ${userApps.length} applications for user:`);
      userApps.forEach((app, index) => {
        console.log(
          `  ${index + 1}. ${app.project_name} (${app.status}) - ID: ${app.id}`
        );
        console.log(`     Org ID: ${app.organization_id}`);
      });

      // Test individual application query
      if (userApps.length > 0) {
        const testApp = userApps[0];
        console.log(
          `\n🔍 Testing individual application query for: ${testApp.project_name} (${testApp.id})`
        );

        const { data: singleApp, error: singleAppError } = await supabase
          .from('grant_applications')
          .select('*')
          .eq('id', testApp.id)
          .eq('user_id', testUserId)
          .maybeSingle();

        if (singleAppError) {
          console.error(
            '❌ Error fetching single application:',
            singleAppError.message
          );
        } else if (singleApp) {
          console.log('✅ Single application query successful');
          console.log(
            `   Organization: ${singleApp.organizations?.name || 'N/A'}`
          );
        } else {
          console.log('❌ Single application query returned null');
        }
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugApplicationIssue().catch(console.error);

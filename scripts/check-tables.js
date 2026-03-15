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

async function checkTables() {
  console.log('🔍 Checking database tables...\n');

  const envVars = loadEnv();
  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseKey = envVars.CYPRESS_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check user_roles table
    console.log('📋 Checking user_roles table...');
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(5);

    if (userRolesError) {
      console.log(`❌ user_roles table error: ${userRolesError.message}`);
    } else {
      console.log(`✅ user_roles table found: ${userRoles.length} records`);
      userRoles.forEach((role, index) => {
        console.log(
          `  ${index + 1}. User: ${role.user_id}, Org: ${
            role.organization_id
          }, Role: ${role.role}`
        );
      });
    }

    // Check user_organization_roles table
    console.log('\n📋 Checking user_organization_roles table...');
    const { data: userOrgRoles, error: userOrgRolesError } = await supabase
      .from('user_organization_roles')
      .select('*')
      .limit(5);

    if (userOrgRolesError) {
      console.log(
        `❌ user_organization_roles table error: ${userOrgRolesError.message}`
      );
    } else {
      console.log(
        `✅ user_organization_roles table found: ${userOrgRoles.length} records`
      );
      userOrgRoles.forEach((role, index) => {
        console.log(
          `  ${index + 1}. User: ${role.user_id}, Org: ${
            role.organization_id
          }, Role: ${role.role}`
        );
      });
    }

    // Check what tables exist
    console.log('\n📋 Checking all tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%role%');

    if (tablesError) {
      console.log(`❌ Error checking tables: ${tablesError.message}`);
    } else {
      console.log(`✅ Tables with 'role' in name:`);
      tables.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.table_name}`);
      });
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTables().catch(console.error);

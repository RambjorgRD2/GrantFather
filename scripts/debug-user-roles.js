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

async function debugUserRoles() {
  console.log('🔍 Debugging user roles...\n');

  const envVars = loadEnv();
  const supabaseUrl = envVars.VITE_SUPABASE_URL;
  const supabaseKey = envVars.CYPRESS_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const testUserId = 'e09e89eb-4e64-4be0-8523-f748266cd340';

    // Get user roles exactly as the hook does
    console.log('📋 Getting user roles...');
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', testUserId)
      .not('organization_id', 'is', null)
      .order('created_at', { ascending: false });

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError.message);
      return;
    }

    console.log(`✅ Found ${rolesData.length} roles with organization_id:`);
    rolesData.forEach((role, index) => {
      console.log(
        `  ${index + 1}. Org: ${role.organization_id}, Role: ${
          role.role
        }, Created: ${role.created_at}`
      );
    });

    if (rolesData.length === 0) {
      console.log('❌ No roles found! This is the problem.');

      // Check all roles for this user
      console.log(
        '\n📋 Checking ALL roles for this user (including null org_id)...'
      );
      const { data: allRoles, error: allRolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', testUserId)
        .order('created_at', { ascending: false });

      if (allRolesError) {
        console.error('❌ Error fetching all roles:', allRolesError.message);
      } else {
        console.log(`✅ Found ${allRoles.length} total roles:`);
        allRoles.forEach((role, index) => {
          console.log(
            `  ${index + 1}. Org: ${role.organization_id || 'NULL'}, Role: ${
              role.role
            }, Created: ${role.created_at}`
          );
        });
      }
      return;
    }

    // Get organization details
    const organizationIds = Array.from(
      new Set(rolesData.map((role) => role.organization_id))
    );

    console.log(
      `\n📋 Getting organization details for: ${organizationIds.join(', ')}`
    );
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', organizationIds);

    if (orgsError) {
      console.error('❌ Error fetching organizations:', orgsError.message);
      return;
    }

    console.log(`✅ Found ${orgsData.length} organizations:`);
    orgsData.forEach((org, index) => {
      console.log(`  ${index + 1}. ${org.name} (${org.id})`);
    });

    // Simulate the hook logic
    console.log('\n📋 Simulating hook logic...');
    const orgIdToLatestRole = new Map();
    for (const role of rolesData) {
      if (['admin', 'member', 'superadmin', 'owner'].includes(role.role)) {
        const existing = orgIdToLatestRole.get(role.organization_id);
        if (
          !existing ||
          new Date(role.created_at) > new Date(existing.created_at)
        ) {
          orgIdToLatestRole.set(role.organization_id, {
            id: role.id,
            user_id: role.user_id,
            organization_id: role.organization_id,
            role: role.role,
            created_at: role.created_at,
            updated_at: role.updated_at,
          });
        }
      }
    }

    console.log(
      `✅ Processed roles for ${orgIdToLatestRole.size} organizations:`
    );
    for (const [orgId, role] of orgIdToLatestRole) {
      console.log(`  - Org: ${orgId}, Role: ${role.role}`);
    }

    const organizationsWithRoles = organizationIds
      .map((orgId) => {
        const organization = orgsData?.find((org) => org.id === orgId);
        const role = orgIdToLatestRole.get(orgId);
        return organization && role
          ? {
              organization,
              userRole: role,
            }
          : undefined;
      })
      .filter((v) => Boolean(v && v.organization && v.userRole));

    console.log(
      `\n✅ Final result: ${organizationsWithRoles.length} organizations with roles`
    );
    organizationsWithRoles.forEach((org, index) => {
      console.log(
        `  ${index + 1}. ${org.organization.name} (${org.userRole.role})`
      );
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugUserRoles().catch(console.error);

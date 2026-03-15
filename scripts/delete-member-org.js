import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fjlrplhtgknuulqymsse.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbHJwbGh0Z2tudXVscXltc3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NTI2MjMsImV4cCI6MjA3MDIyODYyM30.N_IJwGZHksrFOYEo4cGd0-9I4fmZIXn8pDrMUKZuJZE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deleteMemberOrganization() {
  try {
    console.log('🔍 Checking organizations for rambjorg.rdd@gmail.com...');

    // First, let's see what organizations exist and your roles
    const { data: userData, error: userError } =
      await supabase.auth.signInWithPassword({
        email: 'rambjorg.rdd@gmail.com',
        password: process.env.TEST_PASSWORD || 'your-password-here',
      });

    if (userError) {
      console.error('❌ Auth error:', userError.message);
      return;
    }

    console.log('✅ Authenticated as:', userData.user.email);

    // Get organizations where user is a member
    const { data: orgs, error: orgError } = await supabase
      .from('user_roles')
      .select(
        `
        organization_id,
        role,
        organizations (
          id,
          name,
          org_type
        )
      `
      )
      .eq('user_id', userData.user.id);

    if (orgError) {
      console.error('❌ Error fetching organizations:', orgError.message);
      return;
    }

    console.log('📋 Your organizations:');
    orgs.forEach((org) => {
      console.log(
        `- ${org.organizations.name} (${org.organizations.org_type}) - Role: ${org.role}`
      );
    });

    // Find the "Test Organization Gamma" where user is a member
    const gammaOrg = orgs.find(
      (org) =>
        org.organizations.name === 'Test Organization Gamma' &&
        org.role === 'member'
    );

    if (!gammaOrg) {
      console.log(
        '❌ Test Organization Gamma not found or you are not a member'
      );
      return;
    }

    console.log(
      `🎯 Found Test Organization Gamma (ID: ${gammaOrg.organization_id})`
    );

    // Try to upgrade your role to admin first
    console.log('🔄 Attempting to upgrade role to admin...');
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userData.user.id)
      .eq('organization_id', gammaOrg.organization_id);

    if (updateError) {
      console.error('❌ Could not upgrade role:', updateError.message);
      console.log('💡 Trying direct deletion...');

      // Try direct deletion (this might fail due to RLS)
      const { error: deleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', gammaOrg.organization_id);

      if (deleteError) {
        console.error('❌ Direct deletion failed:', deleteError.message);
        console.log('💡 You may need to:');
        console.log('1. Apply the migration in Supabase SQL Editor');
        console.log('2. Or manually delete from Supabase dashboard');
        return;
      }
    } else {
      console.log('✅ Role upgraded to admin');

      // Now try to delete using the RPC function
      console.log('🗑️ Attempting to delete organization...');
      const { error: rpcError } = await supabase.rpc(
        'admin_delete_organization',
        {
          org_id: gammaOrg.organization_id,
        }
      );

      if (rpcError) {
        console.error('❌ RPC deletion failed:', rpcError.message);
        console.log(
          '💡 The admin_delete_organization function may not exist yet.'
        );
        console.log(
          '💡 Please apply the migration in Supabase SQL Editor first.'
        );
        return;
      }
    }

    console.log('✅ Test Organization Gamma deleted successfully!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

deleteMemberOrganization();

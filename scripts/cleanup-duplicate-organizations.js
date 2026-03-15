import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fjlrplhtgknuulqymsse.supabase.co';
const serviceRoleKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbHJwbGh0Z2tudXVscXltc3NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY1MjYyMywiZXhwIjoyMDcwMjI4NjIzfQ.9R0rITnLw9HARZtxVxeRa66U1QM8W3S3iHKgeUooL7U';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanupDuplicateOrganizations() {
  try {
    console.log('🔍 Finding duplicate organizations...');

    // Get all organizations with the name "ADHD Vestland"
    const { data: duplicateOrgs, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('name', 'ADHD Vestland')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    if (!duplicateOrgs || duplicateOrgs.length <= 1) {
      console.log('✅ No duplicate organizations found');
      return;
    }

    console.log(
      `Found ${duplicateOrgs.length} organizations named "ADHD Vestland"`
    );
    duplicateOrgs.forEach((org, index) => {
      console.log(
        `${index + 1}. ID: ${org.id}, Type: ${org.org_type}, Created: ${
          org.created_at
        }`
      );
    });

    // Keep the most recent one (last in the array since we sorted by created_at)
    const keepOrg = duplicateOrgs[duplicateOrgs.length - 1];
    const deleteOrgs = duplicateOrgs.slice(0, -1);

    console.log(
      `\n📌 Keeping organization: ${keepOrg.id} (${keepOrg.org_type}, created ${keepOrg.created_at})`
    );
    console.log(`🗑️  Deleting ${deleteOrgs.length} duplicate organizations...`);

    // Get all user roles for the organizations we're about to delete
    const deleteOrgIds = deleteOrgs.map((org) => org.id);
    const { data: rolesToUpdate, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .in('organization_id', deleteOrgIds);

    if (rolesError) {
      throw rolesError;
    }

    console.log(`Found ${rolesToUpdate?.length || 0} user roles to migrate`);

    // Update user roles to point to the kept organization
    if (rolesToUpdate && rolesToUpdate.length > 0) {
      for (const role of rolesToUpdate) {
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ organization_id: keepOrg.id })
          .eq('id', role.id);

        if (updateError) {
          console.error(`❌ Failed to update role ${role.id}:`, updateError);
        } else {
          console.log(
            `✅ Updated role ${role.id} to point to organization ${keepOrg.id}`
          );
        }
      }
    }

    // Delete the duplicate organizations
    for (const org of deleteOrgs) {
      const { error: deleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', org.id);

      if (deleteError) {
        console.error(
          `❌ Failed to delete organization ${org.id}:`,
          deleteError
        );
      } else {
        console.log(`✅ Deleted duplicate organization ${org.id}`);
      }
    }

    // Verify the cleanup
    const { data: remainingOrgs, error: verifyError } = await supabase
      .from('organizations')
      .select('*')
      .eq('name', 'ADHD Vestland');

    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError);
    } else {
      console.log(
        `\n✅ Cleanup complete! ${
          remainingOrgs?.length || 0
        } organizations named "ADHD Vestland" remain`
      );
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupDuplicateOrganizations();

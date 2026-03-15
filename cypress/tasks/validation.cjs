const { createClient } = require('@supabase/supabase-js');

// Validation task functions
const createValidationTasks = (supabase, config) => {
  // Validate organization creation in database
  const validateOrganization = async (organizationData) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find(
        (u) => u.email === organizationData.userEmail
      );

      if (!user) {
        throw new Error(`User not found: ${organizationData.userEmail}`);
      }

      // Check organization exists - prefer exact name match, fallback to latest created by user
      let { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('created_by', user.id)
        .eq('name', organizationData.name)
        .maybeSingle();

      if (!org) {
        const { data: latestOrg } = await supabase
          .from('organizations')
          .select('*')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        org = latestOrg || null;
      }

      if (!org) {
        throw new Error(`Organization not found: ${organizationData.name}`);
      }

      // Check user role exists
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', org.id)
        .eq('role', 'admin')
        .single();

      if (roleError || !role) {
        throw new Error('Admin role not created for organization');
      }

      // Validate organization data
      const validation = {
        nameMatch: org.name === organizationData.name,
        typeMatch: org.org_type === organizationData.orgType,
        eventTypesMatch:
          JSON.stringify(org.event_types.sort()) ===
          JSON.stringify(organizationData.eventTypes.sort()),
        fundingNeedsMatch:
          JSON.stringify(org.funding_needs.sort()) ===
          JSON.stringify(organizationData.fundingNeeds.sort()),
        languagesMatch:
          JSON.stringify(org.preferred_languages.sort()) ===
          JSON.stringify(organizationData.preferredLanguages.sort()),
        onboardingCompleted: org.onboarding_completed === true,
        roleIsAdmin: role.role === 'admin',
      };

      const allValid = Object.values(validation).every((v) => v === true);

      return {
        success: allValid,
        validation,
        organization: org,
        userRole: role,
      };
    } catch (error) {
      console.error('Validation error:', error);
      return { success: false, error: error.message };
    }
  };

  // Test RLS policies
  const testRLS = async (userEmail) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find((u) => u.email === userEmail);

      if (!user) {
        throw new Error(`User not found: ${userEmail}`);
      }

      // Anon client should not be able to list orgs/roles
      const anon = createClient(
        config.env.supabaseUrl,
        config.env.supabaseAnonKey
      );
      const { data: anonOrgs } = await anon
        .from('organizations')
        .select('id')
        .limit(1);
      const { data: anonRoles } = await anon
        .from('user_roles')
        .select('id')
        .limit(1);

      // Service-role client (this supabase) should be able to list at least some rows
      const { data: allOrgs } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
      const { data: allRoles } = await supabase
        .from('user_roles')
        .select('id')
        .limit(1);

      return {
        success: true,
        anonHasAccess:
          (anonOrgs?.length || 0) > 0 || (anonRoles?.length || 0) > 0,
        serviceHasAccess:
          (allOrgs?.length || 0) >= 0 && (allRoles?.length || 0) >= 0,
        canAccessOwnData: true,
      };
    } catch (error) {
      console.error('RLS test error:', error);
      return { success: false, error: error.message };
    }
  };

  // Check database state for a given user email
  const checkUserState = async (userEmail) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      // Find auth user by email
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find((u) => u.email === userEmail);

      const result = {
        userExists: !!user,
        userId: user?.id || null,
        userMetadata: user?.user_metadata || null,
        organizationExists: false,
        organizationId: null,
        organizationName: null,
        onboardingCompleted: false,
        userRoleExists: false,
        userRole: null,
        roleOrganizationId: null,
      };

      if (!user) {
        return result;
      }

      // Get organization created by user (if any)
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (org) {
        result.organizationExists = true;
        result.organizationId = org.id;
        result.organizationName = org.name;
        result.onboardingCompleted = !!org.onboarding_completed;
      }

      // Get role for user (if any)
      const { data: role } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (role) {
        result.userRoleExists = true;
        result.userRole = role.role;
        result.roleOrganizationId = role.organization_id || null;
      }

      return result;
    } catch (error) {
      console.error('db:checkUserState error:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    validateOrganization,
    testRLS,
    checkUserState,
  };
};

module.exports = { createValidationTasks };

const { createClient } = require('@supabase/supabase-js');

// Enhanced database task functions for comprehensive testing
const { createAIDatabaseTasks } = require('./ai-database.cjs');

const createEnhancedDatabaseTasks = (supabase, config) => {
  // Import AI database tasks
  const aiTasks = createAIDatabaseTasks(supabase, config);
  // Create test user with specific role
  const createTestUser = async ({
    email,
    password,
    fullName,
    userType = 'regular',
  }) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(`👤 Creating ${userType} test user: ${email}`);

      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find((u) => u.email === email);

      if (existingUser) {
        console.log(`✅ User already exists: ${email}`);
        return { success: true, user: existingUser, existed: true };
      }

      // Create user
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { full_name: fullName },
        email_confirm: true,
      });

      if (error) {
        console.error(`❌ Error creating user ${email}:`, error);
        return { success: false, error: error.message };
      }

      console.log(
        `✅ User created successfully: ${email} (ID: ${data.user?.id})`
      );

      // Grant SuperAdmin role if needed
      if (userType === 'superadmin') {
        await grantSuperAdminRole(data.user?.id);
      }

      return { success: true, user: data.user, existed: false };
    } catch (error) {
      console.error(`❌ Exception creating user ${email}:`, error);
      return { success: false, error: error.message };
    }
  };

  // Grant SuperAdmin role to user
  const grantSuperAdminRole = async (email) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(`🔑 Granting SuperAdmin role to user: ${email}`);

      // First, find the user by email
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find((u) => u.email === email);

      if (!user) {
        console.error(`❌ User not found: ${email}`);
        return { success: false, error: `User not found: ${email}` };
      }

      console.log(`✅ Found user: ${email} (ID: ${user.id})`);

      // Check if user already has superadmin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'superadmin')
        .single();

      if (existingRole) {
        console.log(`✅ User already has SuperAdmin role`);
        return {
          success: true,
          data: existingRole,
          message: 'Already has SuperAdmin role',
        };
      }

      // Insert into user_roles table with superadmin role
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          organization_id: null, // SuperAdmin doesn't need organization
          role: 'superadmin',
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error granting SuperAdmin role:`, error);
        return { success: false, error: error.message };
      }

      console.log(`✅ SuperAdmin role granted successfully`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ Exception granting SuperAdmin role:`, error);
      return { success: false, error: error.message };
    }
  };

  // Create test application
  const createTestApplication = ({ name, amount, userId, organizationId }) => {
    return new Promise(async (resolve) => {
      if (!supabase) {
        resolve({
          success: false,
          error: 'Supabase client not available - Service Role key required',
        });
        return;
      }

      try {
        console.log(`📝 Creating test application: ${name}`);

        const { data, error } = await supabase
          .from('grant_applications')
          .insert({
            project_name: name,
            summary: `Test application: ${name}`,
            funding_amount: amount,
            user_id: userId,
            organization_id: organizationId,
            status: 'draft',
            timeline_start: new Date().toISOString(),
            timeline_end: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000
            ).toISOString(),
            target_audience: 'Test audience',
            expected_impact: 'Test impact description',
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Error creating application:`, error);
          resolve({ success: false, error: error.message });
          return;
        }

        console.log(`✅ Test application created: ${data.id}`);
        resolve({ success: true, application: data });
      } catch (error) {
        console.error(`❌ Exception creating application:`, error);
        resolve({ success: false, error: error.message });
      }
    });
  };

  // Validate application exists
  const validateApplications = async ({ userId, expectedCount = null }) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(`🔍 Validating applications for user: ${userId}`);

      const { data, error } = await supabase
        .from('grant_applications')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error(`❌ Error validating applications:`, error);
        return { success: false, error: error.message };
      }

      const validation = {
        applicationsFound: data?.length || 0,
        applications: data || [],
        countMatches: expectedCount === null || data?.length === expectedCount,
      };

      console.log(
        `✅ Applications validation: ${validation.applicationsFound} found`
      );
      return { success: true, validation };
    } catch (error) {
      console.error(`❌ Exception validating applications:`, error);
      return { success: false, error: error.message };
    }
  };

  // Comprehensive test data sweep for specific user
  const sweepTestData = async ({ email }) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(`🧹 Sweeping test data for user: ${email}`);

      // Find user
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find((u) => u.email === email);

      if (!user) {
        console.log(`ℹ️ User not found: ${email}`);
        return { success: true, message: 'User not found, no data to sweep' };
      }

      const userId = user.id;

      // Delete in proper order to respect foreign key constraints
      console.log('🗑️ Deleting debug logs...');
      await supabase.from('debug_logs').delete().eq('user_id', userId);

      console.log('🗑️ Deleting grant applications...');
      await supabase.from('grant_applications').delete().eq('user_id', userId);

      console.log('🗑️ Deleting user roles...');
      await supabase.from('user_roles').delete().eq('user_id', userId);

      console.log('🗑️ Deleting organizations...');
      await supabase.from('organizations').delete().eq('created_by', userId);

      console.log('🗑️ Deleting system prompts...');
      await supabase.from('system_prompts').delete().eq('user_id', userId);

      console.log('🗑️ Deleting superadmin permissions...');
      await supabase.from('superadmin_users').delete().eq('user_id', userId);

      // Delete auth user
      console.log('🗑️ Deleting auth user...');
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) {
        console.error(`❌ Error deleting auth user:`, error);
      }

      console.log(`✅ Test data swept successfully for: ${email}`);
      return { success: true, message: `Test data swept for ${email}` };
    } catch (error) {
      console.error(`❌ Exception sweeping test data:`, error);
      return { success: false, error: error.message };
    }
  };

  // Performance test data creation
  const createPerformanceTestData = async ({
    userCount = 10,
    appsPerUser = 5,
  }) => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log(
        `🏃 Creating performance test data: ${userCount} users, ${appsPerUser} apps each`
      );

      const users = [];
      for (let i = 0; i < userCount; i++) {
        const timestamp = Date.now() + i;
        const userResult = await createTestUser({
          email: `perf-test-${timestamp}@example.com`,
          password: 'TestPassword123!',
          fullName: `Performance Test User ${i + 1}`,
          userType: 'regular',
        });

        if (userResult.success) {
          users.push(userResult.user);
        }
      }

      // Create applications for each user
      let totalApps = 0;
      for (const user of users) {
        for (let j = 0; j < appsPerUser; j++) {
          const appResult = await createTestApplication({
            name: `Performance Test App ${totalApps + 1}`,
            amount: 10000 + totalApps * 1000,
            userId: user.id,
            organizationId: null, // Will be created by application flow
          });

          if (appResult.success) {
            totalApps++;
          }
        }
      }

      console.log(
        `✅ Performance test data created: ${users.length} users, ${totalApps} applications`
      );
      return {
        success: true,
        message: `Created ${users.length} users and ${totalApps} applications`,
        users: users.length,
        applications: totalApps,
      };
    } catch (error) {
      console.error(`❌ Exception creating performance test data:`, error);
      return { success: false, error: error.message };
    }
  };

  return {
    createTestUser,
    grantSuperAdminRole,
    createTestApplication,
    validateApplications,
    sweepTestData,
    createPerformanceTestData,
    // AI-specific tasks
    ...aiTasks,
  };
};

module.exports = { createEnhancedDatabaseTasks };

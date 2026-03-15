const { createClient } = require('@supabase/supabase-js');

// Database task functions
const createDatabaseTasks = (supabase, config) => {
  // Helper tasks to ensure reuse between reset/seed/cleanup
  const seed = async () => {
    if (!supabase) {
      console.error(
        '❌ Supabase client not available - Service Role key required'
      );
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log('🌱 Starting database seeding...');

      // Test connection first
      console.log('🔍 Testing Supabase connection...');
      const { data: connectionTest, error: connectionError } =
        await supabase.auth.admin.listUsers();
      if (connectionError) {
        console.error('❌ Supabase connection failed:', connectionError);
        return {
          success: false,
          error: `Connection failed: ${connectionError.message}`,
        };
      }
      console.log('✅ Supabase connection successful');

      // Create test users if they don't exist
      const testUsers = [
        {
          email: 'test-cypress@example.com',
          password: 'TestPassword123!',
          userData: { full_name: 'Cypress Test User' },
        },
        {
          email: 'test-new-options@example.com',
          password: 'TestPassword123!',
          userData: { full_name: 'Test User New Options' },
        },
        {
          email: 'test-fresh-user@example.com',
          password: 'TestPassword123!',
          userData: { full_name: 'Fresh Test User' },
        },
      ];

      let successCount = 0;
      let errorCount = 0;

      for (const user of testUsers) {
        try {
          console.log(`👤 Creating user: ${user.email}`);
          const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            user_metadata: user.userData,
            email_confirm: true,
          });

          if (error) {
            if (error.message.includes('already been registered')) {
              console.log(`✅ User already exists: ${user.email}`);
              successCount++;
            } else {
              console.error(`❌ Error creating user ${user.email}:`, error);
              errorCount++;
            }
          } else {
            console.log(
              `✅ User created successfully: ${user.email} (ID: ${data.user?.id})`
            );
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Exception creating user ${user.email}:`, err);
          errorCount++;
        }
      }

      console.log(
        `📊 Seeding complete: ${successCount} successful, ${errorCount} errors`
      );

      // Create an organization for the first test user so they can access protected pages
      if (successCount > 0) {
        try {
          console.log(
            '🏢 Creating test organization for protected page access...'
          );

          // Get the first test user's ID
          const { data: firstUser } = await supabase.auth.admin.listUsers();
          const testUser = firstUser.users.find(
            (u) => u.email === 'test-cypress@example.com'
          );

          if (testUser) {
            // Create a test organization
            const { data: orgData, error: orgError } = await supabase
              .from('organizations')
              .insert({
                name: 'Test Organization',
                org_type: 'nonprofit',
                contact_name: 'Test Contact',
                contact_email: 'test-cypress@example.com',
                contact_phone: '+4712345678',
                members_count: 5,
                mission: 'Test mission statement for testing purposes',
                event_types: ['community', 'education'],
                funding_needs: ['operational', 'program'],
                preferred_languages: ['Norwegian', 'English'],
                onboarding_completed: true,
                created_by: testUser.id,
              })
              .select()
              .single();

            if (orgError) {
              console.log(
                '⚠️ Organization creation failed (may already exist):',
                orgError.message
              );
            } else {
              console.log('✅ Test organization created:', orgData.id);

              // Create user role for the test user
              const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .insert({
                  user_id: testUser.id,
                  organization_id: orgData.id,
                  role: 'admin',
                })
                .select()
                .single();

              if (roleError) {
                console.log(
                  '⚠️ User role creation failed (may already exist):',
                  roleError.message
                );
              } else {
                console.log('✅ Test user role created:', roleData.id);
              }
            }
          }
        } catch (orgErr) {
          console.log(
            '⚠️ Organization setup failed (continuing with user-only setup):',
            orgErr.message
          );
        }

        return {
          success: true,
          message: `Database seeded successfully: ${successCount} users ready with organization setup`,
        };
      } else {
        return {
          success: false,
          error: 'No users could be created or found',
        };
      }
    } catch (error) {
      console.error('❌ Seed error:', error);
      return { success: false, error: error.message };
    }
  };

  const cleanup = async () => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log('🧹 Cleaning up test data...');

      // Get test user IDs
      const testEmails = [
        'test-cypress@example.com',
        'test-new-options@example.com',
        'test-production-db@example.com',
        'test-fresh-user@example.com',
      ];
      const userIds = [];

      for (const email of testEmails) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find((u) => u.email === email);
        if (user) {
          userIds.push(user.id);
        }
      }

      if (userIds.length > 0) {
        console.log(`🔍 Found ${userIds.length} test users to clean up`);

        // Delete debug logs first
        const { error: logsError } = await supabase
          .from('debug_logs')
          .delete()
          .in('user_id', userIds);

        if (logsError) {
          console.error('❌ Error deleting test debug logs:', logsError);
        } else {
          console.log('✅ Debug logs deleted');
        }

        // Delete user roles (foreign key constraint)
        const { error: rolesError } = await supabase
          .from('user_roles')
          .delete()
          .in('user_id', userIds);

        if (rolesError) {
          console.error('❌ Error deleting test user roles:', rolesError);
        } else {
          console.log('✅ User roles deleted');
        }

        // Delete organizations created by test users
        const { error: orgsError } = await supabase
          .from('organizations')
          .delete()
          .in('created_by', userIds);

        if (orgsError) {
          console.error('❌ Error deleting test organizations:', orgsError);
        } else {
          console.log('✅ Organizations deleted');
        }

        // Delete grant applications
        const { error: appsError } = await supabase
          .from('grant_applications')
          .delete()
          .in('user_id', userIds);

        if (appsError) {
          console.error('❌ Error deleting test applications:', appsError);
        } else {
          console.log('✅ Grant applications deleted');
        }

        // Delete system prompts
        const { error: promptsError } = await supabase
          .from('system_prompts')
          .delete()
          .in('user_id', userIds);

        if (promptsError) {
          console.error('❌ Error deleting test prompts:', promptsError);
        } else {
          console.log('✅ System prompts deleted');
        }
      } else {
        console.log('ℹ️ No test users found to clean up');
      }

      console.log('🎉 Test data cleanup completed');
      return {
        success: true,
        message: 'Test data cleaned up successfully',
      };
    } catch (error) {
      console.error('❌ Cleanup error:', error);
      return { success: false, error: error.message };
    }
  };

  // Seed only users without creating organizations (for onboarding tests)
  const seedUsersOnly = async () => {
    if (!supabase) {
      console.error(
        '❌ Supabase client not available - Service Role key required'
      );
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log('🌱 Starting user-only database seeding...');

      // Test connection first
      console.log('🔍 Testing Supabase connection...');
      const { data: connectionTest, error: connectionError } =
        await supabase.auth.admin.listUsers();
      if (connectionError) {
        console.error('❌ Supabase connection failed:', connectionError);
        return {
          success: false,
          error: `Connection failed: ${connectionError.message}`,
        };
      }
      console.log('✅ Supabase connection successful');

      // Create test users if they don't exist
      const testUsers = [
        {
          email: 'test-cypress@example.com',
          password: 'TestPassword123!',
          userData: { full_name: 'Cypress Test User' },
        },
        {
          email: 'test-new-options@example.com',
          password: 'TestPassword123!',
          userData: { full_name: 'Test User New Options' },
        },
        {
          email: 'test-fresh-user@example.com',
          password: 'TestPassword123!',
          userData: { full_name: 'Fresh Test User' },
        },
      ];

      let successCount = 0;
      let errorCount = 0;

      for (const user of testUsers) {
        try {
          console.log(`👤 Creating user: ${user.email}`);
          const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            user_metadata: user.userData,
            email_confirm: true,
          });

          if (error) {
            if (error.message.includes('already been registered')) {
              console.log(`✅ User already exists: ${user.email}`);
              successCount++;
            } else {
              console.error(`❌ Error creating user ${user.email}:`, error);
              errorCount++;
            }
          } else {
            console.log(
              `✅ User created successfully: ${user.email} (ID: ${data.user?.id})`
            );
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Exception creating user ${user.email}:`, err);
          errorCount++;
        }
      }

      console.log(
        `📊 User-only seeding complete: ${successCount} successful, ${errorCount} errors`
      );

      return {
        success: successCount > 0,
        message: `User-only seeding completed: ${successCount} users ready for onboarding`,
        successCount,
        errorCount,
      };
    } catch (error) {
      console.error('❌ Exception during user-only seeding:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  return {
    seed,
    seedUsersOnly,
    cleanup,
  };
};

module.exports = { createDatabaseTasks };

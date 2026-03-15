const { createClient } = require('@supabase/supabase-js');

// Authentication task functions
const createAuthTasks = (supabase, config) => {
  // Comprehensive auth users cleanup
  const cleanAuthUsers = async () => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log('🧹 Starting comprehensive auth users cleanup...');

      // Get all test users from auth.users
      const testEmails = [
        'test-cypress@example.com',
        'test-new-options@example.com',
        'test-production-db@example.com',
        'test-fresh-user@example.com',
      ];

      const { data: users, error: listError } =
        await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('❌ Error listing users:', listError);
        return { success: false, error: listError.message };
      }

      const testUsers = users.users.filter((user) =>
        testEmails.includes(user.email || '')
      );

      console.log(
        `🔍 Found ${testUsers.length} test users in auth.users to clean`
      );

      if (testUsers.length > 0) {
        // Delete each test user from auth.users
        for (const user of testUsers) {
          try {
            console.log(`🗑️ Deleting auth user: ${user.email} (${user.id})`);
            const { error } = await supabase.auth.admin.deleteUser(user.id);
            if (error) {
              console.error(
                `❌ Error deleting auth user ${user.email}:`,
                error
              );
            } else {
              console.log(`✅ Auth user deleted: ${user.email}`);
            }
          } catch (err) {
            console.error(
              `❌ Exception deleting auth user ${user.email}:`,
              err
            );
          }
        }
      } else {
        console.log('ℹ️ No test users found in auth.users');
      }

      // Verify cleanup
      const { data: remainingUsers } = await supabase.auth.admin.listUsers();
      const remainingTestUsers = remainingUsers.users.filter((user) =>
        testEmails.includes(user.email || '')
      );

      console.log(
        `🔍 Verification: ${remainingTestUsers.length} test users remaining in auth.users`
      );

      console.log('🎉 Auth users cleanup completed');
      return {
        success: true,
        message: 'Auth users cleanup completed',
        usersDeleted: testUsers.length,
        remainingTestUsers: remainingTestUsers.length,
      };
    } catch (error) {
      console.error('❌ Auth users cleanup error:', error);
      return { success: false, error: error.message };
    }
  };

  // Force refresh authentication state
  const refreshAuth = async () => {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not available - Service Role key required',
      };
    }

    try {
      console.log('🔄 Refreshing authentication state...');

      // Get test user IDs
      const testEmails = [
        'test-cypress@example.com',
        'test-new-options@example.com',
        'test-production-db@example.com',
        'test-fresh-user@example.com',
      ];

      const { data: users } = await supabase.auth.admin.listUsers();
      const testUsers = users.users.filter((user) =>
        testEmails.includes(user.email || '')
      );

      console.log(`🔍 Found ${testUsers.length} test users to refresh`);

      // Force refresh each user's session
      for (const user of testUsers) {
        try {
          // Generate a new session for the user
          const { data, error } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: user.email || '',
          });

          if (error) {
            console.error(
              `❌ Error refreshing auth for ${user.email || 'unknown'}:`,
              error
            );
          } else {
            console.log(`✅ Auth refreshed for ${user.email || 'unknown'}`);
          }
        } catch (err) {
          console.error(
            `❌ Exception refreshing auth for ${user.email || 'unknown'}:`,
            err
          );
        }
      }

      console.log('🎉 Authentication state refresh completed');
      return { success: true, message: 'Authentication state refreshed' };
    } catch (error) {
      console.error('❌ Auth refresh error:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    cleanAuthUsers,
    refreshAuth,
  };
};

module.exports = { createAuthTasks };

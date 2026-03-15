-- Check if we already have some data created and just need to verify state
SELECT 'Organizations:' as info, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'User Roles:' as info, COUNT(*) as count FROM user_roles
UNION ALL  
SELECT 'Auth Users:' as info, COUNT(*) as count FROM auth.users WHERE deleted_at IS NULL;
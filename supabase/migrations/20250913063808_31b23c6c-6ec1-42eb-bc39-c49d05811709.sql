-- PHASE 1: EMERGENCY DATABASE CLEANUP
-- Clean slate: Remove all test data, keep only SuperAdmin with a clean organization

-- 1. Clean up all existing applications (test data)
DELETE FROM grant_applications WHERE user_id != (SELECT user_id FROM superadmin_users LIMIT 1);

-- 2. Clean up all user roles except SuperAdmin
DELETE FROM user_roles WHERE user_id != (SELECT user_id FROM superadmin_users LIMIT 1);

-- 3. Clean up all organizations except SuperAdmin's
DELETE FROM organizations WHERE created_by != (SELECT user_id FROM superadmin_users LIMIT 1);

-- 4. Clean up debug logs (keep last 100 for debugging)
DELETE FROM debug_logs WHERE id NOT IN (
  SELECT id FROM debug_logs ORDER BY created_at DESC LIMIT 100
);

-- 5. Ensure SuperAdmin has a proper organization
INSERT INTO organizations (
  id,
  name, 
  org_type, 
  contact_name, 
  contact_email, 
  created_by, 
  onboarding_completed,
  members_count
) 
SELECT 
  gen_random_uuid(),
  'SuperAdmin Organization',
  'nonprofit',
  'Super Admin',
  u.email,
  u.id,
  true,
  1
FROM auth.users u
JOIN superadmin_users su ON u.id = su.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.created_by = u.id
)
LIMIT 1;

-- 6. Ensure SuperAdmin has a user role
INSERT INTO user_roles (user_id, organization_id, role)
SELECT 
  su.user_id,
  o.id,
  'admin'
FROM superadmin_users su
JOIN organizations o ON o.created_by = su.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = su.user_id
);
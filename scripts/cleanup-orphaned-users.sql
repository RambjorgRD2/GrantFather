-- Database Cleanup Script for Orphaned Users
-- This script helps clean up users who exist in auth.users but have no associated organization data

-- First, let's see what we're dealing with
SELECT 
  'Current State' as status,
  COUNT(*) as count,
  'users in auth.users' as description
FROM auth.users
WHERE email_confirmed_at IS NOT NULL;

SELECT 
  'Current State' as status,
  COUNT(*) as count,
  'organizations in organizations table' as description
FROM organizations;

SELECT 
  'Current State' as status,
  COUNT(*) as count,
  'user_roles in user_roles table' as description
FROM user_roles;

-- Find orphaned users (users with no user_role entry)
SELECT 
  'Orphaned Users' as status,
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
  AND u.email_confirmed_at IS NOT NULL;

-- Option 1: DELETE orphaned users (DANGEROUS - only run if you're sure)
-- WARNING: This will permanently delete users and their data
-- Uncomment the lines below ONLY if you want to delete orphaned users

/*
DELETE FROM auth.users 
WHERE id IN (
  SELECT u.id
  FROM auth.users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  WHERE ur.user_id IS NULL
    AND u.email_confirmed_at IS NOT NULL
);
*/

-- Option 2: Create placeholder organizations for orphaned users (SAFER)
-- This creates a minimal organization for each orphaned user
-- Uncomment the lines below if you want to create placeholder organizations

/*
-- Insert placeholder organizations
INSERT INTO organizations (
  name,
  org_type,
  members_count,
  contact_name,
  contact_email,
  created_by,
  onboarding_completed
)
SELECT 
  'Organization for ' || u.email as name,
  'Other' as org_type,
  1 as members_count,
  COALESCE(u.raw_user_meta_data->>'full_name', 'User') as contact_name,
  u.email as contact_email,
  u.id as created_by,
  false as onboarding_completed
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
  AND u.email_confirmed_at IS NOT NULL;

-- Insert user roles for the newly created organizations
INSERT INTO user_roles (user_id, organization_id, role)
SELECT 
  u.id as user_id,
  o.id as organization_id,
  'admin' as role
FROM auth.users u
JOIN organizations o ON o.created_by = u.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
  AND u.email_confirmed_at IS NOT NULL;
*/

-- After cleanup, verify the state
SELECT 
  'After Cleanup' as status,
  COUNT(*) as count,
  'users in auth.users' as description
FROM auth.users
WHERE email_confirmed_at IS NOT NULL;

SELECT 
  'After Cleanup' as status,
  COUNT(*) as count,
  'organizations in organizations table' as description
FROM organizations;

SELECT 
  'After Cleanup' as status,
  COUNT(*) as count,
  'user_roles in user_roles table' as description
FROM user_roles;

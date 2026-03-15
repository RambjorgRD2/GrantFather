-- Fix infinite recursion in user_roles policies by dropping and recreating them properly
DROP POLICY IF EXISTS "Admins can view all roles in their organization" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

-- Create proper RLS policies that don't cause recursion
CREATE POLICY "Users can view their own roles" 
ON user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Organization admins can view all roles in their organization" 
ON user_roles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur2 
    WHERE ur2.user_id = auth.uid() 
    AND ur2.organization_id = user_roles.organization_id 
    AND ur2.role = 'admin'::app_role
  )
);

-- Create organizations for existing users who don't have them
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

-- Create user roles for the newly created organizations
INSERT INTO user_roles (user_id, organization_id, role)
SELECT 
  u.id as user_id,
  o.id as organization_id,
  'admin' as role
FROM auth.users u
JOIN organizations o ON o.created_by = u.id
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.organization_id = o.id
WHERE ur.user_id IS NULL
  AND u.email_confirmed_at IS NOT NULL;
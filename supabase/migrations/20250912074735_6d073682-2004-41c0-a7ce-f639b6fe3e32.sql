-- Phase 1: Pre-Cleanup Verification
-- Check current users in auth.users
DO $$
DECLARE
    user_count INTEGER;
    production_user_id UUID;
    production_org_id UUID;
BEGIN
    -- Get production user details
    SELECT id INTO production_user_id 
    FROM auth.users 
    WHERE email = 'rambjorg.rdd@gmail.com';
    
    IF production_user_id IS NULL THEN
        RAISE EXCEPTION 'Production user rambjorg.rdd@gmail.com not found!';
    END IF;
    
    -- Get production user's organization
    SELECT ur.organization_id INTO production_org_id
    FROM user_roles ur 
    WHERE ur.user_id = production_user_id
    LIMIT 1;
    
    RAISE NOTICE 'Production user ID: %', production_user_id;
    RAISE NOTICE 'Production organization ID: %', production_org_id;
    
    -- Count current users
    SELECT COUNT(*) INTO user_count FROM auth.users WHERE email_confirmed_at IS NOT NULL;
    RAISE NOTICE 'Current confirmed users count: %', user_count;
END $$;

-- Phase 2: Data Cleanup in Dependency Order
-- Step 1: Delete debug logs for test users (keep production user's logs)
DELETE FROM debug_logs 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'rambjorg.rdd@gmail.com'
  );

-- Step 2: Delete test notifications
DELETE FROM notifications 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'rambjorg.rdd@gmail.com'
  );

-- Step 3: Delete test knowledge usage tracking
DELETE FROM knowledge_usage_tracking 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'rambjorg.rdd@gmail.com'
  );

-- Step 4: Delete test model usage tracking
DELETE FROM model_usage_tracking 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'rambjorg.rdd@gmail.com'
  );

-- Step 5: Delete test knowledge base entries
DELETE FROM knowledge_base 
WHERE created_by IS NOT NULL 
  AND created_by NOT IN (
    SELECT id FROM auth.users WHERE email = 'rambjorg.rdd@gmail.com'
  );

-- Step 6: Delete test system prompts
DELETE FROM system_prompts 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'rambjorg.rdd@gmail.com'
  );

-- Step 7: Delete test user preferences
DELETE FROM user_preferences 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'rambjorg.rdd@gmail.com'
  );

-- Step 8: Delete test grant applications
DELETE FROM grant_applications 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'rambjorg.rdd@gmail.com'
  );

-- Step 9: Delete test organization invitations
DELETE FROM organization_invitations 
WHERE organization_id IS NOT NULL 
  AND organization_id NOT IN (
    SELECT ur.organization_id 
    FROM user_roles ur 
    JOIN auth.users u ON ur.user_id = u.id 
    WHERE u.email = 'rambjorg.rdd@gmail.com'
  );

-- Step 10: Delete test user roles (keep production user's roles)
DELETE FROM user_roles 
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE email = 'rambjorg.rdd@gmail.com'
  );

-- Step 11: Delete test organizations (keep production user's organization)
DELETE FROM organizations 
WHERE id IS NOT NULL 
  AND id NOT IN (
    SELECT ur.organization_id 
    FROM user_roles ur 
    JOIN auth.users u ON ur.user_id = u.id 
    WHERE u.email = 'rambjorg.rdd@gmail.com'
  );

-- Phase 3: SuperAdmin Elevation
-- Create superadmin_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.superadmin_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    UNIQUE(user_id)
);

-- Enable RLS on superadmin_users
ALTER TABLE public.superadmin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for superadmin_users
DROP POLICY IF EXISTS "SuperAdmins can manage superadmin users" ON public.superadmin_users;
CREATE POLICY "SuperAdmins can manage superadmin users" 
ON public.superadmin_users 
FOR ALL 
USING (
    user_id IN (SELECT user_id FROM public.superadmin_users)
    OR user_id = auth.uid()
);

-- Elevate rambjorg.rdd@gmail.com to SuperAdmin
INSERT INTO public.superadmin_users (user_id, created_by)
SELECT 
    u.id as user_id,
    u.id as created_by
FROM auth.users u 
WHERE u.email = 'rambjorg.rdd@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Phase 4: Final Verification
DO $$
DECLARE
    final_user_count INTEGER;
    final_org_count INTEGER;
    final_app_count INTEGER;
    superadmin_count INTEGER;
    production_user_id UUID;
BEGIN
    -- Get production user ID
    SELECT id INTO production_user_id 
    FROM auth.users 
    WHERE email = 'rambjorg.rdd@gmail.com';
    
    -- Count remaining data
    SELECT COUNT(*) INTO final_user_count FROM auth.users WHERE email_confirmed_at IS NOT NULL;
    SELECT COUNT(*) INTO final_org_count FROM organizations;
    SELECT COUNT(*) INTO final_app_count FROM grant_applications;
    SELECT COUNT(*) INTO superadmin_count FROM superadmin_users WHERE user_id = production_user_id;
    
    RAISE NOTICE '=== CLEANUP COMPLETE ===';
    RAISE NOTICE 'Remaining confirmed users: %', final_user_count;
    RAISE NOTICE 'Remaining organizations: %', final_org_count;
    RAISE NOTICE 'Remaining grant applications: %', final_app_count;
    RAISE NOTICE 'SuperAdmin status for rambjorg.rdd@gmail.com: %', CASE WHEN superadmin_count > 0 THEN 'GRANTED' ELSE 'FAILED' END;
    
    IF final_user_count != 1 THEN
        RAISE WARNING 'Expected 1 user, found %', final_user_count;
    END IF;
    
    IF final_org_count = 0 THEN
        RAISE WARNING 'No organizations found - production organization may have been deleted!';
    END IF;
END $$;
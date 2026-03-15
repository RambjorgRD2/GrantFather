-- Create test organizations for rambjorg.rdd@gmail.com to enable multi-organization UI testing
-- This is a development/testing migration

BEGIN;

-- Get the user ID for rambjorg.rdd@gmail.com
DO $$
DECLARE
    target_user_id UUID;
    org1_id UUID;
    org2_id UUID;
    org3_id UUID;
BEGIN
    -- Find the user ID
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'rambjorg.rdd@gmail.com';
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User rambjorg.rdd@gmail.com not found, skipping test organization creation';
        RETURN;
    END IF;
    
    -- Create test organizations
    INSERT INTO public.organizations (
        id, name, org_type, mission, contact_name, contact_email, 
        onboarding_completed, created_by, website, members_count
    ) VALUES 
    (
        gen_random_uuid(), 
        'Test Organization Alpha', 
        'nonprofit', 
        'Supporting local community development and education initiatives', 
        'Alpha Contact', 
        'alpha@testorg.com',
        TRUE,
        target_user_id,
        'https://alpha.testorg.com',
        5
    ),
    (
        gen_random_uuid(), 
        'Test Organization Beta', 
        'research', 
        'Advancing scientific research in environmental sustainability', 
        'Beta Contact', 
        'beta@testorg.com',
        TRUE,
        target_user_id,
        'https://beta.testorg.com',
        3
    ),
    (
        gen_random_uuid(), 
        'Test Organization Gamma', 
        'social_enterprise', 
        'Creating innovative solutions for social impact and community empowerment', 
        'Gamma Contact', 
        'gamma@testorg.com',
        TRUE,
        target_user_id,
        'https://gamma.testorg.com',
        8
    )
    RETURNING id INTO org1_id, org2_id, org3_id;
    
    -- Get the actual organization IDs that were created
    SELECT id INTO org1_id FROM public.organizations WHERE name = 'Test Organization Alpha' AND created_by = target_user_id;
    SELECT id INTO org2_id FROM public.organizations WHERE name = 'Test Organization Beta' AND created_by = target_user_id;
    SELECT id INTO org3_id FROM public.organizations WHERE name = 'Test Organization Gamma' AND created_by = target_user_id;
    
    -- Create user roles for these organizations
    INSERT INTO public.user_roles (user_id, organization_id, role) VALUES
    (target_user_id, org1_id, 'admin'),
    (target_user_id, org2_id, 'admin'), 
    (target_user_id, org3_id, 'member');
    
    RAISE NOTICE 'Successfully created 3 test organizations for user rambjorg.rdd@gmail.com';
    
END $$;

COMMIT;
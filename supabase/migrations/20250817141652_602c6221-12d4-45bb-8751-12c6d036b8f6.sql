-- First, add missing unique constraint for user_roles
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_org_role_unique 
UNIQUE (user_id, organization_id, role);

-- Create organizations for existing authenticated users who don't have them
DO $$
DECLARE
    user_record record;
    new_org_id uuid;
BEGIN
    -- For each authenticated user without an organization, create one
    FOR user_record IN 
        SELECT DISTINCT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN user_roles ur ON au.id = ur.user_id
        WHERE au.deleted_at IS NULL 
        AND ur.user_id IS NULL
    LOOP
        -- Create a default organization for this user
        INSERT INTO organizations (
            id,
            name,
            org_type,
            contact_name,
            contact_email,
            mission,
            event_types,
            funding_needs,
            preferred_languages,
            members_count,
            onboarding_completed,
            created_by
        ) VALUES (
            gen_random_uuid(),
            COALESCE(user_record.raw_user_meta_data->>'organization_name', user_record.email || '''s Organization'),
            'volunteer',
            COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email),
            user_record.email,
            'Default organization created for existing user',
            ARRAY[]::text[],
            ARRAY[]::text[],
            ARRAY[]::text[],
            1,
            false, -- Needs onboarding
            user_record.id
        ) RETURNING id INTO new_org_id;

        RAISE NOTICE 'Created organization % for user %', new_org_id, user_record.email;
    END LOOP;
END $$;
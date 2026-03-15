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
            contact_phone,
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
            NULL,
            'Default organization for ' || user_record.email,
            ARRAY[]::text[],
            ARRAY[]::text[],
            ARRAY[]::text[],
            1,
            false, -- Needs onboarding
            user_record.id
        ) RETURNING id INTO new_org_id;

        -- Create admin role for this user
        INSERT INTO user_roles (
            user_id,
            organization_id,
            role
        ) VALUES (
            user_record.id,
            new_org_id,
            'admin'::app_role
        );

        RAISE NOTICE 'Created organization % and admin role for user %', new_org_id, user_record.email;
    END LOOP;
END $$;
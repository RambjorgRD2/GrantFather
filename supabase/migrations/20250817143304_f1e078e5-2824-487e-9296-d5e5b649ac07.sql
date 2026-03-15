-- Temporarily disable triggers
ALTER TABLE organizations DISABLE TRIGGER ALL;

-- Create organizations for existing users
DO $$
DECLARE
    user_record record;
    new_org_id uuid;
BEGIN
    FOR user_record IN 
        SELECT id, email, raw_user_meta_data
        FROM auth.users 
        WHERE deleted_at IS NULL
    LOOP
        -- Generate new org ID
        new_org_id := gen_random_uuid();
        
        -- Insert organization
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
            new_org_id,
            COALESCE(user_record.raw_user_meta_data->>'organization_name', user_record.email || '''s Organization'),
            'volunteer',
            COALESCE(user_record.raw_user_meta_data->>'full_name', user_record.email),
            user_record.email,
            'Default organization created for existing user',
            ARRAY[]::text[],
            ARRAY[]::text[],
            ARRAY[]::text[],
            1,
            false,
            user_record.id
        );
        
        -- Insert user role
        INSERT INTO user_roles (user_id, organization_id, role)
        VALUES (user_record.id, new_org_id, 'admin'::app_role);
        
        RAISE NOTICE 'Created organization % and admin role for user %', new_org_id, user_record.email;
    END LOOP;
END $$;

-- Re-enable triggers
ALTER TABLE organizations ENABLE TRIGGER ALL;

-- Add 'superadmin' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';

-- Elevate the specified user to superadmin role
-- First, let's check if the user exists and update their role
DO $$
DECLARE
    target_user_id uuid;
    target_org_id uuid;
BEGIN
    -- Find the user by email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'rambjorg.rdd@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Get the user's organization
        SELECT organization_id INTO target_org_id 
        FROM public.user_roles 
        WHERE user_id = target_user_id 
        LIMIT 1;
        
        IF target_org_id IS NOT NULL THEN
            -- Update existing role to superadmin
            UPDATE public.user_roles 
            SET role = 'superadmin' 
            WHERE user_id = target_user_id 
            AND organization_id = target_org_id;
            
            -- If no existing role, insert new superadmin role
            IF NOT FOUND THEN
                INSERT INTO public.user_roles (user_id, organization_id, role) 
                VALUES (target_user_id, target_org_id, 'superadmin');
            END IF;
        END IF;
    END IF;
END $$;

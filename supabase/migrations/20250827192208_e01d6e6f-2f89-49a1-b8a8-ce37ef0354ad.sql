-- First add superadmin to the app_role enum
ALTER TYPE app_role ADD VALUE 'superadmin';

-- Then update user role to superadmin for the specific user
UPDATE user_roles 
SET role = 'superadmin'::app_role 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rambjorg.rdd@gmail.com');
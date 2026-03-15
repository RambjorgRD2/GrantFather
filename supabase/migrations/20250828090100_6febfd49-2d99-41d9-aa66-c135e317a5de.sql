-- Update the specific user to have superadmin role
UPDATE user_roles 
SET role = 'superadmin'::app_role 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'rambjorg.rdd@gmail.com'
) AND role = 'admin';
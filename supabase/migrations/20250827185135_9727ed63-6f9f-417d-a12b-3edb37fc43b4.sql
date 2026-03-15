-- Fix the user role for rambjorg.rdd@gmail.com to be superadmin
UPDATE user_roles 
SET role = 'superadmin'::app_role 
WHERE user_id = '36fd88c7-7ff5-4f83-993d-f8cd95b92c33';

-- Create a function to check if a user has superadmin role system-wide
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = 'superadmin'::app_role
  );
$$;

-- Create a function to get all system statistics for superadmin dashboard
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_users integer;
  total_organizations integer;
  total_applications integer;
  total_system_prompts integer;
  total_knowledge_base integer;
BEGIN
  -- Check if user is superadmin
  IF NOT public.is_superadmin(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Count users from auth.users
  SELECT COUNT(*) INTO total_users FROM auth.users;
  
  -- Count organizations
  SELECT COUNT(*) INTO total_organizations FROM organizations;
  
  -- Count grant applications
  SELECT COUNT(*) INTO total_applications FROM grant_applications;
  
  -- Count system prompts
  SELECT COUNT(*) INTO total_system_prompts FROM system_prompts;
  
  -- Count knowledge base entries
  SELECT COUNT(*) INTO total_knowledge_base FROM knowledge_base;

  RETURN jsonb_build_object(
    'users', total_users,
    'organizations', total_organizations,
    'applications', total_applications,
    'system_prompts', total_system_prompts,
    'knowledge_base', total_knowledge_base
  );
END;
$$;
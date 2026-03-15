-- Fix search path for the function
CREATE OR REPLACE FUNCTION public.get_user_role_in_org(_user_id UUID, _org_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id AND organization_id = _org_id;
$$;
-- Fix search path for security definer functions
ALTER FUNCTION public.create_organization_admin_role() SET search_path = public;
ALTER FUNCTION public.accept_organization_invitation(text) SET search_path = public;
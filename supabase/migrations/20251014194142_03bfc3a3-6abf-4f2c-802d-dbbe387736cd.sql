
-- Fix get_user_organizations to exclude NULL organization_ids
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE(organization_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ur.organization_id 
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.organization_id IS NOT NULL;  -- Filter out NULL orgs
$function$;

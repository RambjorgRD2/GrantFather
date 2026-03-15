-- Fix function search path security warnings
-- Update functions to have secure search_path settings

-- Fix prevent_duplicate_user_roles function
CREATE OR REPLACE FUNCTION public.prevent_duplicate_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user already has a role in this organization
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = NEW.user_id 
    AND organization_id = NEW.organization_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'User already has a role in this organization';
  END IF;
  
  RETURN NEW;
END;
$function$;
-- Fix debug_logs table to allow system-level logs
-- Make user_id nullable for system logs
ALTER TABLE public.debug_logs ALTER COLUMN user_id DROP NOT NULL;

-- Update the cleanup function to use NULL instead of 'system'
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_user_roles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete duplicate user roles, keeping the most recent one
  WITH ranked_roles AS (
    SELECT id, user_id, organization_id,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM public.user_roles
  ),
  duplicate_roles AS (
    SELECT id FROM ranked_roles WHERE rn > 1
  )
  DELETE FROM public.user_roles 
  WHERE id IN (SELECT id FROM duplicate_roles);
  
  -- Log the cleanup action with NULL user_id for system actions
  INSERT INTO public.debug_logs (
    user_id,
    level,
    source,
    message,
    data
  ) VALUES (
    NULL,  -- Use NULL instead of 'system'
    'info',
    'data_integrity',
    'Cleaned up duplicate user roles',
    jsonb_build_object('timestamp', now())
  );
END;
$function$;
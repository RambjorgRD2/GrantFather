-- Phase 1: Database Integrity Restoration

-- Step 1: Clean up duplicate user roles (keep the most recent one per user)
WITH ranked_roles AS (
  SELECT id, user_id, organization_id, role, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM public.user_roles
),
duplicate_roles AS (
  SELECT id FROM ranked_roles WHERE rn > 1
)
DELETE FROM public.user_roles 
WHERE id IN (SELECT id FROM duplicate_roles);

-- Step 2: Clean up orphaned organizations (organizations without valid user roles)
DELETE FROM public.organizations 
WHERE id NOT IN (
  SELECT DISTINCT organization_id 
  FROM public.user_roles 
  WHERE organization_id IS NOT NULL
);

-- Step 3: Add unique constraint to prevent duplicate user roles
ALTER TABLE public.user_roles 
ADD CONSTRAINT unique_user_per_organization 
UNIQUE (user_id, organization_id);

-- Step 4: Add data integrity function to detect and clean duplicates
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_user_roles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  
  -- Log the cleanup action
  INSERT INTO public.debug_logs (
    user_id,
    level,
    source,
    message,
    data
  ) VALUES (
    'system'::uuid,
    'info',
    'data_integrity',
    'Cleaned up duplicate user roles',
    jsonb_build_object('timestamp', now())
  );
END;
$$;

-- Step 5: Add function to validate user role uniqueness before insert
CREATE OR REPLACE FUNCTION public.validate_user_role_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user already has a role in this organization
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.user_id 
    AND organization_id = NEW.organization_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'User already has a role in this organization'
      USING ERRCODE = '23505',
            DETAIL = format('User %s already has a role in organization %s', NEW.user_id, NEW.organization_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 6: Create trigger to enforce uniqueness
CREATE TRIGGER enforce_user_role_uniqueness
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_role_uniqueness();

-- Step 7: Add enhanced organization validation function
CREATE OR REPLACE FUNCTION public.ensure_organization_integrity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update organizations to mark onboarding as completed if they have valid data
  UPDATE public.organizations 
  SET onboarding_completed = true
  WHERE onboarding_completed = false
    AND name IS NOT NULL 
    AND name != ''
    AND contact_email IS NOT NULL 
    AND contact_email != ''
    AND id IN (
      SELECT DISTINCT organization_id 
      FROM public.user_roles 
      WHERE organization_id IS NOT NULL
    );
END;
$$;
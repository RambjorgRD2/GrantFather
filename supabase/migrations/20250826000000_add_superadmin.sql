-- Add 'superadmin' role and elevate target user

-- 1) Extend enum to include 'superadmin'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'superadmin'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'superadmin';
  END IF;
END $$;

-- 2) Create helper function to check if current user is superadmin
CREATE OR REPLACE FUNCTION public.current_user_is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'superadmin'::public.app_role
  );
$$;

-- 3) Add permissive policies for superadmin on user_roles table
--    These are additive and do not remove existing admin/member rules
DO $$
BEGIN
  -- SELECT for superadmin across all organizations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Superadmin can select all user_roles'
  ) THEN
    CREATE POLICY "Superadmin can select all user_roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (public.current_user_is_superadmin());
  END IF;

  -- INSERT by superadmin for any organization
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Superadmin can insert any user_roles'
  ) THEN
    CREATE POLICY "Superadmin can insert any user_roles"
    ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_is_superadmin());
  END IF;

  -- UPDATE by superadmin for any organization
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Superadmin can update any user_roles'
  ) THEN
    CREATE POLICY "Superadmin can update any user_roles"
    ON public.user_roles
    FOR UPDATE
    TO authenticated
    USING (public.current_user_is_superadmin())
    WITH CHECK (public.current_user_is_superadmin());
  END IF;

  -- DELETE by superadmin for any organization
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Superadmin can delete any user_roles'
  ) THEN
    CREATE POLICY "Superadmin can delete any user_roles"
    ON public.user_roles
    FOR DELETE
    TO authenticated
    USING (public.current_user_is_superadmin());
  END IF;
END $$;

-- 4) Elevate the specified user to superadmin for all of their existing roles
--    Provided user id: 36fd88c7-7ff5-4f83-993d-d8cd95b92c33
UPDATE public.user_roles
SET role = 'superadmin'::public.app_role
WHERE user_id = '36fd88c7-7ff5-4f83-993d-d8cd95b92c33'::uuid;

-- 5) If the user has no roles yet, promote their primary organization role if available
--    (This is a safety net; it inserts a superadmin role for any org where they are admin/member)
INSERT INTO public.user_roles (user_id, organization_id, role)
SELECT ur.user_id, ur.organization_id, 'superadmin'::public.app_role
FROM public.user_roles ur
LEFT JOIN public.user_roles existing
  ON existing.user_id = ur.user_id
 AND existing.organization_id = ur.organization_id
 AND existing.role = 'superadmin'::public.app_role
WHERE ur.user_id = '36fd88c7-7ff5-4f83-993d-d8cd95b92c33'::uuid
  AND existing.user_id IS NULL;

-- 6) Optional: expose a view to quickly check superadmins
CREATE OR REPLACE VIEW public.superadmins AS
SELECT ur.user_id, u.email, ur.organization_id
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'superadmin'::public.app_role;



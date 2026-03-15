-- =====================================================
-- PHASE 2 & 3: Security Hardening + Database Optimization (Corrected)
-- =====================================================

-- Phase 2: Fix RLS Policy for landing_page_assets
-- Current policy allows public access, should require authentication for viewing
DROP POLICY IF EXISTS "SuperAdmins can manage landing assets" ON public.landing_page_assets;

-- Allow authenticated users to view landing assets
CREATE POLICY "Authenticated users can view landing assets"
ON public.landing_page_assets FOR SELECT
TO authenticated
USING (true);

-- Only superadmins can insert, update, delete landing assets
CREATE POLICY "SuperAdmins can insert landing assets"
ON public.landing_page_assets FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.superadmin_users
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "SuperAdmins can update landing assets"
ON public.landing_page_assets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.superadmin_users
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "SuperAdmins can delete landing assets"
ON public.landing_page_assets FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.superadmin_users
    WHERE user_id = auth.uid()
  )
);

-- Phase 3: Remove Duplicate Constraints on user_roles
-- Drop duplicate constraints (keep unique_user_organization)
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS unique_user_per_organization;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_organization_id_key;

-- Verify remaining constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.user_roles'::regclass
ORDER BY conname;
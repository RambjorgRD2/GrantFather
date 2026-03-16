-- Fix organizations where onboarding_completed=false but the org has valid data.
-- This handles orgs created before the flag was enforced, or created via
-- direct DB insert (e.g. test data) without explicitly setting the flag.
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

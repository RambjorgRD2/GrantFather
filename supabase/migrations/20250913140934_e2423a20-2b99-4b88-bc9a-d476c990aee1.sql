-- Phase 4: System Hardening - Final performance and security optimizations
-- Add additional indexes for frequently queried tables

-- Index for user_roles lookups (used by RLS policies)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_org_id ON public.user_roles(user_id, organization_id);

-- Index for debug_logs for system monitoring
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON public.debug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_level ON public.debug_logs(level);

-- Index for notifications for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_archived = false;

-- Index for organization lookups
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);

-- Add constraint to ensure organization integrity
ALTER TABLE public.organizations ADD CONSTRAINT check_organization_data 
CHECK (
  (onboarding_completed = false) OR 
  (onboarding_completed = true AND name IS NOT NULL AND contact_email IS NOT NULL)
);

-- Performance optimization: Update statistics
ANALYZE public.user_roles;
ANALYZE public.organizations;
ANALYZE public.debug_logs;
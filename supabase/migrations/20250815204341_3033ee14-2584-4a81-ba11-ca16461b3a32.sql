-- Clear database for fresh login process
-- Delete in correct order to respect foreign key constraints

-- Delete grant applications first (references organizations)
DELETE FROM public.grant_applications;

-- Delete organization invitations (references organizations)
DELETE FROM public.organization_invitations;

-- Delete user roles (references organizations)
DELETE FROM public.user_roles;

-- Delete system prompts (user-specific data)
DELETE FROM public.system_prompts;

-- Delete organizations last
DELETE FROM public.organizations;

-- Reset any sequences if needed
-- This ensures clean state for testing the complete customer journey
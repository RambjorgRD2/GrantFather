-- Add missing array columns to organizations table for onboarding compatibility
ALTER TABLE public.organizations 
ADD COLUMN event_types TEXT[] DEFAULT '{}',
ADD COLUMN funding_needs TEXT[] DEFAULT '{}', 
ADD COLUMN preferred_languages TEXT[] DEFAULT '{en}';

-- Update existing organizations to have default preferred language
UPDATE public.organizations 
SET preferred_languages = '{en}' 
WHERE preferred_languages IS NULL OR preferred_languages = '{}';
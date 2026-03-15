-- Migration: Fix system_prompts model names from display names to API IDs
-- This migration converts any display names stored in system_prompts to their correct API model IDs

-- Update OpenAI model names
UPDATE public.system_prompts 
SET ai_model = 'gpt-5-2025-08-07'
WHERE ai_model IN ('GPT-5', 'GPT5', 'gpt-5');

UPDATE public.system_prompts 
SET ai_model = 'gpt-5-mini-2025-08-07'
WHERE ai_model IN ('GPT-5 Mini', 'GPT5 Mini', 'gpt-5-mini');

UPDATE public.system_prompts 
SET ai_model = 'gpt-5-nano-2025-08-07'
WHERE ai_model IN ('GPT-5 Nano', 'GPT5 Nano', 'gpt-5-nano');

UPDATE public.system_prompts 
SET ai_model = 'gpt-4o'
WHERE ai_model IN ('GPT-4o', 'GPT4o');

UPDATE public.system_prompts 
SET ai_model = 'gpt-4o-mini'
WHERE ai_model IN ('GPT-4o Mini', 'GPT4o Mini');

-- Update Anthropic model names to valid API IDs
UPDATE public.system_prompts 
SET ai_model = 'claude-opus-4-1-20250805'
WHERE ai_model IN ('Opus 4', 'Claude Opus 4', 'claude-opus-4');

UPDATE public.system_prompts 
SET ai_model = 'claude-sonnet-4-5'
WHERE ai_model IN ('Sonnet 4', 'Claude Sonnet 4', 'claude-sonnet-4');

UPDATE public.system_prompts 
SET ai_model = 'claude-3-5-haiku-20241022'
WHERE ai_model IN ('Haiku 3.5', 'Claude Haiku 3.5', 'claude-haiku-3.5');

-- Fix invalid Anthropic models from sectionConfigService 
UPDATE public.system_prompts 
SET ai_model = 'gpt-5-2025-08-07', ai_provider = 'openai'
WHERE ai_model = 'claude-3-haiku-20240307' AND ai_provider = 'anthropic';

-- Update Google Gemini model names
UPDATE public.system_prompts 
SET ai_model = 'gemini-2.5-pro'
WHERE ai_model IN ('Gemini 2.0 Flash', 'Gemini 2.5 Pro', 'gemini-2-flash');

UPDATE public.system_prompts 
SET ai_model = 'gemini-2.5-flash'
WHERE ai_model IN ('Gemini 1.5 Pro', 'Gemini 2.5 Flash');

UPDATE public.system_prompts 
SET ai_model = 'gemini-1.5-flash'
WHERE ai_model IN ('Gemini 1.5 Flash', 'Gemini Pro');

-- Update Perplexity model names
UPDATE public.system_prompts 
SET ai_model = 'llama-3.1-sonar-huge-128k-online'
WHERE ai_model IN ('Sonar Huge Online', 'sonar-huge');

UPDATE public.system_prompts 
SET ai_model = 'llama-3.1-sonar-large-128k-online'
WHERE ai_model IN ('Sonar Large Online', 'sonar-large');

UPDATE public.system_prompts 
SET ai_model = 'llama-3.1-sonar-small-128k-online'
WHERE ai_model IN ('Sonar Small Online', 'sonar-small');

-- Update Grok model names
UPDATE public.system_prompts 
SET ai_model = 'grok-2-latest'
WHERE ai_model IN ('Grok 2', 'grok-2');

UPDATE public.system_prompts 
SET ai_model = 'grok-2-vision-latest'
WHERE ai_model IN ('Grok 2 Vision', 'grok-2-vision');

-- Add logging for debugging
INSERT INTO public.debug_logs (user_id, level, source, message, data)
VALUES (
  NULL,
  'info',
  'migration',
  'Updated system_prompts model names from display names to API IDs',
  jsonb_build_object(
    'timestamp', now(),
    'migration', 'fix_system_prompts_model_names'
  )
);
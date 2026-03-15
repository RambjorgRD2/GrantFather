-- Fix invalid model names in system_prompts table
UPDATE system_prompts 
SET ai_model = 'gpt-5-2025-08-07' 
WHERE ai_model = 'GPT-5' OR ai_model = 'gpt-5';

-- Normalize all OpenAI model names to lowercase with correct format
UPDATE system_prompts 
SET ai_model = CASE 
  WHEN ai_model ILIKE 'gpt-5%' AND ai_model != 'gpt-5-2025-08-07' THEN 'gpt-5-2025-08-07'
  WHEN ai_model ILIKE 'gpt-4o-mini%' THEN 'gpt-4o-mini'
  WHEN ai_model ILIKE 'gpt-4o%' AND ai_model != 'gpt-4o-mini' THEN 'gpt-4o'
  ELSE LOWER(ai_model)
END
WHERE ai_provider = 'openai' OR ai_provider IS NULL;

-- Add a check constraint to prevent invalid model names in the future
ALTER TABLE system_prompts
DROP CONSTRAINT IF EXISTS valid_openai_model;

ALTER TABLE system_prompts
ADD CONSTRAINT valid_openai_model
CHECK (
  ai_provider != 'openai' OR
  ai_model IN (
    'gpt-5-2025-08-07',
    'gpt-5-mini-2025-08-07',
    'gpt-5-nano-2025-08-07',
    'gpt-4.1-2025-04-14',
    'gpt-4.1-mini-2025-04-14',
    'gpt-4o-mini',
    'gpt-4o',
    'o3-2025-04-16',
    'o4-mini-2025-04-16'
  )
);
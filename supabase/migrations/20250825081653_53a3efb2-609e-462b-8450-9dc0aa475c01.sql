-- Add AI provider and model columns to system_prompts table
ALTER TABLE system_prompts 
ADD COLUMN ai_provider TEXT DEFAULT 'openai',
ADD COLUMN ai_model TEXT DEFAULT 'gpt-4o-mini';
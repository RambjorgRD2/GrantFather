-- Create model usage tracking table
CREATE TABLE IF NOT EXISTS model_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  deprecated_at TIMESTAMP WITH TIME ZONE,
  deprecation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique provider-model combinations
  UNIQUE(provider, model)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_model_usage_tracking_provider ON model_usage_tracking(provider);
CREATE INDEX IF NOT EXISTS idx_model_usage_tracking_model ON model_usage_tracking(model);
CREATE INDEX IF NOT EXISTS idx_model_usage_tracking_active ON model_usage_tracking(is_active);
CREATE INDEX IF NOT EXISTS idx_model_usage_tracking_usage_count ON model_usage_tracking(usage_count);
CREATE INDEX IF NOT EXISTS idx_model_usage_tracking_last_used ON model_usage_tracking(last_used);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_model_usage_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_model_usage_tracking_updated_at
  BEFORE UPDATE ON model_usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_model_usage_tracking_updated_at();

-- Create function to get model usage statistics
CREATE OR REPLACE FUNCTION get_model_usage_stats()
RETURNS TABLE (
  provider TEXT,
  total_models INTEGER,
  active_models INTEGER,
  deprecated_models INTEGER,
  most_used_model TEXT,
  total_usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mut.provider,
    COUNT(*)::INTEGER as total_models,
    COUNT(*) FILTER (WHERE mut.is_active = true)::INTEGER as active_models,
    COUNT(*) FILTER (WHERE mut.is_active = false)::INTEGER as deprecated_models,
    (SELECT model FROM model_usage_tracking 
     WHERE provider = mut.provider 
     ORDER BY usage_count DESC, last_used DESC 
     LIMIT 1) as most_used_model,
    COALESCE(SUM(mut.usage_count), 0)::BIGINT as total_usage_count
  FROM model_usage_tracking mut
  GROUP BY mut.provider
  ORDER BY total_usage_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get models that are safe to remove
CREATE OR REPLACE FUNCTION get_safe_to_remove_models()
RETURNS TABLE (
  provider TEXT,
  model TEXT,
  usage_count INTEGER,
  last_used TIMESTAMP WITH TIME ZONE,
  days_since_last_use INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mut.provider,
    mut.model,
    mut.usage_count,
    mut.last_used,
    CASE 
      WHEN mut.last_used IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM NOW() - mut.last_used)::INTEGER
    END as days_since_last_use
  FROM model_usage_tracking mut
  WHERE mut.is_active = false 
    AND mut.usage_count = 0
    AND (mut.last_used IS NULL OR mut.last_used < NOW() - INTERVAL '30 days')
  ORDER BY mut.last_used ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON model_usage_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION get_model_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_safe_to_remove_models() TO authenticated;

-- Insert initial tracking data for current models
INSERT INTO model_usage_tracking (provider, model, usage_count, is_active)
VALUES 
  -- OpenAI models
  ('openai', 'gpt-5-2025-08-07', 0, true),
  ('openai', 'gpt-5-mini-2025-08-07', 0, true),
  ('openai', 'gpt-5-nano-2025-08-07', 0, true),
  ('openai', 'gpt-4.1-2025-04-14', 0, true),
  ('openai', 'o3-2025-04-16', 0, true),
  ('openai', 'o4-mini-2025-04-16', 0, true),
  ('openai', 'gpt-4o', 0, true),
  ('openai', 'gpt-4o-mini', 0, true),
  ('openai', 'gpt-4-turbo', 0, true),
  
  -- Anthropic models
  ('anthropic', 'claude-opus-4-20250514', 0, true),
  ('anthropic', 'claude-sonnet-4-20250514', 0, true),
  ('anthropic', 'claude-3-5-haiku-20241022', 0, true),
  ('anthropic', 'claude-3-5-sonnet-20241022', 0, true),
  ('anthropic', 'claude-3-opus-20240229', 0, true),
  ('anthropic', 'claude-3-haiku-20240307', 0, true),
  
  -- Google models
  ('google', 'gemini-2.0-flash-exp', 0, true),
  ('google', 'gemini-1.5-pro-latest', 0, true),
  ('google', 'gemini-1.5-flash-latest', 0, true),
  ('google', 'gemini-pro', 0, true),
  ('google', 'gemini-pro-vision', 0, true),
  
  -- Perplexity models
  ('perplexity', 'llama-3.1-sonar-huge-128k-online', 0, true),
  ('perplexity', 'llama-3.1-sonar-large-128k-online', 0, true),
  ('perplexity', 'llama-3.1-sonar-small-128k-online', 0, true),
  ('perplexity', 'llama-3.1-sonar-large-128k-chat', 0, true),
  ('perplexity', 'llama-3.1-sonar-small-128k-chat', 0, true),
  
  -- Grok models
  ('grok', 'grok-2-1212', 0, true),
  ('grok', 'grok-2-vision-1212', 0, true),
  ('grok', 'grok-beta', 0, true),
  ('grok', 'grok-vision-beta', 0, true)
ON CONFLICT (provider, model) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE model_usage_tracking IS 'Tracks usage of AI models to ensure safe updates without removing models currently in use';
COMMENT ON FUNCTION get_model_usage_stats() IS 'Returns usage statistics for all AI models across providers';
COMMENT ON FUNCTION get_safe_to_remove_models() IS 'Returns models that are safe to remove (deprecated and unused for 30+ days)';

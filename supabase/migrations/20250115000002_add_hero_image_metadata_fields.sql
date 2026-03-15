-- Migration: Add metadata fields to landing_page_assets table
-- This migration adds title, file_size, and mime_type columns to support hero image metadata

-- Add the missing columns with appropriate data types
ALTER TABLE landing_page_assets 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Add comments for documentation
COMMENT ON COLUMN landing_page_assets.title IS 'Title of the hero image for display purposes';
COMMENT ON COLUMN landing_page_assets.file_size IS 'File size in bytes';
COMMENT ON COLUMN landing_page_assets.mime_type IS 'MIME type of the image file (e.g., image/png, image/jpeg)';

-- Update existing records with default values where possible
-- For existing hero images, we can't determine the original file size or MIME type
-- but we can set reasonable defaults

UPDATE landing_page_assets 
SET 
  title = CASE 
    WHEN title IS NULL AND asset_type = 'hero_image' THEN 'Hero Image'
    ELSE title
  END,
  file_size = CASE 
    WHEN file_size IS NULL AND asset_type = 'hero_image' THEN 0
    ELSE file_size
  END,
  mime_type = CASE 
    WHEN mime_type IS NULL AND asset_type = 'hero_image' THEN 'image/unknown'
    ELSE mime_type
  END
WHERE asset_type = 'hero_image';

-- Add indexes for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_landing_page_assets_file_size ON landing_page_assets(file_size);
CREATE INDEX IF NOT EXISTS idx_landing_page_assets_mime_type ON landing_page_assets(mime_type);

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'landing_page_assets' 
ORDER BY ordinal_position;

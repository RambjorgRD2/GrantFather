-- =====================================================
-- HERO IMAGE METADATA FIELDS MIGRATION SCRIPT
-- =====================================================
-- This script adds missing metadata fields to the landing_page_assets table
-- Run this in the Supabase SQL Editor to add title, file_size, and mime_type columns

-- Step 1: Add the missing columns
ALTER TABLE landing_page_assets 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Step 2: Add column documentation
COMMENT ON COLUMN landing_page_assets.title IS 'Title of the hero image for display purposes';
COMMENT ON COLUMN landing_page_assets.file_size IS 'File size in bytes';
COMMENT ON COLUMN landing_page_assets.mime_type IS 'MIME type of the image file (e.g., image/png, image/jpeg)';

-- Step 3: Update existing records with sensible defaults
-- This preserves existing data while providing default values for new fields
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

-- Step 4: Add indexes for better performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_landing_page_assets_file_size ON landing_page_assets(file_size);
CREATE INDEX IF NOT EXISTS idx_landing_page_assets_mime_type ON landing_page_assets(mime_type);

-- Step 5: Verify the changes
SELECT 
  'Schema updated successfully!' as status,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'landing_page_assets' 
  AND column_name IN ('title', 'file_size', 'mime_type')
ORDER BY column_name;

-- Step 6: Show current hero image records
SELECT 
  'Current hero image records:' as info,
  id,
  asset_type,
  title,
  file_size,
  mime_type,
  alt_text,
  is_active,
  created_at
FROM landing_page_assets 
WHERE asset_type = 'hero_image'
ORDER BY created_at DESC;

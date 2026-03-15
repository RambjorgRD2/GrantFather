-- Add metadata columns to landing_page_assets table
ALTER TABLE landing_page_assets 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Add comments for documentation
COMMENT ON COLUMN landing_page_assets.title IS 'Title of the hero image for display purposes';
COMMENT ON COLUMN landing_page_assets.file_size IS 'File size in bytes';
COMMENT ON COLUMN landing_page_assets.mime_type IS 'MIME type of the image file';

# Hero Image Metadata Migration Guide

## Overview

This guide explains how to add the missing metadata fields (`title`, `file_size`, `mime_type`) to the `landing_page_assets` table to support full hero image metadata functionality.

## Current Database Schema

The `landing_page_assets` table currently has these fields:

- `id` (primary key)
- `asset_type` (text)
- `asset_url` (text)
- `alt_text` (text)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Missing Fields

- `title` (text) - Title of the hero image for display purposes
- `file_size` (bigint) - File size in bytes
- `mime_type` (text) - MIME type of the image file

## Migration Steps

### Option 1: Run SQL Script in Supabase Dashboard

1. **Open Supabase Dashboard**

   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run the Migration Script**

   - Copy the contents of `scripts/add-hero-image-metadata-fields.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

3. **Verify the Changes**
   - The script will show the updated schema
   - Check that all three new columns are present

### Option 2: Use Supabase CLI (if available)

```bash
# Apply the migration
supabase db push

# Or apply specific migration
supabase migration up
```

## What the Migration Does

1. **Adds New Columns**

   ```sql
   ALTER TABLE landing_page_assets
   ADD COLUMN IF NOT EXISTS title TEXT,
   ADD COLUMN IF NOT EXISTS file_size BIGINT,
   ADD COLUMN IF NOT EXISTS mime_type TEXT;
   ```

2. **Updates Existing Records**

   - Sets default values for existing hero images
   - `title`: "Hero Image" (for existing records)
   - `file_size`: 0 (for existing records)
   - `mime_type`: "image/unknown" (for existing records)

3. **Adds Indexes**

   - Performance indexes on `file_size` and `mime_type`

4. **Adds Documentation**
   - Column comments explaining the purpose of each field

## After Migration

### 1. Deploy Updated Edge Function

The Edge Function has been updated to use the new fields:

```bash
supabase functions deploy hero-image-upload-v2
```

### 2. Test the Functionality

Run the test script to verify everything works:

```bash
node scripts/test-hero-upload-with-metadata-fixed.js
```

### 3. Frontend Will Automatically Work

The frontend is already prepared to display the new fields:

- **Title**: Will show the actual title instead of "No title"
- **Size**: Will show formatted file size instead of "Not available"
- **Type**: Will show MIME type instead of "Not available"

## Expected Results

After migration, the Hero Image Management interface will show:

### Image Details Section

- **Title**: "GrantFather Platform Interface" (or whatever you set)
- **Alt Text**: "GrantFather AI-powered grant writing platform interface"
- **Size**: "9.8 MB" (formatted file size)
- **Type**: "image/png" (actual MIME type)
- **Updated**: Current date

### Database Records

New uploads will include all metadata:

```json
{
  "id": "uuid",
  "asset_type": "hero_image",
  "title": "GrantFather Platform Interface",
  "alt_text": "GrantFather AI-powered grant writing platform interface",
  "asset_url": "https://...",
  "file_size": 10321640,
  "mime_type": "image/png",
  "is_active": true,
  "created_at": "2025-01-15T...",
  "updated_at": "2025-01-15T..."
}
```

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove the new columns (WARNING: This will lose data)
ALTER TABLE landing_page_assets
DROP COLUMN IF EXISTS title,
DROP COLUMN IF EXISTS file_size,
DROP COLUMN IF EXISTS mime_type;

-- Remove the indexes
DROP INDEX IF EXISTS idx_landing_page_assets_file_size;
DROP INDEX IF EXISTS idx_landing_page_assets_mime_type;
```

## Files Modified

1. **Database Migration**: `supabase/migrations/20250115000002_add_hero_image_metadata_fields.sql`
2. **Standalone SQL Script**: `scripts/add-hero-image-metadata-fields.sql`
3. **Edge Function**: `supabase/functions/hero-image-upload-v2/index.ts`
4. **Test Script**: `scripts/test-hero-upload-with-metadata-fixed.js`

## Next Steps

1. Run the database migration
2. Deploy the updated Edge Function
3. Test the functionality
4. The Hero Image Management interface will now show complete metadata!

## Support

If you encounter any issues:

1. Check the Supabase logs for any errors
2. Verify the database schema has the new columns
3. Test with the provided test script
4. Check that the Edge Function is deployed correctly

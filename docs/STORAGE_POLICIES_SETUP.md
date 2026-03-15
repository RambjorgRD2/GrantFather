# 🔧 Storage Policies Setup for Hero Image Upload

## Problem
The Hero Image Upload feature is failing with the error: "Storage policies not configured. Please contact the administrator."

## Solution
You need to manually apply the storage policies in the Supabase dashboard.

## Steps to Fix

### 1. Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar

### 2. Apply Storage Policies
Copy and paste the following SQL into the SQL Editor and run it:

```sql
-- Apply storage policies for superadmin users to upload hero images

-- Policy for superadmin users to upload hero images
CREATE POLICY "Superadmin users can upload hero images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'landing-assets' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Policy for superadmin users to update hero images
CREATE POLICY "Superadmin users can update hero images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'landing-assets' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Policy for superadmin users to delete hero images
CREATE POLICY "Superadmin users can delete hero images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'landing-assets' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Add RLS policies for superadmin users to manage landing page assets
CREATE POLICY "Superadmin users can manage landing page assets"
ON public.landing_page_assets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);
```

### 3. Verify Policies
After running the SQL, you can verify the policies were created:

1. Go to **Authentication** → **Policies** in the Supabase dashboard
2. Look for the new policies under `storage.objects` and `public.landing_page_assets`

### 4. Test the Feature
1. Go back to your application
2. Navigate to SuperAdmin → Content tab
3. Try uploading a hero image
4. The upload should now work successfully

## Alternative: Use Fallback Method
If you can't apply the policies immediately, the component now has a fallback method that will:
- Use the existing local SVG file as a placeholder
- Update the database record with the new metadata
- Allow you to test the interface functionality

## Troubleshooting

### If policies already exist
If you get an error saying the policies already exist, you can safely ignore it or drop and recreate them:

```sql
-- Drop existing policies (if needed)
DROP POLICY IF EXISTS "Superadmin users can upload hero images" ON storage.objects;
DROP POLICY IF EXISTS "Superadmin users can update hero images" ON storage.objects;
DROP POLICY IF EXISTS "Superadmin users can delete hero images" ON storage.objects;
DROP POLICY IF EXISTS "Superadmin users can manage landing page assets" ON public.landing_page_assets;

-- Then run the CREATE POLICY statements above
```

### If you get permission errors
Make sure you're logged in as a superadmin user in the Supabase dashboard.

## What These Policies Do

1. **Storage Upload Policy**: Allows superadmin users to upload files to the `landing-assets` bucket
2. **Storage Update Policy**: Allows superadmin users to update existing files
3. **Storage Delete Policy**: Allows superadmin users to delete files
4. **Database Policy**: Allows superadmin users to manage records in the `landing_page_assets` table

## Security Note
These policies ensure that only users with the `superadmin` role can upload and manage hero images, maintaining proper security for your application.

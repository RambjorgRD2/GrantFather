-- Add storage policies for superadmin users to upload hero images
-- This allows superadmin users to upload, update, and delete hero images in the landing-assets bucket

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

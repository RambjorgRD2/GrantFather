-- Update the hero image to use a local asset instead of external URL
UPDATE public.landing_page_assets 
SET 
  public_url = '/hero-platform-preview.svg',
  storage_path = '/hero-platform-preview.svg',
  title = 'GrantFather Platform Interface Preview',
  alt_text = 'GrantFather AI-powered grant writing platform interface showing application drafting tools and workspace',
  updated_at = now()
WHERE asset_type = 'hero_image' AND is_active = true;

-- If no record exists, create one
INSERT INTO public.landing_page_assets (
  asset_type,
  title,
  alt_text,
  storage_path,
  public_url,
  mime_type,
  is_active
) 
SELECT 
  'hero_image',
  'GrantFather Platform Interface Preview',
  'GrantFather AI-powered grant writing platform interface showing application drafting tools and workspace',
  '/hero-platform-preview.svg',
  '/hero-platform-preview.svg',
  'image/svg+xml',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.landing_page_assets 
  WHERE asset_type = 'hero_image' AND is_active = true
);

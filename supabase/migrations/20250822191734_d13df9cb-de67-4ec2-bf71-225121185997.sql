-- Create notifications table for user notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('grant_deadline', 'application_status', 'team_invite', 'system_update')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- Create landing page assets table
CREATE TABLE public.landing_page_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  alt_text VARCHAR(255),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for landing page assets (public read)
ALTER TABLE public.landing_page_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landing page assets are publicly readable"
ON public.landing_page_assets
FOR SELECT
USING (is_active = true);

-- Create storage bucket for landing assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('landing-assets', 'landing-assets', true);

-- Create storage policies for landing assets
CREATE POLICY "Landing assets are publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'landing-assets');

-- Add trigger for updated_at
CREATE TRIGGER update_landing_page_assets_updated_at
BEFORE UPDATE ON public.landing_page_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the current landing page image
INSERT INTO public.landing_page_assets (
  asset_type,
  title,
  alt_text,
  storage_path,
  public_url,
  mime_type,
  is_active
) VALUES (
  'hero_image',
  'GrantFather Platform Interface',
  'GrantFather AI-powered grant writing platform interface showing application drafting tools',
  '/lovable-uploads/6a5a212b-8fc1-4743-81d3-c1f0f1e88565.png',
  '/lovable-uploads/6a5a212b-8fc1-4743-81d3-c1f0f1e88565.png',
  'image/png',
  true
);